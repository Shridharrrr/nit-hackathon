from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DomainCredibility(BaseModel):
    domain: str
    base_score: float = 50.0  # Base score out of 100
    https_score: float = 0.0  # +10 for HTTPS
    analysis_score: float = 0.0  # Dynamic score based on analysis results (-30 to +30)
    community_score: float = 0.0  # Dynamic score based on community votes (-10 to +10)
    total_score: float = 50.0  # Sum of all scores (max 100)
    
    # Metadata
    is_https: bool = False
    total_analyses: int = 0
    supporting_count: int = 0
    contradicting_count: int = 0
    community_upvotes: int = 0
    community_downvotes: int = 0
    
    last_updated: str
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class DomainCredibilityResponse(BaseModel):
    domain: str
    total_score: float
    breakdown: dict
    metadata: dict
