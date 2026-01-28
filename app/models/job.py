from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Job(Base):
    """Job posting model"""
    __tablename__ = "jobs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    description = Column(String, nullable=False)
    source = Column(String, nullable=False)  # 'manual' or 'crawled'
    url = Column(String, nullable=True)
    location = Column(String, nullable=True)
    required_skills = Column(ARRAY(String), nullable=True)
    embedding_id = Column(String, nullable=True)  # Qdrant point ID
    search_keywords = Column(String, nullable=True)  # Track search query that created this job (null = resume-based)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class JobMatch(Base):
    """Job matching results"""
    __tablename__ = "job_matches"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    resume_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    match_score = Column(String, nullable=False)  # Float as string for precision
    classification = Column(String, nullable=False)  # 'green', 'yellow', 'red'
    missing_skills = Column(ARRAY(String), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Roadmap(Base):
    """Learning roadmap for job"""
    __tablename__ = "roadmaps"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    roadmap_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Application(Base):
    """Job application model"""
    __tablename__ = "applications"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    resume_id = Column(UUID(as_uuid=True), nullable=False)
    application_type = Column(String, nullable=False)  # 'external' or 'easy_apply'
    status = Column(String, nullable=False, default='submitted')  # 'submitted', 'viewed', 'shortlisted', 'rejected'
    external_url = Column(String, nullable=True)
    answers = Column(JSON, nullable=True)
    resume_snapshot = Column(JSON, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
