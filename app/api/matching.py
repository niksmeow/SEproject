from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.resume import Resume
from app.models.job import Job, JobMatch
from app.services.matcher import matching_service

router = APIRouter(prefix="/api/matching", tags=["matching"])


class MatchRequest(BaseModel):
    resume_id: UUID
    job_ids: Optional[List[UUID]] = None  # If None, match against all jobs


@router.post("/match")
async def match_resume_to_jobs(
    request: MatchRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Match resume to jobs"""
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
    
    # Get jobs
    if request.job_ids:
        jobs = db.query(Job).filter(
            Job.id.in_(request.job_ids),
            Job.user_id == user_id
        ).all()
    else:
        jobs = db.query(Job).filter(Job.user_id == user_id).all()
    
    if not jobs:
        return {"message": "No jobs to match against", "matches": []}
    
    # Perform matching
    match_results = matching_service.match_resume_to_jobs(resume, jobs, db)
    
    # Save matches to database
    for match_result in match_results:
        # Check if match already exists
        existing_match = db.query(JobMatch).filter(
            JobMatch.user_id == user_id,
            JobMatch.job_id == UUID(match_result["job_id"]),
            JobMatch.resume_id == resume.id
        ).first()
        
        if existing_match:
            # Update existing match
            existing_match.match_score = str(match_result["match_score"])
            existing_match.classification = match_result["classification"]
            existing_match.missing_skills = match_result["missing_skills"]
        else:
            # Create new match
            job_match = JobMatch(
                user_id=user_id,
                job_id=UUID(match_result["job_id"]),
                resume_id=resume.id,
                match_score=str(match_result["match_score"]),
                classification=match_result["classification"],
                missing_skills=match_result["missing_skills"]
            )
            db.add(job_match)
    
    db.commit()
    
    return {
        "resume_id": str(resume.id),
        "matches": match_results
    }


@router.get("/jobs/{job_id}")
async def get_job_match(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get match details for a specific job"""
    user_id = current_user["user_id"]
    
    # Get the most recent match for this job
    job_match = db.query(JobMatch).filter(
        JobMatch.job_id == job_id,
        JobMatch.user_id == user_id
    ).order_by(JobMatch.created_at.desc()).first()
    
    if not job_match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    # Get job details
    job = db.query(Job).filter(Job.id == job_id).first()
    
    return {
        "job_id": str(job_match.job_id),
        "resume_id": str(job_match.resume_id),
        "match_score": float(job_match.match_score),
        "classification": job_match.classification,
        "missing_skills": job_match.missing_skills,
        "job": {
            "title": job.title,
            "company": job.company,
            "description": job.description,
            "required_skills": job.required_skills
        } if job else None
    }
