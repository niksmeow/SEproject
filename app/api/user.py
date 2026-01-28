from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import Profile
from app.services.geolocation import geolocation_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("/me")
async def get_current_user_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Get current user profile"""
    user_id = current_user["user_id"]
    
    # Get or create profile
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    
    if not profile:
        # Create profile if doesn't exist
        profile = Profile(
            id=user_id,
            email=current_user.get("email", "")
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Auto-detect location if not set
    if not profile.location and request:
        try:
            # Get client IP from request
            client_ip = None
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                client_ip = forwarded_for.split(",")[0].strip()
            else:
                client_ip = request.client.host if request.client else None
            
            location_data = geolocation_service.get_location_from_ip(client_ip)
            if location_data:
                profile.location = location_data.get('location', '')
                profile.latitude = location_data.get('latitude', '')
                profile.longitude = location_data.get('longitude', '')
                db.commit()
                db.refresh(profile)
                logger.info(f"Auto-detected location for user {user_id}: {profile.location}")
            else:
                # Default to India if detection fails
                profile.location = "India"
                db.commit()
                db.refresh(profile)
                logger.info(f"Set default location to India for user {user_id}")
        except Exception as e:
            logger.warning(f"Failed to auto-detect location for user {user_id}: {str(e)}")
            # Default to India on error
            if not profile.location:
                profile.location = "India"
                db.commit()
                db.refresh(profile)
    
    return {
        "id": str(profile.id),
        "email": profile.email,
        "full_name": profile.full_name,
        "avatar_url": profile.avatar_url,
        "location": profile.location,
        "latitude": profile.latitude,
        "longitude": profile.longitude,
        "location_radius": profile.location_radius
    }


class UpdateLocationRequest(BaseModel):
    location: Optional[str] = None  # City, state, country
    latitude: Optional[str] = None  # Latitude as string
    longitude: Optional[str] = None  # Longitude as string
    location_radius: Optional[str] = "50"  # Radius in miles/km
    auto_detect: Optional[bool] = False  # Auto-detect from IP


@router.put("/location")
async def update_user_location(
    request: UpdateLocationRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    http_request: Request = None
):
    """Update user's location (manual or IP-based detection)"""
    user_id = current_user["user_id"]
    
    # Get or create profile
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        profile = Profile(
            id=user_id,
            email=current_user.get("email", "")
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Auto-detect from IP if requested
    if request.auto_detect:
        # Get client IP from request
        client_ip = None
        if http_request:
            # Try to get IP from headers (for proxies/load balancers)
            forwarded_for = http_request.headers.get("X-Forwarded-For")
            if forwarded_for:
                client_ip = forwarded_for.split(",")[0].strip()
            else:
                client_ip = http_request.client.host if http_request.client else None
        
        location_data = geolocation_service.get_location_from_ip(client_ip)
        if location_data:
            profile.location = location_data.get('location', '')
            profile.latitude = location_data.get('latitude', '')
            profile.longitude = location_data.get('longitude', '')
            logger.info(f"Auto-detected location for user {user_id}: {profile.location}")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not detect location from IP address"
            )
    else:
        # Manual location update
        if request.location:
            profile.location = request.location
            
            # If coordinates provided, use them
            if request.latitude and request.longitude:
                profile.latitude = request.latitude
                profile.longitude = request.longitude
            else:
                # Try to geocode the location string
                geocoded = geolocation_service.geocode_location(request.location)
                if geocoded:
                    profile.latitude = geocoded.get('latitude', '')
                    profile.longitude = geocoded.get('longitude', '')
                    logger.info(f"Geocoded location '{request.location}' to coordinates")
                else:
                    logger.warning(f"Could not geocode location '{request.location}'")
        
        if request.latitude:
            profile.latitude = request.latitude
        if request.longitude:
            profile.longitude = request.longitude
        if request.location_radius:
            profile.location_radius = request.location_radius
    
    db.commit()
    db.refresh(profile)
    
    return {
        "id": str(profile.id),
        "location": profile.location,
        "latitude": profile.latitude,
        "longitude": profile.longitude,
        "location_radius": profile.location_radius,
        "message": "Location updated successfully"
    }
