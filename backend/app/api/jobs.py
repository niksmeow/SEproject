from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import logging

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.job import Job, Application, JobMatch
from app.models.user import Profile
from app.models.resume import Resume
from app.services.job_crawler import job_crawler
from app.services.embedding import embedding_service
from app.services.qdrant_client import qdrant_service
from app.services.geolocation import geolocation_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    title: str
    company: str
    description: str
    url: Optional[str] = None
    location: Optional[str] = None
    required_skills: Optional[List[str]] = None


class JobCrawlRequest(BaseModel):
    keywords: str
    location: str = ""
    source: str = "jsearch"  # indeed, adzuna, linkedin, glassdoor, google, jsearch
    limit: int = 10
    linkedin_email: Optional[str] = None  # Required for LinkedIn
    linkedin_password: Optional[str] = None  # Required for LinkedIn
    skip_duplicates: bool = True  # Skip duplicate jobs


class DiscoverJobsRequest(BaseModel):
    keywords: str = ""
    location: str = ""
    limit: int = 50


@router.post("")
async def create_job(
    job_data: JobCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a job from pasted description"""
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
    
    # Extract skills if not provided
    if not job_data.required_skills:
        job_data.required_skills = job_crawler.extract_skills_from_description(
            job_data.description
        )
    
    # Create embedding
    job_text = embedding_service.encode_job(
        job_data.description,
        job_data.required_skills or []
    )
    embedding = embedding_service.encode(job_text)
    
    # Store in Qdrant
    embedding_id = qdrant_service.upsert_embedding(
        embedding,
        {
            "type": "job",
            "user_id": str(user_id)
        }
    )
    
    # Save to database
    job = Job(
        user_id=user_id,
        title=job_data.title,
        company=job_data.company,
        description=job_data.description,
        source="manual",
        url=job_data.url,
        location=job_data.location,
        required_skills=job_data.required_skills,
        embedding_id=embedding_id
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    return {
        "id": str(job.id),
        "title": job.title,
        "company": job.company,
        "description": job.description,
        "required_skills": job.required_skills
    }


@router.get("")
async def list_jobs(
    job_type: Optional[str] = None,  # 'resume' or 'search'
    nearby: Optional[bool] = None,  # Filter by location proximity
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's jobs, optionally filtered by type and location
    
    Args:
        job_type: Optional filter - 'resume' for resume-based jobs, 'search' for search-based jobs
        nearby: If True, filter jobs by user's location proximity
    """
    user_id = current_user["user_id"]
    
    # Build query with optional filter
    query = db.query(Job).filter(Job.user_id == user_id)
    
    if job_type == "resume":
        # Resume-based jobs: search_keywords is NULL
        query = query.filter(Job.search_keywords.is_(None))
        
        # Filter to only show jobs with good match scores (green/yellow or >= 50%)
        # Get user's resume to check matches
        resume = db.query(Resume).filter(Resume.user_id == user_id).order_by(Resume.created_at.desc()).first()
        
        if resume:
            # Get job matches for this resume
            job_matches = db.query(JobMatch).filter(
                JobMatch.resume_id == resume.id,
                JobMatch.user_id == user_id
            ).all()
            
            # Filter to only jobs with good match scores
            good_match_job_ids = []
            for match in job_matches:
                try:
                    match_score = float(match.match_score) if match.match_score else 0.0
                    # Include if green/yellow classification or match_score >= 0.50
                    if match.classification in ['green', 'yellow'] or match_score >= 0.50:
                        good_match_job_ids.append(match.job_id)  # job_id is already UUID
                except (ValueError, TypeError):
                    # If match_score is invalid, check classification only
                    if match.classification in ['green', 'yellow']:
                        good_match_job_ids.append(match.job_id)
            
            if good_match_job_ids:
                # Only return jobs with good matches
                query = query.filter(Job.id.in_(good_match_job_ids))
                logger.info(f"Filtered resume-based jobs to {len(good_match_job_ids)} well-matched jobs")
            else:
                # No good matches, return empty result
                query = query.filter(Job.id == None)  # Return no results
                logger.info("No well-matched jobs found for resume-based filter")
    elif job_type == "search":
        # Search-based jobs: search_keywords is NOT NULL
        query = query.filter(Job.search_keywords.isnot(None))
    # If job_type is None or invalid, return all jobs (backward compatibility)
    
    jobs = query.all()
    
    # Get user's location for filtering
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    user_lat = None
    user_lon = None
    user_radius = 50  # Default radius in miles
    user_country = None
    
    if profile:
        # Extract country from user location
        if profile.location:
            # Import helper function
            from app.services.job_crawler import _extract_country_from_location
            user_country = _extract_country_from_location(profile.location)
            logger.info(f"User country detected: {user_country} from location: {profile.location}")
        
        if profile.latitude and profile.longitude:
            try:
                user_lat = float(profile.latitude)
                user_lon = float(profile.longitude)
                if profile.location_radius:
                    user_radius = float(profile.location_radius)
            except (ValueError, TypeError):
                logger.warning(f"Invalid location data for user {user_id}")
    
    # Filter jobs by country if user location is set
    if user_country:
        # Import the helper function
        from app.services.job_crawler import _extract_country_from_location
        filtered_jobs = []
        for job in jobs:
            if job.location:
                job_country = _extract_country_from_location(job.location)
                # Include job if it's in same country or location is remote/not specified
                if job_country == user_country or not job_country or 'remote' in job.location.lower():
                    filtered_jobs.append(job)
                else:
                    logger.debug(f"Filtered out job {job.id} from {job_country} (user in {user_country})")
            else:
                # Include jobs without location (might be remote)
                filtered_jobs.append(job)
        jobs = filtered_jobs
        logger.info(f"Filtered jobs by country: {len(jobs)} jobs in {user_country} (from {len(query.all())} total)")
    
    # Calculate distances and filter jobs
    jobs_with_distance = []
    for job in jobs:
        job_data = {
            "id": str(job.id),
            "title": job.title,
            "company": job.company,
            "description": job.description[:200] + "..." if len(job.description) > 200 else job.description,
            "source": job.source,
            "location": job.location,
            "search_keywords": job.search_keywords,
            "created_at": job.created_at.isoformat()
        }
        
        # Calculate distance if user has location
        if user_lat and user_lon and job.location:
            job_coords = geolocation_service.parse_job_location(job.location)
            if job_coords:
                distance = geolocation_service.calculate_distance(
                    user_lat, user_lon,
                    job_coords[0], job_coords[1],
                    unit='miles'
                )
                job_data["distance"] = round(distance, 1)
                
                # Filter by radius if nearby is True
                if nearby and distance > user_radius:
                    continue
            else:
                job_data["distance"] = None
        else:
            job_data["distance"] = None
        
        jobs_with_distance.append(job_data)
    
    # Sort by distance if user has location
    if user_lat and user_lon:
        jobs_with_distance.sort(key=lambda x: x.get("distance", float('inf')))
    
    return jobs_with_distance


@router.get("/{job_id}/application-status")
async def get_job_application_status(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user has applied to this job"""
    try:
        user_id = current_user.get("user_id")
        if not user_id:
            logger.error("Missing user_id in current_user")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not authenticated"
            )
        
        # Verify job exists and belongs to user
        try:
            job = db.query(Job).filter(
                Job.id == job_id,
                Job.user_id == user_id
            ).first()
        except Exception as e:
            logger.error(f"Database error querying job {job_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error querying job"
            )
        
        if not job:
            return {
                "has_applied": False,
                "application": None
            }
        
        # Check for existing application
        try:
            application = db.query(Application).filter(
                Application.user_id == user_id,
                Application.job_id == job_id
            ).first()
        except Exception as e:
            logger.error(f"Database error querying application for job {job_id}: {str(e)}")
            # Return no application rather than failing
            return {
                "has_applied": False,
                "application": None
            }
        
        if not application:
            return {
                "has_applied": False,
                "application": None
            }
        
        # Safely access application attributes
        try:
            return {
                "has_applied": True,
                "application": {
                    "id": str(application.id) if application.id else None,
                    "application_type": application.application_type,
                    "status": application.status,
                    "applied_at": application.applied_at.isoformat() if application.applied_at else None,
                    "external_url": application.external_url
                }
            }
        except AttributeError as e:
            logger.error(f"Missing attribute on application for job {job_id}: {str(e)}")
            # Return basic response if attribute access fails
            return {
                "has_applied": True,
                "application": {
                    "id": str(application.id) if application.id else None,
                    "application_type": getattr(application, 'application_type', None),
                    "status": getattr(application, 'status', None),
                    "applied_at": application.applied_at.isoformat() if hasattr(application, 'applied_at') and application.applied_at else None,
                    "external_url": getattr(application, 'external_url', None)
                }
            }
        except Exception as e:
            logger.error(f"Error serializing application data for job {job_id}: {str(e)}")
            # Return basic response even if serialization fails
            return {
                "has_applied": True,
                "application": {
                    "id": str(application.id) if application.id else None,
                    "application_type": None,
                    "status": None,
                    "applied_at": None,
                    "external_url": None
                }
            }
            
    except HTTPException:
        # Re-raise HTTP exceptions (they're already properly formatted)
        raise
    except Exception as e:
        logger.error(f"Unexpected error in get_job_application_status for job {job_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error while checking application status"
        )


@router.get("/{job_id}")
async def get_job(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get job details"""
    user_id = current_user["user_id"]
    
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.user_id == user_id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return {
        "id": str(job.id),
        "title": job.title,
        "company": job.company,
        "description": job.description,
        "url": job.url,
        "location": job.location,
        "required_skills": job.required_skills,
        "source": job.source,
        "created_at": job.created_at.isoformat()
    }


@router.post("/crawl")
async def crawl_jobs(
    request: JobCrawlRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crawl jobs from job boards"""
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
    
    # Validate LinkedIn credentials if LinkedIn is selected
    if request.source == "linkedin":
        if not request.linkedin_email or not request.linkedin_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="LinkedIn requires email and password. Please provide linkedin_email and linkedin_password."
            )
    
    try:
        # Get existing jobs for duplicate detection
        existing_jobs = []
        if request.skip_duplicates:
            existing_jobs_query = db.query(Job).filter(Job.user_id == user_id).all()
            existing_jobs = [
                {
                    "title": j.title,
                    "company": j.company,
                    "url": j.url
                }
                for j in existing_jobs_query
            ]
        
        # Crawl jobs based on source
        if request.source == "indeed":
            jobs_data = job_crawler.crawl_indeed_jobs(
                request.keywords,
                request.location,
                request.limit
            )
        elif request.source == "adzuna":
            jobs_data = job_crawler.crawl_adzuna_jobs(
                request.keywords,
                request.location,
                request.limit
            )
        elif request.source == "linkedin":
            jobs_data = job_crawler.crawl_linkedin_jobs(
                request.keywords,
                request.location,
                request.limit,
                request.linkedin_email,
                request.linkedin_password
            )
        elif request.source == "glassdoor":
            jobs_data = job_crawler.crawl_glassdoor_jobs(
                request.keywords,
                request.location,
                request.limit
            )
        elif request.source == "google":
            jobs_data = job_crawler.crawl_google_jobs(
                request.keywords,
                request.location,
                request.limit
            )
        elif request.source == "jsearch":
            jobs_data = job_crawler.crawl_jsearch_jobs(
                request.keywords,
                request.location,
                request.limit,
                skills=None  # For manual crawl, don't use skills
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid source. Use: indeed, adzuna, linkedin, glassdoor, google, or jsearch"
            )
        
        if not jobs_data:
            return {
                "message": "No jobs found or crawling failed",
                "jobs": [],
                "skipped": 0
            }
        
        # Save jobs to database
        saved_jobs = []
        skipped_count = 0
        current_batch_jobs = []  # Track jobs in current batch to avoid duplicates within batch
        
        for job_data in jobs_data:
            # Check for duplicates against existing jobs in database
            if request.skip_duplicates:
                if job_crawler.is_duplicate_job(job_data, existing_jobs):
                    skipped_count += 1
                    logger.info(f"Skipping duplicate job: {job_data.get('title')} at {job_data.get('company')}")
                    continue
                
                # Also check against jobs in current batch
                if job_crawler.is_duplicate_job(job_data, current_batch_jobs):
                    skipped_count += 1
                    logger.info(f"Skipping duplicate job in batch: {job_data.get('title')} at {job_data.get('company')}")
                    continue
            
            # Extract skills
            required_skills = job_crawler.extract_skills_from_description(
                job_data.get("description", "")
            )
            
            # Create embedding
            job_text = embedding_service.encode_job(
                job_data.get("description", ""),
                required_skills
            )
            embedding = embedding_service.encode(job_text)
            
            # Store in Qdrant
            embedding_id = qdrant_service.upsert_embedding(
                embedding,
                {
                    "type": "job",
                    "user_id": str(user_id)
                }
            )
            
            # Save to database
            job = Job(
                user_id=user_id,
                title=job_data.get("title", ""),
                company=job_data.get("company", ""),
                description=job_data.get("description", ""),
                source="crawled",
                url=job_data.get("url"),
                location=job_data.get("location"),
                required_skills=required_skills,
                embedding_id=embedding_id
            )
            
            db.add(job)
            saved_jobs.append(job)
            
            # Add to current batch jobs to prevent duplicates in same batch
            current_batch_jobs.append({
                "title": job_data.get("title", ""),
                "company": job_data.get("company", ""),
                "url": job_data.get("url")
            })
        
        db.commit()
        
        return {
            "message": f"Successfully crawled and saved {len(saved_jobs)} jobs",
            "jobs": [
                {
                    "id": str(j.id),
                    "title": j.title,
                    "company": j.company,
                    "source": j.source
                }
                for j in saved_jobs
            ],
            "skipped": skipped_count,
            "total_found": len(jobs_data)
        }
    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e)
        logger.error(f"Error crawling jobs: {error_str}", exc_info=True)
        
        # Provide helpful error messages for common database issues
        if "could not translate host name" in error_str or "nodename nor servname" in error_str:
            detail = (
                "Database connection failed: Cannot resolve database hostname. "
                "This usually means:\n"
                "1. The Supabase project may be paused - check your Supabase dashboard\n"
                "2. Network connectivity issues\n"
                "3. Incorrect DATABASE_URL in .env file\n"
                "Try using the connection pooler URL instead: "
                "postgresql://postgres:[PASSWORD]@[PROJECT-REF].pooler.supabase.com:6543/postgres"
            )
        elif "password authentication failed" in error_str:
            detail = (
                "Database authentication failed. Please check:\n"
                "1. Your database password in the DATABASE_URL\n"
                "2. Get the correct password from Supabase Dashboard > Settings > Database"
            )
        elif "connection" in error_str.lower() or "timeout" in error_str.lower():
            detail = (
                "Database connection error. Please check:\n"
                "1. Your internet connection\n"
                "2. Supabase project status (may be paused)\n"
                "3. Database URL format in .env file"
            )
        else:
            detail = f"Error crawling jobs: {error_str}"
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail
        )


@router.post("/discover")
async def discover_jobs(
    request: DiscoverJobsRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Discover jobs based on user's resume skills and optional keywords (LinkedIn-style)"""
    user_id = current_user["user_id"]
    keywords = request.keywords
    location = request.location
    limit = request.limit
    
    # Ensure profile exists
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        profile = Profile(
            id=user_id,
            email=current_user.get("email", "")
        )
        db.add(profile)
        db.commit()
        logger.info(f"Created profile for user {user_id}")
    
    # Get user's most recent resume to extract skills
    resume = db.query(Resume).filter(Resume.user_id == user_id).order_by(Resume.created_at.desc()).first()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a resume first to discover jobs based on your skills"
        )
    
    # Extract skills from resume
    skills = resume.skills or []
    if not skills:
        # Try to extract from parsed_data if skills array is empty
        parsed_data = resume.parsed_data or {}
        if isinstance(parsed_data, dict):
            skills = parsed_data.get("skills", [])
    
    if not skills:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No skills found in your resume. Please upload a resume with skills listed."
        )
    
    try:
        # Use the service function to discover jobs
        from app.services.job_discovery import discover_jobs_for_resume
        
        saved_jobs = await discover_jobs_for_resume(
            user_id=user_id,
            resume=resume,
            location=location,
            limit=limit,
            keywords=keywords,
            db=db
        )
        
        # Determine source (check first job if available)
        source_used = "jsearch"
        if saved_jobs:
            # Check job source
            if any(job.source == "adzuna" for job in saved_jobs):
                source_used = "adzuna"
        
        if not saved_jobs:
            # Check if JSearch is configured to provide better error message
            jsearch_configured = bool(settings.jsearch_api_key)
            adzuna_configured = bool(settings.adzuna_app_id and settings.adzuna_api_key)
            
            if jsearch_configured:
                message = "No jobs found matching your skills. JSearch API may be experiencing issues."
            elif adzuna_configured:
                message = "No jobs found matching your skills using Adzuna API."
            else:
                message = "No jobs found matching your skills. Please configure a job search API."
            
            return {
                "message": message,
                "jobs": [],
                "skipped": 0,
                "skills_used": skills[:5],  # Show which skills were used
                "source": source_used
            }
        
        # Create appropriate message based on source
        if source_used == "adzuna":
            message = f"Discovered and saved {len(saved_jobs)} jobs using Adzuna (JSearch unavailable)"
        else:
            message = f"Discovered and saved {len(saved_jobs)} jobs based on your skills"
        
        return {
            "message": message,
            "jobs": [
                {
                    "id": str(j.id),
                    "title": j.title,
                    "company": j.company,
                    "source": j.source
                }
                for j in saved_jobs
            ],
            "skipped": 0,  # Skipped count is logged in service function
            "total_found": len(saved_jobs),
            "skills_used": skills[:5],  # Top 5 skills used for discovery
            "source": source_used
        }
    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e)
        logger.error(f"Error discovering jobs: {error_str}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error discovering jobs: {error_str}"
        )


@router.delete("/{job_id}")
async def delete_job(
    job_id: UUID,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete job"""
    user_id = current_user["user_id"]
    
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.user_id == user_id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Delete from Qdrant
    if job.embedding_id:
        qdrant_service.delete_point(job.embedding_id)
    
    db.delete(job)
    db.commit()
    
    return {"message": "Job deleted successfully"}
