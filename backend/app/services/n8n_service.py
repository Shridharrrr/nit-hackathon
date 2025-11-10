import httpx
from dotenv import load_dotenv
import os
import asyncio

load_dotenv()

N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://localhost:5680/webhook-test/cross-check")

async def get_cross_check(title: str):
    """
    Send title to n8n webhook and receive cross-check results (async version)
    Returns: {
        "support_sources": [{"title": str, "url": str, "snippet": str}],
        "contradict_sources": [{"title": str, "url": str, "snippet": str}]
    }
    """
    if not N8N_WEBHOOK_URL:
        return {
            "support_sources": [],
            "contradict_sources": [],
            "error": "Webhook URL missing"
        }
    
    payload = {"title": title}
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(N8N_WEBHOOK_URL, json=payload)
            
            response.raise_for_status()
            data = response.json()
            
            # Extract cross-check data from response
            # Expected format: [{"claim": str, "verdict": str, "credibility_score": int, "analysis": {...}, "evidence": {...}}]
            if isinstance(data, list) and len(data) > 0:
                cross_check_data = data[0]
            else:
                cross_check_data = data
            
            # Extract evidence data
            evidence = cross_check_data.get("evidence", {})
            analysis = cross_check_data.get("analysis", {})
            
            # Get source arrays
            supporting_sources = evidence.get("supporting", [])
            contradicting_sources = evidence.get("contradicting", [])
            neutral_sources = evidence.get("neutral", [])
            
            # Get original counts from analysis or calculate from arrays
            original_supports = analysis.get("supports_count", len(supporting_sources))
            original_contradicts = analysis.get("contradicts_count", len(contradicting_sources))
            original_neutral = analysis.get("neutral_count", len(neutral_sources))
            
            # Multiply counts by 10 to get percentage values
            supports_count = original_supports * 10
            contradicts_count = original_contradicts * 10
            neutral_count = original_neutral * 10
            total_sources = supports_count + contradicts_count + neutral_count
            
            # Calculate credibility score using original counts
            original_total = original_supports + original_contradicts + original_neutral
            credibility_score = ((original_supports - original_contradicts) + (original_neutral * 0.5)) / original_total if original_total > 0 else 0
            
            result = {
                "support_sources": supporting_sources,
                "contradict_sources": contradicting_sources,
                "neutral_sources": neutral_sources,
                "verdict": cross_check_data.get("verdict"),
                "credibility_score": credibility_score,
                "supports_count": supports_count,
                "contradicts_count": contradicts_count,
                "neutral_count": neutral_count,
                "total_sources": total_sources,
                # Store original counts for display
                "original_supports": original_supports,
                "original_contradicts": original_contradicts,
                "original_neutral": original_neutral
            }
            
            return result
            
    except httpx.HTTPStatusError as e:
        return {
            "support_sources": [],
            "contradict_sources": [],
            "error": f"HTTP {e.response.status_code}: {e.response.text[:200]}"
        }
    except httpx.RequestError as e:
        return {
            "support_sources": [],
            "contradict_sources": [],
            "error": f"Connection error: {str(e)}"
        }
    except Exception as e:
        return {
            "support_sources": [],
            "contradict_sources": [],
            "error": f"Unexpected error: {str(e)}"
        }
