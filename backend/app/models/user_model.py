from pydantic import BaseModel
from typing import Optional

class UserResponse(BaseModel):
    uid: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    email_verified: bool