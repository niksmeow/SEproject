from sqlalchemy import Column, String, DateTime, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class Profile(Base):
    """User profile extending Supabase auth.users"""
    __tablename__ = "profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    location = Column(String, nullable=True)  # City, state, country
    latitude = Column(String, nullable=True)  # Store as string for precision
    longitude = Column(String, nullable=True)  # Store as string for precision
    location_radius = Column(String, nullable=True, default="50")  # Radius in miles/km
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class UserPreferences(Base):
    """User preferences for job search"""
    __tablename__ = "user_preferences"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    job_search_preferences = Column(JSON, nullable=True)
    notification_settings = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
