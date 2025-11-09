from fastapi import APIRouter, Depends, HTTPException, status
from app.models.checks_model import NewsAnalysisRequest, NewsAnalysisResponse, NewsAnalysisHistory
from app.services.news_analyzer import NewsAnalyzer
from app.services.firestore_service import FirestoreService
from app.services.community_service import CommunityService
from app.services.domain_service import DomainService
from app.dependencies.auth import get_current_user
from typing import Dict

router = APIRouter()
news_analyzer = NewsAnalyzer()
firestore_service = FirestoreService()
community_service = CommunityService()
domain_service = DomainService()


@router.post("/analyze", response_model=NewsAnalysisResponse)
async def analyze_news(
    request: NewsAnalysisRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Analyze a news article from URL:
    1. Scrape the URL content
    2. Generate summary using Gemini
    3. Analyze credibility using HuggingFace
    4. Store results in Firestore
    """
    try:
        # Perform analysis
        result = await news_analyzer.analyze_news(request.url)
        
        if not result['success']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Failed to analyze news')
            )
        
        # Get or create domain credibility score
        domain_cred = domain_service.get_or_create_domain_score(request.url)
        print(f"🔍 Initial domain score: {domain_cred.get('total_score', 50.0)}")
        
        # Update domain score based on cross-check results
        cross_check = result.get('cross_check', {})
        if cross_check:
            supporting_sources = cross_check.get('support_sources', [])
            contradicting_sources = cross_check.get('contradict_sources', [])
            print(f"📊 Cross-check: {len(supporting_sources)} supporting, {len(contradicting_sources)} contradicting")
            
            if supporting_sources or contradicting_sources:
                domain_cred = domain_service.update_domain_from_analysis(
                    request.url,
                    supporting_sources,
                    contradicting_sources
                )
                print(f"✅ Updated domain score: {domain_cred.get('total_score', 50.0)}")
        
        # Save to Firestore
        try:
            doc_id = firestore_service.save_analysis(
                user_id=current_user['uid'],
                analysis_data={
                    'url': result['url'],
                    'title': result['title'],
                    'content': result['content'][:1000],  # Store truncated content
                    'summary': result['summary'],
                    'verdict': result['verdict'],
                    'confidence': result['confidence'],
                    'cross_check': result.get('cross_check', {}),
                    'domain_credibility': domain_cred.get('total_score', 50.0)
                }
            )
            
            return NewsAnalysisResponse(
                success=True,
                id=doc_id,
                url=result['url'],
                title=result['title'],
                summary=result['summary'],
                verdict=result['verdict'],
                confidence=result['confidence'],
                cross_check=result.get('cross_check'),
                domain_credibility=domain_cred.get('total_score', 50.0),
                timestamp=None  # Will be set by Firestore
            )
            
        except Exception as e:
            # Return analysis even if Firestore save fails
            return NewsAnalysisResponse(
                success=True,
                url=result['url'],
                title=result['title'],
                summary=result['summary'],
                verdict=result['verdict'],
                confidence=result['confidence'],
                cross_check=result.get('cross_check'),
                domain_credibility=domain_cred.get('total_score', 50.0),
                error=f"Analysis completed but failed to save: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/history", response_model=NewsAnalysisHistory)
async def get_analysis_history(
    current_user: Dict = Depends(get_current_user),
    limit: int = 10
):
    """
    Get user's news analysis history
    """
    try:
        analyses = firestore_service.get_user_analyses(
            user_id=current_user['uid'],
            limit=limit
        )
        
        return NewsAnalysisHistory(analyses=analyses)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/analysis/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get a specific analysis by ID
    """
    try:
        analysis = firestore_service.get_analysis_by_id(analysis_id)
        
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found"
            )
        
        # Check if user owns this analysis
        if analysis.get('user_id') != current_user['uid']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this analysis"
            )
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/analysis/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Delete an analysis
    """
    try:
        success = firestore_service.delete_analysis(
            analysis_id=analysis_id,
            user_id=current_user['uid']
        )
        
        if success:
            return {"message": "Analysis deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to delete analysis"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
