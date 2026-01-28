from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
import logging
import re

from app.models.job import Job
from app.models.resume import Resume
from app.models.user import Profile
from app.services.job_crawler import job_crawler
from app.services.embedding import embedding_service
from app.services.qdrant_client import qdrant_service
from app.core.config import settings

logger = logging.getLogger(__name__)


async def discover_jobs_for_resume(
    user_id: UUID,
    resume: Resume,
    location: str = "",
    limit: int = 50,
    keywords: str = "",
    db: Session = None
) -> List[Job]:
    """Discover jobs based on resume skills
    
    Args:
        user_id: User ID
        resume: Resume object
        location: Location to search (empty uses user's saved location or default)
        limit: Maximum number of jobs to discover
        keywords: Optional keywords for search (empty = resume-based, non-empty = search-based)
        db: Database session
    
    Returns:
        List of saved Job objects
    """
    # Extract skills from resume
    skills = resume.skills or []
    if not skills:
        # Try to extract from parsed_data if skills array is empty
        parsed_data = resume.parsed_data or {}
        if isinstance(parsed_data, dict):
            skills = parsed_data.get("skills", [])
    
    # Filter out non-technical skills and check if we have valid technical skills
    technical_skills_keywords = {
        "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
        "react", "vue", "angular", "node", "express", "django", "flask", "fastapi",
        "spring", "aws", "docker", "kubernetes", "git", "sql", "mongodb", "postgresql",
        "machine learning", "tensorflow", "pytorch", "html", "css", "rest", "graphql"
    }
    
    # Check if skills are technical
    def is_technical_skill(skill: str) -> bool:
        """Check if a skill is technical"""
        if not skill:
            return False
        skill_lower = skill.lower().strip()
        # Filter out soft skills and sentences
        soft_skill_patterns = [
            r'communication\s+skills?', r'problem\s+solving', r'team\s+work',
            r'leadership', r'creativity', r'been\s+technical\s+lead',
            r'additional\s+information', r'\.$'  # Ends with period
        ]
        for pattern in soft_skill_patterns:
            if re.search(pattern, skill_lower):
                return False
        # Check if it matches known technical skills
        for tech_skill in technical_skills_keywords:
            if tech_skill in skill_lower or skill_lower in tech_skill:
                return True
        # Check if it's a short technical term (likely a tech skill)
        if len(skill_lower) <= 20 and re.search(r'\b(js|ts|api|sdk|ide|cli|ui|ux|db|sql|ml|ai)\b', skill_lower, re.IGNORECASE):
            return True
        return False
    
    # Filter skills to only technical ones
    technical_skills = [s for s in skills if is_technical_skill(s)]
    
    # If no technical skills found, try to extract job title from experience
    fallback_query = ""
    if not technical_skills:
        logger.warning(f"No technical skills found in resume {resume.id}, trying to extract role from experience")
        parsed_data = resume.parsed_data or {}
        if isinstance(parsed_data, dict):
            experience = parsed_data.get("experience", [])
            if experience and len(experience) > 0:
                # Get the most recent role
                role = experience[0].get("role", "")
                if role and role != "Not specified":
                    # Extract job title keywords (e.g., "Software Engineer" -> "software engineer")
                    fallback_query = role.lower()
                    logger.info(f"Using role as fallback query: {fallback_query}")
    
    # If still no query, use very general fallback
    if not technical_skills and not fallback_query:
        fallback_query = "software engineer"
        logger.info(f"Using default fallback query: {fallback_query}")
    
    # Use technical skills if available, otherwise use fallback
    if not technical_skills:
        skills = []  # Clear non-technical skills
        logger.info(f"No technical skills extracted, will use fallback query: {fallback_query}")
    else:
        skills = technical_skills
        logger.info(f"Extracted {len(skills)} technical skills: {skills[:5]}")
    
    # Get user profile for location if not provided
    if not location:
        profile = db.query(Profile).filter(Profile.id == user_id).first()
        if profile and profile.location:
            location = profile.location
            logger.info(f"Using saved location for user {user_id}: {location}")
        else:
            # Default to India if no location set
            location = "India"
            logger.info(f"No location set, defaulting to India for user {user_id}")
    
    # Get existing jobs for duplicate detection
    existing_jobs_query = db.query(Job).filter(Job.user_id == user_id).all()
    existing_jobs = [
        {
            "title": j.title,
            "company": j.company,
            "url": j.url
        }
        for j in existing_jobs_query
    ]
    
    try:
        # If keywords are provided, this is a search-based query
        # Delete all previous search-based jobs before adding new ones
        if keywords and keywords.strip():
            logger.info(f"Deleting old search-based jobs for user {user_id}")
            old_search_jobs = db.query(Job).filter(
                Job.user_id == user_id,
                Job.search_keywords.isnot(None)
            ).all()
            
            if old_search_jobs:
                # Get job IDs
                old_job_ids = [job.id for job in old_search_jobs]
                
                # Delete job_matches first (to avoid foreign key constraint violation)
                from app.models.job import JobMatch
                deleted_matches = db.query(JobMatch).filter(
                    JobMatch.job_id.in_(old_job_ids),
                    JobMatch.user_id == user_id
                ).delete(synchronize_session=False)
                logger.info(f"Deleted {deleted_matches} job matches for old search-based jobs")
                
                # Delete from Qdrant
                for old_job in old_search_jobs:
                    if old_job.embedding_id:
                        try:
                            qdrant_service.delete_point(old_job.embedding_id)
                        except Exception as e:
                            logger.warning(f"Failed to delete Qdrant point {old_job.embedding_id}: {e}")
                
                # Now delete jobs (foreign key constraint satisfied)
                db.query(Job).filter(
                    Job.user_id == user_id,
                    Job.search_keywords.isnot(None)
                ).delete(synchronize_session=False)
                db.commit()
                logger.info(f"Deleted {len(old_search_jobs)} old search-based jobs")
        
        # Use JSearch to find jobs based on skills and optional keywords
        # If user provided keywords (search-based), use them
        # Otherwise, if no technical skills, use fallback query
        search_keywords = keywords
        if not search_keywords and not technical_skills and fallback_query:
            # Use fallback query as keywords if no user keywords and no technical skills
            search_keywords = fallback_query
            logger.info(f"Using fallback query as keywords: {search_keywords}")
        
        jobs_data = job_crawler.crawl_jsearch_jobs(
            keywords=search_keywords,  # Use keywords, fallback query, or empty
            location=location,  # Use saved location if not provided
            limit=limit,
            skills=skills if technical_skills else None  # Only use skills if they're technical
        )
        
        # Determine source of jobs (JSearch or Adzuna fallback)
        source_used = "jsearch"
        if jobs_data:
            # Check if any job has source "adzuna" (from fallback)
            if any(job.get("source") == "adzuna" for job in jobs_data):
                source_used = "adzuna"
                logger.info("Jobs discovered using Adzuna fallback (JSearch failed)")
        
        if not jobs_data:
            logger.warning(f"No jobs found for user {user_id} with skills: {skills[:5]}")
            return []
        
        # Save jobs to database
        saved_jobs = []
        skipped_count = 0
        current_batch_jobs = []
        
        for job_data in jobs_data:
            # Check for duplicates
            if job_crawler.is_duplicate_job(job_data, existing_jobs):
                skipped_count += 1
                logger.info(f"Skipping duplicate job: {job_data.get('title')} at {job_data.get('company')}")
                continue
            
            if job_crawler.is_duplicate_job(job_data, current_batch_jobs):
                skipped_count += 1
                continue
            
            # Extract skills from job description
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
            # Set search_keywords only if keywords were provided (search-based)
            # Leave null if no keywords (resume-based)
            job = Job(
                user_id=user_id,
                title=job_data.get("title", ""),
                company=job_data.get("company", ""),
                description=job_data.get("description", ""),
                source="discovered",
                url=job_data.get("url"),
                location=job_data.get("location"),
                required_skills=required_skills,
                embedding_id=embedding_id,
                search_keywords=keywords.strip() if keywords and keywords.strip() else None
            )
            
            db.add(job)
            saved_jobs.append(job)
            
            current_batch_jobs.append({
                "title": job_data.get("title", ""),
                "company": job_data.get("company", ""),
                "url": job_data.get("url")
            })
        
        db.commit()
        
        logger.info(f"Discovered and saved {len(saved_jobs)} jobs for user {user_id} (skipped {skipped_count} duplicates, source: {source_used})")
        
        return saved_jobs
        
    except Exception as e:
        logger.error(f"Error discovering jobs for resume {resume.id}: {str(e)}")
        db.rollback()
        raise
