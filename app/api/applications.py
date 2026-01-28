from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.job import Job, Application
from app.models.resume import Resume
from app.models.user import Profile

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/applications", tags=["applications"])


class EasyApplyRequest(BaseModel):
    resume_id: UUID
    answers: Optional[Dict[str, Any]] = None


@router.post("/external/{job_id}")
async def external_apply(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Track external apply - redirects to company ATS"""
    user_id = current_user["user_id"]
    
    # Get job
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.user_id == user_id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    if not job.url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job does not have an external application URL"
        )
    
    # Check if already applied
    existing_application = db.query(Application).filter(
        Application.user_id == user_id,
        Application.job_id == job_id
    ).first()
    
    if existing_application:
        return {
            "application_id": str(existing_application.id),
            "external_url": existing_application.external_url or job.url,
            "status": existing_application.status,
            "already_applied": True
        }
    
    # Get user's most recent resume
    resume = db.query(Resume).filter(
        Resume.user_id == user_id
    ).order_by(Resume.created_at.desc()).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a resume first"
        )
    
    # Create resume snapshot
    resume_snapshot = {
        "resume_id": str(resume.id),
        "skills": resume.skills or [],
        "experience": resume.experience or {},
        "projects": resume.projects or []
    }
    
    # Create application record
    application = Application(
        user_id=user_id,
        job_id=job_id,
        resume_id=resume.id,
        application_type="external",
        status="submitted",
        external_url=job.url,
        resume_snapshot=resume_snapshot
    )
    
    db.add(application)
    db.commit()
    db.refresh(application)
    
    logger.info(f"User {user_id} applied externally to job {job_id}")
    
    return {
        "application_id": str(application.id),
        "external_url": job.url,
        "status": "submitted",
        "already_applied": False
    }


@router.post("/easy-apply/{job_id}")
async def easy_apply(
    job_id: UUID,
    request: EasyApplyRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit easy apply form"""
    user_id = current_user["user_id"]
    
    # Get job
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.user_id == user_id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check if already applied
    existing_application = db.query(Application).filter(
        Application.user_id == user_id,
        Application.job_id == job_id
    ).first()
    
    if existing_application:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied to this job"
        )
    
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
    
    # Create resume snapshot
    resume_snapshot = {
        "resume_id": str(resume.id),
        "skills": resume.skills or [],
        "experience": resume.experience or {},
        "projects": resume.projects or []
    }
    
    # Create application record
    application = Application(
        user_id=user_id,
        job_id=job_id,
        resume_id=resume.id,
        application_type="easy_apply",
        status="submitted",
        answers=request.answers or {},
        resume_snapshot=resume_snapshot
    )
    
    db.add(application)
    db.commit()
    db.refresh(application)
    
    logger.info(f"User {user_id} applied via easy apply to job {job_id}")
    
    return {
        "application_id": str(application.id),
        "status": "submitted",
        "message": "Application submitted successfully"
    }


@router.get("")
async def get_applications(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's applications"""
    user_id = current_user["user_id"]
    
    applications = db.query(Application).filter(
        Application.user_id == user_id
    ).order_by(Application.applied_at.desc()).all()
    
    result = []
    for app in applications:
        # Get job details
        job = db.query(Job).filter(Job.id == app.job_id).first()
        
        result.append({
            "id": str(app.id),
            "job_id": str(app.job_id),
            "job_title": job.title if job else "Unknown",
            "job_company": job.company if job else "Unknown",
            "application_type": app.application_type,
            "status": app.status,
            "applied_at": app.applied_at.isoformat() if app.applied_at else None,
            "external_url": app.external_url
        })
    
    return {"applications": result}


@router.get("/{application_id}")
async def get_application(
    application_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific application"""
    user_id = current_user["user_id"]
    
    application = db.query(Application).filter(
        Application.id == application_id,
        Application.user_id == user_id
    ).first()
    
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
    
    # Get job details
    job = db.query(Job).filter(Job.id == application.job_id).first()
    
    return {
        "id": str(application.id),
        "job_id": str(application.job_id),
        "job_title": job.title if job else "Unknown",
        "job_company": job.company if job else "Unknown",
        "application_type": application.application_type,
        "status": application.status,
        "external_url": application.external_url,
        "answers": application.answers,
        "resume_snapshot": application.resume_snapshot,
        "applied_at": application.applied_at.isoformat() if application.applied_at else None,
        "updated_at": application.updated_at.isoformat() if application.updated_at else None
    }
