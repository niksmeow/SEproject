from typing import Dict, List, Tuple
from app.services.embedding import embedding_service
from app.services.qdrant_client import qdrant_service
from app.models.job import Job
from app.models.resume import Resume
from sqlalchemy.orm import Session


class MatchingService:
    def __init__(self):
        self.green_threshold = 0.75
        self.yellow_threshold = 0.50
    
    def match_resume_to_jobs(
        self,
        resume: Resume,
        jobs: List[Job],
        db: Session
    ) -> List[Dict]:
        """Match a resume to multiple jobs"""
        results = []
        
        # Get resume embedding
        if not resume.embedding_id:
            # Generate embedding if not exists
            resume_text = embedding_service.encode_resume(
                resume.skills or [],
                resume.experience or {}
            )
            resume_embedding = embedding_service.encode(resume_text)
            resume.embedding_id = qdrant_service.upsert_embedding(
                resume_embedding,
                {"type": "resume", "resume_id": str(resume.id), "user_id": str(resume.user_id)}
            )
            db.commit()
        
        # Get resume embedding from Qdrant
        resume_embedding = None
        if resume.embedding_id:
            # We need to store the embedding, so let's regenerate it
            resume_text = embedding_service.encode_resume(
                resume.skills or [],
                resume.experience or {}
            )
            resume_embedding = embedding_service.encode(resume_text)
        
        # Match against each job
        for job in jobs:
            match_result = self._match_single_job(resume, job, resume_embedding, db)
            results.append(match_result)
        
        return results
    
    def _match_single_job(
        self,
        resume: Resume,
        job: Job,
        resume_embedding: List[float],
        db: Session
    ) -> Dict:
        """Match resume to a single job"""
        # Get or create job embedding
        if not job.embedding_id:
            job_text = embedding_service.encode_job(
                job.description,
                job.required_skills or []
            )
            job_embedding = embedding_service.encode(job_text)
            job.embedding_id = qdrant_service.upsert_embedding(
                job_embedding,
                {"type": "job", "job_id": str(job.id), "user_id": str(job.user_id)}
            )
            db.commit()
        
        # Calculate similarity
        if not resume_embedding:
            resume_text = embedding_service.encode_resume(
                resume.skills or [],
                resume.experience or {}
            )
            resume_embedding = embedding_service.encode(resume_text)
        
        job_text = embedding_service.encode_job(
            job.description,
            job.required_skills or []
        )
        job_embedding = embedding_service.encode(job_text)
        
        # Calculate cosine similarity
        similarity = self._cosine_similarity(resume_embedding, job_embedding)
        
        # Classify
        if similarity >= self.green_threshold:
            classification = "green"
        elif similarity >= self.yellow_threshold:
            classification = "yellow"
        else:
            classification = "red"
        
        # Find missing skills
        missing_skills = self._find_missing_skills(
            resume.skills or [],
            job.required_skills or []
        )
        
        return {
            "job_id": str(job.id),
            "match_score": similarity,
            "classification": classification,
            "missing_skills": missing_skills
        }
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        import numpy as np
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))
    
    def _find_missing_skills(
        self,
        resume_skills: List[str],
        job_skills: List[str]
    ) -> List[str]:
        """Find skills required by job but not in resume"""
        resume_skills_lower = [s.lower() for s in resume_skills]
        missing = []
        
        for job_skill in job_skills:
            if job_skill.lower() not in resume_skills_lower:
                missing.append(job_skill)
        
        return missing


matching_service = MatchingService()
