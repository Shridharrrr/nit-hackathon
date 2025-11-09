from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class ShareToCommunitRequest(BaseModel):
    analysis_id: str


class VoteRequest(BaseModel):
    post_id: str
    vote_type: str  # 'upvote' or 'downvote'


class CommentRequest(BaseModel):
    post_id: str
    content: str


class CommentVoteRequest(BaseModel):
    comment_id: str
    vote_type: str  # 'upvote' or 'downvote'


class CommentResponse(BaseModel):
    id: str
    post_id: str
    user_id: str
    user_name: Optional[str] = None
    user_picture: Optional[str] = None
    content: str
    upvotes: int = 0
    downvotes: int = 0
    user_vote: Optional[str] = None  # 'upvote', 'downvote', or None
    timestamp: str
    created_at: Optional[str] = None


class CommunityPostResponse(BaseModel):
    id: str
    analysis_id: str
    user_id: str
    user_name: Optional[str] = None
    user_picture: Optional[str] = None
    url: Optional[str] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    verdict: Optional[str] = None
    confidence: Optional[float] = None
    cross_check: Optional[Dict[str, Any]] = None
    domain_credibility: Optional[float] = None
    upvotes: int = 0
    downvotes: int = 0
    comment_count: int = 0
    user_vote: Optional[str] = None  # 'upvote', 'downvote', or None
    timestamp: str
    created_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class CommunityPostsResponse(BaseModel):
    posts: List[CommunityPostResponse]
    total: int


class CommunityPostDetailResponse(BaseModel):
    post: CommunityPostResponse
    comments: List[CommentResponse]
