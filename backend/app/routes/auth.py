from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.auth import get_current_user, get_current_active_user
from app.models.user_model import UserResponse

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information
    """
    return UserResponse(
        uid=current_user["uid"],
        email=current_user["email"],
        name=current_user.get("name"),
        picture=current_user.get("picture"),
        email_verified=current_user["email_verified"]
    )

@router.post("/verify")
async def verify_token(current_user: dict = Depends(get_current_user)):
    """
    Verify if the provided token is valid
    """
    return {
        "valid": True,
        "user": {
            "uid": current_user["uid"],
            "email": current_user["email"],
            "name": current_user.get("name"),
            "email_verified": current_user["email_verified"]
        }
    }

@router.get("/protected")
async def protected_route(current_user: dict = Depends(get_current_active_user)):
    """
    Example protected route that requires an active, verified user
    """
    return {
        "message": f"Hello {current_user['email']}, this is a protected route!",
        "user_id": current_user["uid"]
    }
