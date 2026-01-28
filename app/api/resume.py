from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import os
import shutil
import logging
import json
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.resume import Resume, OptimizedResume
from app.models.user import Profile
from app.services.resume_parser import resume_parser
from app.services.embedding import embedding_service
from app.services.qdrant_client import qdrant_service
from app.services.resume_gen import resume_generator
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/resume", tags=["resume"])


async def auto_discover_jobs_for_resume(
    user_id: UUID,
    resume_id: UUID
):
    """Background task to discover jobs for a newly uploaded resume"""
    from app.core.database import SessionLocal
    from app.models.resume import Resume
    from app.models.user import Profile
    from app.services.job_discovery import discover_jobs_for_resume
    from app.services.matching import MatchingService
    from app.models.job import JobMatch
    
    db = SessionLocal()
    try:
        # Get resume
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        if not resume:
            logger.warning(f"Resume {resume_id} not found for auto-discovery")
            return
        
        # Get user profile for location
        profile = db.query(Profile).filter(Profile.id == user_id).first()
        location = ""
        if profile and profile.location:
            location = profile.location
        else:
            location = "India"  # Default
        
        # Discover jobs using service function
        jobs = await discover_jobs_for_resume(
            user_id=user_id,
            resume=resume,
            location=location,
            limit=50,
            keywords="",  # Empty = resume-based jobs
            db=db
        )
        
        logger.info(f"Auto-discovered {len(jobs)} jobs for resume {resume_id}")
        
        # Auto-match jobs to resume
        if jobs:
            from app.services.matching import MatchingService
            matching_service = MatchingService()
            matches = matching_service.match_resume_to_jobs(resume, jobs, db)
            logger.info(f"Auto-matched {len(matches)} jobs to resume {resume_id}")
            
    except Exception as e:
        logger.error(f"Error in auto-discover jobs: {str(e)}")
        # Don't raise - this is a background task
    finally:
        db.close()


@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """Upload and parse resume"""
    user_id = current_user["user_id"]
    
    # Ensure profile exists (required for foreign key constraint)
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        profile = Profile(
            id=user_id,
            email=current_user.get("email", "")
        )
        db.add(profile)
        db.commit()
        logger.info(f"Created profile for user {user_id}")
    
    # Validate file type
    if not file.filename.endswith(('.pdf', '.docx')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and DOCX files are supported"
        )
    
    # Save file
    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, f"{user_id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Parse resume
    try:
        if file.filename.endswith('.pdf'):
            parsed_data = resume_parser.parse_pdf(file_path)
        else:
            parsed_data = resume_parser.parse_docx(file_path)
        
        # Create embedding
        resume_text = embedding_service.encode_resume(
            parsed_data.get("skills", []),
            parsed_data.get("experience", {})
        )
        embedding = embedding_service.encode(resume_text)
        
        # Store in Qdrant
        embedding_id = qdrant_service.upsert_embedding(
            embedding,
            {
                "type": "resume",
                "user_id": str(user_id),
                "skills": parsed_data.get("skills", [])
            }
        )
        
        # Save to database
        resume = Resume(
            user_id=user_id,
            original_file_path=file_path,
            parsed_data=parsed_data,
            skills=parsed_data.get("skills", []),
            experience=parsed_data.get("experience", []),
            projects=parsed_data.get("projects", []),
            embedding_id=embedding_id
        )
        
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
        # Schedule background job discovery
        background_tasks.add_task(
            auto_discover_jobs_for_resume,
            user_id=user_id,
            resume_id=resume.id
        )
        logger.info(f"Scheduled auto-discovery for resume {resume.id}")
        
        return {
            "id": str(resume.id),
            "parsed_data": parsed_data,
            "skills": resume.skills
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing resume: {str(e)}"
        )


@router.get("/{resume_id}")
async def get_resume(
    resume_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get resume data"""
    user_id = current_user["user_id"]
    
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == user_id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    return {
        "id": str(resume.id),
        "parsed_data": resume.parsed_data,
        "original_parsed_data": resume.original_parsed_data,  # Include original for comparison
        "skills": resume.skills,
        "experience": resume.experience,
        "projects": resume.projects,
        "original_file_path": resume.original_file_path
    }


@router.get("/{resume_id}/download")
async def download_resume(
    resume_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download original resume file"""
    from fastapi.responses import FileResponse
    
    user_id = current_user["user_id"]
    
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == user_id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    if not os.path.exists(resume.original_file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found"
        )
    
    # Determine media type
    if resume.original_file_path.endswith('.pdf'):
        media_type = "application/pdf"
    elif resume.original_file_path.endswith('.docx'):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    else:
        media_type = "application/octet-stream"
    
    return FileResponse(
        resume.original_file_path,
        media_type=media_type,
        filename=os.path.basename(resume.original_file_path)
    )


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete resume"""
    user_id = current_user["user_id"]
    
    resume = db.query(Resume).filter(
        Resume.id == resume_id,
        Resume.user_id == user_id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Delete from Qdrant
    if resume.embedding_id:
        qdrant_service.delete_point(resume.embedding_id)
    
    # Delete file
    if os.path.exists(resume.original_file_path):
        os.remove(resume.original_file_path)
    
    db.delete(resume)
    db.commit()
    
    return {"message": "Resume deleted successfully"}


class SaveOptimizedResumeRequest(BaseModel):
    resume_id: UUID
    job_id: Optional[UUID] = None
    name: Optional[str] = None
    format: str = "pdf"  # pdf or docx


@router.post("/save-optimized")
async def save_optimized_resume(
    request: SaveOptimizedResumeRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save an optimized resume as a new resume entry"""
    user_id = current_user["user_id"]
    
    # Get the optimized resume
    resume = db.query(Resume).filter(
        Resume.id == request.resume_id,
        Resume.user_id == user_id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Check if resume has been optimized (has original_parsed_data)
    if not resume.original_parsed_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This resume has not been optimized yet"
        )
    
    # Get optimized content (current parsed_data)
    optimized_data = resume.parsed_data or {}
    if not optimized_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Optimized resume data not found"
        )
    
    # Convert to JSON string for export
    optimized_content = json.dumps(optimized_data, indent=2)
    
    # Generate filename
    if request.name:
        filename = f"{request.name}.{request.format}"
    else:
        # Extract original filename and create optimized version name
        original_filename = os.path.basename(resume.original_file_path) if resume.original_file_path else "resume"
        if original_filename.startswith(f"{user_id}_"):
            original_filename = original_filename[len(f"{user_id}_"):]
        name_without_ext = os.path.splitext(original_filename)[0]
        filename = f"{name_without_ext}_optimized.{request.format}"
    
    # Generate file
    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, f"{user_id}_{filename}")
    
    try:
        if request.format == "pdf":
            resume_generator.export_to_pdf(optimized_content, file_path)
        elif request.format == "docx":
            resume_generator.export_to_docx(optimized_content, file_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Use 'pdf' or 'docx'"
            )
    except Exception as e:
        logger.error(f"Error exporting optimized resume: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating file: {str(e)}"
        )
    
    # Create embedding for the new resume
    resume_text = embedding_service.encode_resume(
        optimized_data.get("skills", []),
        optimized_data.get("experience", {})
    )
    embedding = embedding_service.encode(resume_text)
    
    # Store in Qdrant
    embedding_id = qdrant_service.upsert_embedding(
        embedding,
        {
            "type": "resume",
            "user_id": str(user_id),
            "skills": optimized_data.get("skills", [])
        }
    )
    
    # Create new Resume entry
    new_resume = Resume(
        user_id=user_id,
        original_file_path=file_path,
        parsed_data=optimized_data,
        # Don't set original_parsed_data - this marks it as optimized
        # original_parsed_data=None means it's an optimized resume
        skills=optimized_data.get("skills", []),
        experience=optimized_data.get("experience", []),
        projects=optimized_data.get("projects", []),
        embedding_id=embedding_id
    )
    
    db.add(new_resume)
    db.commit()
    db.refresh(new_resume)
    
    logger.info(f"Saved optimized resume as new resume {new_resume.id} for user {user_id}")
    
    return {
        "id": str(new_resume.id),
        "filename": filename,
        "file_path": file_path,
        "message": "Optimized resume saved as new resume"
    }


@router.get("")
async def list_resumes(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all user's resumes with detailed information"""
    user_id = current_user["user_id"]
    
    resumes = db.query(Resume).filter(Resume.user_id == user_id).order_by(Resume.created_at.desc()).all()
    
    result = []
    for r in resumes:
        # Extract filename from file path
        filename = os.path.basename(r.original_file_path) if r.original_file_path else "Unknown"
        # Remove user_id prefix if present (format: {user_id}_{filename})
        if filename.startswith(f"{user_id}_"):
            filename = filename[len(f"{user_id}_"):]
        
        # Determine file type
        file_type = None
        if r.original_file_path:
            if r.original_file_path.endswith('.pdf'):
                file_type = 'pdf'
            elif r.original_file_path.endswith('.docx'):
                file_type = 'docx'
        
        # Check if it's optimized (has original_parsed_data means it was optimized from an original)
        is_optimized = r.original_parsed_data is not None
        
        # Get skills count
        skills_count = len(r.skills) if r.skills else 0
        
        result.append({
            "id": str(r.id),
            "filename": filename,
            "file_type": file_type,
            "skills": r.skills or [],
            "skills_count": skills_count,
            "is_optimized": is_optimized,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "original_file_path": r.original_file_path
        })
    
    return result
