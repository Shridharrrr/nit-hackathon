from firebase_admin import firestore
from datetime import datetime
from typing import Dict, List, Optional


class FirestoreService:
    def __init__(self):
        self.db = firestore.client()
        self.collection = 'news_analyses'
    
    def save_analysis(self, user_id: str, analysis_data: Dict) -> str:
        """
        Save news analysis to Firestore
        Returns the document ID
        """
        try:
            # Add timestamp and user_id
            doc_data = {
                **analysis_data,
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat(),
                'created_at': firestore.SERVER_TIMESTAMP
            }
            
            # Create document
            doc_ref = self.db.collection(self.collection).document()
            doc_ref.set(doc_data)
            
            return doc_ref.id
            
        except Exception as e:
            raise Exception(f"Failed to save analysis: {str(e)}")
    
    def get_user_analyses(self, user_id: str, limit: int = 10) -> List[Dict]:
        """
        Get all analyses for a specific user
        Returns list of analyses ordered by timestamp (newest first)
        """
        try:
            analyses_ref = self.db.collection(self.collection)
            # Use filter instead of where to avoid the deprecation warning
            query = analyses_ref.where(filter=firestore.FieldFilter('user_id', '==', user_id)).order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit)
            
            docs = query.stream()
            
            analyses = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                # Convert timestamp to string if it exists
                if 'created_at' in data and data['created_at']:
                    data['timestamp'] = data.get('timestamp', data['created_at'].isoformat() if hasattr(data['created_at'], 'isoformat') else str(data['created_at']))
                analyses.append(data)
            
            return analyses
            
        except Exception as e:
            # If query fails (e.g., no index), fall back to simple query without ordering
            print(f"Query with ordering failed: {str(e)}. Falling back to simple query.")
            try:
                analyses_ref = self.db.collection(self.collection)
                query = analyses_ref.where(filter=firestore.FieldFilter('user_id', '==', user_id)).limit(limit)
                
                docs = query.stream()
                
                analyses = []
                for doc in docs:
                    data = doc.to_dict()
                    data['id'] = doc.id
                    if 'created_at' in data and data['created_at']:
                        data['timestamp'] = data.get('timestamp', data['created_at'].isoformat() if hasattr(data['created_at'], 'isoformat') else str(data['created_at']))
                    analyses.append(data)
                
                # Sort in Python instead
                analyses.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
                return analyses
            except Exception as e2:
                raise Exception(f"Failed to fetch analyses: {str(e2)}")
    
    def get_analysis_by_id(self, analysis_id: str) -> Optional[Dict]:
        """
        Get a specific analysis by ID
        """
        try:
            doc_ref = self.db.collection(self.collection).document(analysis_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                return data
            else:
                return None
                
        except Exception as e:
            raise Exception(f"Failed to fetch analysis: {str(e)}")
    
    def delete_analysis(self, analysis_id: str, user_id: str) -> bool:
        """
        Delete an analysis (only if it belongs to the user)
        """
        try:
            doc_ref = self.db.collection(self.collection).document(analysis_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                if data.get('user_id') == user_id:
                    doc_ref.delete()
                    return True
                else:
                    raise Exception("Unauthorized to delete this analysis")
            else:
                raise Exception("Analysis not found")
                
        except Exception as e:
            raise Exception(f"Failed to delete analysis: {str(e)}")
