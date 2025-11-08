from fastapi import APIRouter, Depends, HTTPException, status
from app.models.community_model import (
    ShareToCommunitRequest,
    VoteRequest,
    CommentRequest,
    CommentVoteRequest,
    CommunityPostResponse,
    CommunityPostsResponse,
    CommunityPostDetailResponse,
    CommentResponse
)
from app.services.community_service import CommunityService
from app.dependencies.auth import get_current_user, get_optional_current_user
from typing import Dict, Optional

router = APIRouter()
community_service = CommunityService()


@router.post("/share")
async def share_to_community(
    request: ShareToCommunitRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Share an analysis to the community
    """
    try:
        post_id = community_service.share_to_community(
            analysis_id=request.analysis_id,
            user_id=current_user['uid'],
            user_name=current_user.get('name'),
            user_picture=current_user.get('picture')
        )
        
        return {
            "success": True,
            "post_id": post_id,
            "message": "Successfully shared to community"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/posts")
async def get_community_posts(
    limit: int = 20,
    current_user: Optional[Dict] = Depends(get_optional_current_user)
):
    """
    Get all community posts
    """
    try:
        user_id = current_user['uid'] if current_user and current_user else None
        posts = community_service.get_community_posts(limit=limit, user_id=user_id)
        
        print(f"Fetched {len(posts) if posts else 0} posts from database")
        
        # Return raw dict instead of Pydantic model to avoid validation issues
        return {
            "posts": posts if posts else [],
            "total": len(posts) if posts else 0
        }
        
    except Exception as e:
        print(f"Error in get_community_posts: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty list instead of error
        return {
            "posts": [],
            "total": 0
        }


@router.get("/posts/{post_id}")
async def get_post_detail(
    post_id: str,
    current_user: Optional[Dict] = Depends(get_optional_current_user)
):
    """
    Get a specific post with its comments
    """
    try:
        user_id = current_user['uid'] if current_user else None
        
        post = community_service.get_post_by_id(post_id, user_id)
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        comments = community_service.get_post_comments(post_id, user_id)
        
        # Return raw dict instead of Pydantic model to avoid validation issues
        return {
            "post": post,
            "comments": comments if comments else []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_post_detail: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/posts/vote")
async def vote_on_post(
    request: VoteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Vote on a post (upvote or downvote)
    """
    try:
        if request.vote_type not in ['upvote', 'downvote']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid vote type. Must be 'upvote' or 'downvote'"
            )
        
        result = community_service.vote_post(
            post_id=request.post_id,
            user_id=current_user['uid'],
            vote_type=request.vote_type
        )
        
        return {
            "success": True,
            **result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/comments")
async def add_comment(
    request: CommentRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Add a comment to a post
    """
    try:
        if not request.content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comment content cannot be empty"
            )
        
        comment_id = community_service.add_comment(
            post_id=request.post_id,
            user_id=current_user['uid'],
            content=request.content,
            user_name=current_user.get('name'),
            user_picture=current_user.get('picture')
        )
        
        return {
            "success": True,
            "comment_id": comment_id,
            "message": "Comment added successfully"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/comments/vote")
async def vote_on_comment(
    request: CommentVoteRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Vote on a comment (upvote or downvote)
    """
    try:
        if request.vote_type not in ['upvote', 'downvote']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid vote type. Must be 'upvote' or 'downvote'"
            )
        
        result = community_service.vote_comment(
            comment_id=request.comment_id,
            user_id=current_user['uid'],
            vote_type=request.vote_type
        )
        
        return {
            "success": True,
            **result
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
