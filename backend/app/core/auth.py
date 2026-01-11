"""
Supabase JWT Authentication
Verifies JWTs from the frontend and extracts user information.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel

from app.core.config import settings

# HTTP Bearer token extractor
security = HTTPBearer()


class TokenPayload(BaseModel):
    """Decoded JWT token payload from Supabase."""
    sub: str  # User ID (UUID)
    email: Optional[str] = None
    exp: int
    aud: Optional[str] = None
    role: Optional[str] = None


class CurrentUser(BaseModel):
    """Authenticated user information extracted from JWT."""
    id: str
    email: Optional[str] = None


def verify_supabase_token(token: str) -> Optional[TokenPayload]:
    """
    Verify and decode a Supabase JWT token.
    
    Args:
        token: The JWT token from Authorization header
        
    Returns:
        TokenPayload if valid, None if invalid
    """
    if not settings.SUPABASE_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_JWT_SECRET not configured"
        )
    
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return TokenPayload(**payload)
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    """
    FastAPI dependency that extracts and validates the current user from JWT.
    
    Usage:
        @app.get("/protected")
        async def protected_route(user: CurrentUser = Depends(get_current_user)):
            return {"user_id": user.id, "email": user.email}
    
    Raises:
        HTTPException 401 if token is missing or invalid
    """
    token = credentials.credentials
    
    payload = verify_supabase_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return CurrentUser(
        id=payload.sub,
        email=payload.email
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    )
) -> Optional[CurrentUser]:
    """
    FastAPI dependency that optionally extracts user from JWT.
    Returns None if no token provided (for public endpoints that behave
    differently for authenticated users).
    
    Usage:
        @app.get("/public")
        async def public_route(user: Optional[CurrentUser] = Depends(get_optional_user)):
            if user:
                return {"message": f"Hello, {user.email}"}
            return {"message": "Hello, guest"}
    """
    if credentials is None:
        return None
    
    payload = verify_supabase_token(credentials.credentials)
    
    if payload is None:
        return None
    
    return CurrentUser(
        id=payload.sub,
        email=payload.email
    )

