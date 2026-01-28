from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.core.config import settings
from typing import Optional

security = HTTPBearer()


def get_supabase_client() -> Client:
    """Get Supabase client with service role key for JWT verification"""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Verify JWT token from Supabase and return user data
    """
    token = credentials.credentials
    
    try:
        supabase = get_supabase_client()
        # Verify the token using Supabase
        user = supabase.auth.get_user(token)
        
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        return {
            "user_id": user.user.id,
            "email": user.user.email,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )


def get_current_user(user_data: dict = Depends(verify_token)) -> dict:
    """Get current authenticated user"""
    return user_data
