from fastapi import APIRouter, Depends, HTTPException, status
from app.models.domain_model import DomainCredibilityResponse
from app.services.domain_service import DomainService
from app.dependencies.auth import get_current_user
from typing import Dict
from pydantic import BaseModel

router = APIRouter()
domain_service = DomainService()


class DomainRequest(BaseModel):
    url: str


@router.post("/credibility", response_model=DomainCredibilityResponse)
async def get_domain_credibility(
    request: DomainRequest,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get domain credibility score for a given URL
    """
    try:
        result = domain_service.get_domain_credibility(request.url)
        
        return DomainCredibilityResponse(
            domain=result['domain'],
            total_score=result['total_score'],
            breakdown=result['breakdown'],
            metadata=result['metadata']
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/credibility/{domain}")
async def get_domain_score_by_name(
    domain: str,
    current_user: Dict = Depends(get_current_user)
):
    """
    Get domain credibility score by domain name
    """
    try:
        # Construct a URL from domain name
        url = f"https://{domain}"
        result = domain_service.get_domain_credibility(url)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/top-domains")
async def get_top_domains(
    current_user: Dict = Depends(get_current_user),
    limit: int = 10
):
    """
    Get top credible domains
    """
    try:
        # Query Firestore for top domains by score
        domains_ref = domain_service.db.collection(domain_service.domains_collection)
        query = domains_ref.order_by('total_score', direction='DESCENDING').limit(limit)
        
        docs = query.stream()
        domains = []
        
        for doc in docs:
            data = doc.to_dict()
            domains.append({
                'domain': data.get('domain'),
                'total_score': data.get('total_score'),
                'total_analyses': data.get('total_analyses', 0),
                'is_https': data.get('is_https', False)
            })
        
        return {
            'domains': domains,
            'total': len(domains)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
