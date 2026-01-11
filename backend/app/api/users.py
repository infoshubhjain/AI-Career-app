"""
User API endpoints.
Protected routes that require authentication.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.core.auth import get_current_user, get_optional_user, CurrentUser

router = APIRouter(prefix="/users", tags=["Users"])


class UserProfileResponse(BaseModel):
    """User profile response."""
    id: str
    email: Optional[str]
    message: str


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(user: CurrentUser = Depends(get_current_user)):
    """
    Get the current authenticated user's profile.
    Requires valid JWT token in Authorization header.
    
    This endpoint demonstrates:
    - How protected routes work
    - How user info is extracted from the JWT
    """
    return UserProfileResponse(
        id=user.id,
        email=user.email,
        message="Successfully authenticated!"
    )


@router.get("/check")
async def check_auth_status(user: Optional[CurrentUser] = Depends(get_optional_user)):
    """
    Check authentication status.
    Works with or without a token.
    
    This endpoint demonstrates:
    - Optional authentication
    - Different responses based on auth status
    """
    if user:
        return {
            "authenticated": True,
            "user_id": user.id,
            "email": user.email
        }
    return {
        "authenticated": False,
        "user_id": None,
        "email": None
    }

