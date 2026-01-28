from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.resume import Resume
from app.models.job import Job, Roadmap
from app.models.job import JobMatch
from app.services.roadmap_gen import roadmap_generator

router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])


class GenerateRoadmapRequest(BaseModel):
    resume_id: UUID
    job_id: UUID


@router.post("/generate")
async def generate_roadmap(
    request: GenerateRoadmapRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate learning roadmap for a job"""
    user_id = current_user["user_id"]
    
    # Get resume
    resume = db.query(Resume).filter(
        Resume.id == request.resume_id,
        Resume.user_id == user_id
    ).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
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
    
    # Get missing skills from match
    job_match = db.query(JobMatch).filter(
        JobMatch.job_id == request.job_id,
        JobMatch.resume_id == request.resume_id,
        JobMatch.user_id == user_id
    ).order_by(JobMatch.created_at.desc()).first()
    
    missing_skills = job_match.missing_skills if job_match else []
    
    # Generate roadmap
    try:
        roadmap_data = roadmap_generator.generate_roadmap(
            resume.skills or [],
            job.description,
            job.required_skills or [],
            missing_skills
        )
        
        # Save to database
        roadmap = Roadmap(
            user_id=user_id,
            job_id=job.id,
            roadmap_data=roadmap_data
        )
        
        db.add(roadmap)
        db.commit()
        db.refresh(roadmap)
        
        return {
            "id": str(roadmap.id),
            "roadmap_data": roadmap_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating roadmap: {str(e)}"
        )


@router.get("/{roadmap_id}")
async def get_roadmap(
    roadmap_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get roadmap data"""
    user_id = current_user["user_id"]
    
    roadmap = db.query(Roadmap).filter(
        Roadmap.id == roadmap_id,
        Roadmap.user_id == user_id
    ).first()
    
    if not roadmap:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Roadmap not found"
        )
    
    return {
        "id": str(roadmap.id),
        "job_id": str(roadmap.job_id),
        "roadmap_data": roadmap.roadmap_data,
        "created_at": roadmap.created_at.isoformat()
    }
