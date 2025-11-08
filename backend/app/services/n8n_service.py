import requests
from config import N8N_WEBHOOK_URL

def get_cross_check(title: str):
    """
    Send title to n8n webhook and receive cross-check results
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
    
    try:
        response = requests.post(N8N_WEBHOOK_URL, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        # Extract cross-check data from response
        # Expected format: [{"support_sources": [...], "contradict_sources": [...]}]
        if isinstance(data, list) and len(data) > 0:
            cross_check_data = data[0]
        else:
            cross_check_data = data
        
        return {
            "support_sources": cross_check_data.get("support_sources", []),
            "contradict_sources": cross_check_data.get("contradict_sources", [])
        }
    except requests.exceptions.RequestException as e:
        print(f"Error calling N8N webhook: {e}")
        return {
            "support_sources": [],
            "contradict_sources": [],
            "error": f"Failed to call N8N webhook: {str(e)}"
        }
