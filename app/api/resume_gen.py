from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from uuid import UUID
import os

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.resume import Resume, OptimizedResume
from app.models.job import Job, JobMatch
from app.services.resume_gen import resume_generator
from app.core.config import settings
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/resume/generate", tags=["resume-generation"])


class GenerateResumeRequest(BaseModel):
    resume_id: Optional[UUID] = None  # Optional - will use most recent if not provided
    job_id: UUID
    format: str = "json"  # json, pdf, docx


@router.post("")
async def generate_optimized_resume(
    request: GenerateResumeRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate optimized resume for a job"""
    user_id = current_user["user_id"]
    
    # Get resume - use provided resume_id or get most recent
    if request.resume_id:
        resume = db.query(Resume).filter(
            Resume.id == request.resume_id,
            Resume.user_id == user_id
        ).first()
    else:
        # Auto-select most recent resume
        resume = db.query(Resume).filter(
            Resume.user_id == user_id
        ).order_by(Resume.created_at.desc()).first()
        logger.info(f"Auto-selected most recent resume for user {user_id}: {resume.id if resume else 'None'}")
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found. Please upload a resume first."
        )
    
    # Get job
    job = db.query(Job).filter(
        Job.id == request.job_id,
        Job.user_id == user_id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get missing skills from job match if available
    missing_skills = []
    job_match = db.query(JobMatch).filter(
        JobMatch.job_id == job.id,
        JobMatch.resume_id == resume.id,
        JobMatch.user_id == user_id
    ).order_by(JobMatch.created_at.desc()).first()
    
    if job_match and job_match.missing_skills:
        missing_skills = job_match.missing_skills
        logger.info(f"Found {len(missing_skills)} missing skills from job match: {missing_skills}")
    else:
        # Fallback: calculate missing skills from job requirements
        resume_skills = resume.skills or []
        resume_skills_lower = [s.lower() for s in resume_skills]
        job_required = job.required_skills or []
        missing_skills = [skill for skill in job_required if skill.lower() not in resume_skills_lower]
        logger.info(f"Calculated {len(missing_skills)} missing skills: {missing_skills}")
    
    # Generate optimized resume
    try:
        optimized_content = resume_generator.generate_optimized_resume(
            resume.parsed_data or {},
            job.description,
            job.required_skills or [],
            missing_skills=missing_skills,
            original_file_path=resume.original_file_path  # Pass file path to extract real data
        )
        
        # Parse optimized content
        try:
            optimized_data = json.loads(optimized_content)
        except json.JSONDecodeError:
            # If content is not JSON, try to extract JSON from it
            import re
            json_match = re.search(r'\{.*\}', optimized_content, re.DOTALL)
            if json_match:
                optimized_data = json.loads(json_match.group())
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to parse optimized resume content"
                )
        
        # Store original parsed_data before updating (if not already stored)
        if not resume.original_parsed_data and resume.parsed_data:
            resume.original_parsed_data = resume.parsed_data
        
        # Update original resume instead of creating OptimizedResume
        resume.parsed_data = optimized_data
        
        # Update skills array - merge existing with new, preserving all
        existing_skills = resume.skills or []
        new_skills = optimized_data.get('skills', [])
        
        # Combine skills: keep all existing, add new ones
        # Use set to avoid duplicates while preserving order
        combined_skills = list(dict.fromkeys(existing_skills + new_skills))
        resume.skills = combined_skills
        
        db.commit()
        db.refresh(resume)
        
        logger.info(f"Updated resume {resume.id} with {len(missing_skills)} new skills. Total skills: {len(combined_skills)}")
        
        # Export to file if requested
        if request.format in ["pdf", "docx"]:
            os.makedirs(settings.upload_dir, exist_ok=True)
            file_path = os.path.join(
                settings.upload_dir,
                f"optimized_resume_{resume.id}_{job.id}.{request.format}"
            )
            
            if request.format == "pdf":
                resume_generator.export_to_pdf(optimized_content, file_path)
            else:
                resume_generator.export_to_docx(optimized_content, file_path)
            
            return {
                "id": str(resume.id),
                "file_path": file_path,
                "format": request.format,
                "message": f"Resume updated with {len(missing_skills)} new skills"
            }
        
        return {
            "id": str(resume.id),
            "content": optimized_content,
            "format": "json",
            "updated_skills": combined_skills,
            "added_skills": missing_skills,
            "message": f"Resume updated with {len(missing_skills)} new skills"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating resume: {str(e)}"
        )


@router.get("/generated/job/{job_id}")
async def get_optimized_resume_by_job(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get optimized resume for a specific job"""
    user_id = current_user["user_id"]
    
    optimized_resume = db.query(OptimizedResume).filter(
        OptimizedResume.job_id == job_id,
        OptimizedResume.user_id == user_id
    ).first()
    
    if not optimized_resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Optimized resume not found for this job"
        )
    
    return {
        "id": str(optimized_resume.id),
        "content": optimized_resume.content,
        "job_id": str(optimized_resume.job_id),
        "resume_id": str(optimized_resume.resume_id),
        "created_at": optimized_resume.created_at.isoformat()
    }


@router.get("/generated/{resume_id}/download")
async def download_optimized_resume(
    resume_id: UUID,
    format: str = "pdf",
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download optimized resume as PDF or DOCX"""
    user_id = current_user["user_id"]
    
    optimized_resume = db.query(OptimizedResume).filter(
        OptimizedResume.id == resume_id,
        OptimizedResume.user_id == user_id
    ).first()
    
    if not optimized_resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Optimized resume not found"
        )
    
    # Generate file if it doesn't exist
    if not optimized_resume.file_path or not os.path.exists(optimized_resume.file_path):
        os.makedirs(settings.upload_dir, exist_ok=True)
        file_path = os.path.join(
            settings.upload_dir,
            f"optimized_{optimized_resume.id}.{format}"
        )
        
        if format == "pdf":
            resume_generator.export_to_pdf(optimized_resume.content, file_path)
        elif format == "docx":
            resume_generator.export_to_docx(optimized_resume.content, file_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid format. Use 'pdf' or 'docx'"
            )
        
        optimized_resume.file_path = file_path
        db.commit()
    else:
        file_path = optimized_resume.file_path
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="File not found"
        )
    
    media_type = "application/pdf" if format == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=f"optimized_resume_{resume_id}.{format}"
    )
