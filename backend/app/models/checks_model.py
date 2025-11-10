from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime


class CrossCheckSource(BaseModel):
    title: str
    url: str
    snippet: str


class CrossCheckData(BaseModel):
    support_sources: List[CrossCheckSource] = []
    contradict_sources: List[CrossCheckSource] = []


class NewsAnalysisRequest(BaseModel):
    input: str  # Can be either URL or text


class NewsAnalysisResponse(BaseModel):
    success: bool
    id: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    verdict: Optional[str] = None
    confidence: Optional[float] = None
    cross_check: Optional[Dict] = None
    domain_credibility: Optional[float] = None
    timestamp: Optional[str] = None
    error: Optional[str] = None


class NewsAnalysisHistory(BaseModel):
    analyses: list