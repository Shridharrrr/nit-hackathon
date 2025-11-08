from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class NewsAnalysisRequest(BaseModel):
    url: str


class NewsAnalysisResponse(BaseModel):
    success: bool
    id: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    verdict: Optional[str] = None
    credibility: Optional[str] = None
    sentiment: Optional[str] = None
    confidence: Optional[float] = None
    timestamp: Optional[str] = None
    error: Optional[str] = None


class NewsAnalysisHistory(BaseModel):
    analyses: list