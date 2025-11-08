from pydantic import BaseModel
from typing import List

class CheckRequest(BaseModel):
    url: str
    user_id: str


class CheckResponse(BaseModel):
    summary: str
    sentiment: str

    verified_sources: List[str]
    rejected_sources: List[str]

    domain_cred: float
    final_score: float
    timestamp: str