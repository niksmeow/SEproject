from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid


class Resume(Base):
    """Resume model"""
    __tablename__ = "resumes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    original_file_path = Column(String, nullable=False)
    parsed_data = Column(JSON, nullable=True)
    original_parsed_data = Column(JSON, nullable=True)  # Store original before optimization
    skills = Column(ARRAY(String), nullable=True)
    experience = Column(JSON, nullable=True)
    projects = Column(JSON, nullable=True)
    embedding_id = Column(String, nullable=True)  # Qdrant point ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class OptimizedResume(Base):
    """Optimized resume for specific job"""
    __tablename__ = "optimized_resumes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    resume_id = Column(UUID(as_uuid=True), nullable=False)
    content = Column(String, nullable=False)
    file_path = Column(String, nullable=True)  # Path to PDF/DOCX file
    created_at = Column(DateTime(timezone=True), server_default=func.now())
