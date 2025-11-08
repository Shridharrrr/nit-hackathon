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
        print("⚠️ N8N_WEBHOOK_URL not configured.")
        return {
            "support_sources": [],
            "contradict_sources": [],
            "error": "Webhook URL missing"
        }
    
    payload = {"title": title}
    
    print(f"🔗 Calling n8n webhook at: {N8N_WEBHOOK_URL}")
    print(f"📦 Payload: {payload}")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(N8N_WEBHOOK_URL, json=payload)
            
            print(f"✅ Webhook response status: {response.status_code}")
            print(f"📥 Response content: {response.text[:500]}")  # Log first 500 chars
            
            response.raise_for_status()
            data = response.json()
            
            # Extract cross-check data from response
            # Expected format: [{"support_sources": [...], "contradict_sources": [...]}]
            if isinstance(data, list) and len(data) > 0:
                cross_check_data = data[0]
            else:
                cross_check_data = data
            
            result = {
                "support_sources": cross_check_data.get("support_sources", []),
                "contradict_sources": cross_check_data.get("contradict_sources", [])
            }
            
            print(f"✅ Cross-check successful: {len(result['support_sources'])} supporting, {len(result['contradict_sources'])} contradicting")
            
            return result
            
    except httpx.HTTPStatusError as e:
        print(f"❌ HTTP error calling N8N webhook: {e.response.status_code} - {e.response.text}")
        return {
            "support_sources": [],
            "contradict_sources": [],
            "error": f"HTTP {e.response.status_code}: {e.response.text[:200]}"
        }
    except httpx.RequestError as e:
        print(f"❌ Request error calling N8N webhook: {type(e).__name__}: {str(e)}")
        return {
            "support_sources": [],
            "contradict_sources": [],
            "error": f"Connection error: {str(e)}"
        }
    except Exception as e:
        print(f"❌ Unexpected error calling N8N webhook: {type(e).__name__}: {str(e)}")
        return {
            "support_sources": [],
            "contradict_sources": [],
            "error": f"Unexpected error: {str(e)}"
        }
