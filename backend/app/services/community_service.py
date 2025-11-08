from firebase_admin import firestore
from datetime import datetime
from typing import Dict, List, Optional


class CommunityService:
    def __init__(self):
        self.db = firestore.client()
        self.posts_collection = 'community_posts'
        self.votes_collection = 'post_votes'
        self.comments_collection = 'post_comments'
        self.comment_votes_collection = 'comment_votes'
        self.analyses_collection = 'news_analyses'
        
        # Import domain service lazily to avoid circular imports
        from app.services.domain_service import DomainService
        self.domain_service = DomainService()
    
    def share_to_community(self, analysis_id: str, user_id: str, user_name: str = None, user_picture: str = None) -> str:
        """
        Share an analysis to the community
        Returns the community post ID
        """
        try:
            # Get the analysis
            analysis_ref = self.db.collection(self.analyses_collection).document(analysis_id)
            analysis_doc = analysis_ref.get()
            
            if not analysis_doc.exists:
                raise Exception("Analysis not found")
            
            analysis_data = analysis_doc.to_dict()
            
            # Check if user owns this analysis
            if analysis_data.get('user_id') != user_id:
                raise Exception("Unauthorized to share this analysis")
            
            # Check if already shared
            existing_posts = self.db.collection(self.posts_collection).where(
                filter=firestore.FieldFilter('analysis_id', '==', analysis_id)
            ).limit(1).stream()
            
            for post in existing_posts:
                return post.id  # Already shared, return existing post ID
            
            # Create community post
            post_data = {
                'analysis_id': analysis_id,
                'user_id': user_id,
                'user_name': user_name,
                'user_picture': user_picture,
                'url': analysis_data.get('url'),
                'title': analysis_data.get('title'),
                'summary': analysis_data.get('summary'),
                'verdict': analysis_data.get('verdict'),
                'credibility': analysis_data.get('credibility'),
                'sentiment': analysis_data.get('sentiment'),
                'confidence': analysis_data.get('confidence'),
                'cross_check': analysis_data.get('cross_check', {}),
                'domain_credibility': analysis_data.get('domain_credibility', 50.0),
                'upvotes': 0,
                'downvotes': 0,
                'comment_count': 0,
                'timestamp': datetime.utcnow().isoformat(),
                'created_at': firestore.SERVER_TIMESTAMP
            }
            
            doc_ref = self.db.collection(self.posts_collection).document()
            doc_ref.set(post_data)
            
            return doc_ref.id
            
        except Exception as e:
            raise Exception(f"Failed to share to community: {str(e)}")
    
    def get_community_posts(self, limit: int = 20, user_id: str = None) -> List[Dict]:
        """
        Get all community posts with vote information
        """
        try:
            posts_ref = self.db.collection(self.posts_collection)
            query = posts_ref.order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit)
            
            docs = query.stream()
            
            posts = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                
                # Convert Firestore timestamp to ISO string if needed
                if 'created_at' in data and data['created_at'] is not None:
                    if hasattr(data['created_at'], 'isoformat'):
                        data['created_at'] = data['created_at'].isoformat()
                    elif hasattr(data['created_at'], 'timestamp'):
                        from datetime import datetime
                        data['created_at'] = datetime.fromtimestamp(data['created_at'].timestamp()).isoformat()
                
                # Get user's vote if user_id provided
                if user_id:
                    user_vote = self._get_user_vote(doc.id, user_id)
                    data['user_vote'] = user_vote
                else:
                    data['user_vote'] = None
                
                posts.append(data)
            
            return posts
            
        except Exception as e:
            # Fallback without ordering
            print(f"Query with ordering failed: {str(e)}. Falling back to simple query.")
            try:
                posts_ref = self.db.collection(self.posts_collection)
                query = posts_ref.limit(limit)
                
                docs = query.stream()
                
                posts = []
                for doc in docs:
                    data = doc.to_dict()
                    data['id'] = doc.id
                    
                    # Convert Firestore timestamp to ISO string if needed
                    if 'created_at' in data and data['created_at'] is not None:
                        if hasattr(data['created_at'], 'isoformat'):
                            data['created_at'] = data['created_at'].isoformat()
                        elif hasattr(data['created_at'], 'timestamp'):
                            from datetime import datetime
                            data['created_at'] = datetime.fromtimestamp(data['created_at'].timestamp()).isoformat()
                    
                    if user_id:
                        user_vote = self._get_user_vote(doc.id, user_id)
                        data['user_vote'] = user_vote
                    else:
                        data['user_vote'] = None
                    
                    posts.append(data)
                
                # Sort in Python
                posts.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
                return posts
            except Exception as e2:
                # If all else fails, return empty list instead of raising error
                print(f"Failed to fetch community posts: {str(e2)}. Returning empty list.")
                return []
    
    def get_post_by_id(self, post_id: str, user_id: str = None) -> Optional[Dict]:
        """
        Get a specific community post by ID
        """
        try:
            doc_ref = self.db.collection(self.posts_collection).document(post_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                
                # Convert Firestore timestamp to ISO string if needed
                if 'created_at' in data and data['created_at'] is not None:
                    if hasattr(data['created_at'], 'isoformat'):
                        data['created_at'] = data['created_at'].isoformat()
                    elif hasattr(data['created_at'], 'timestamp'):
                        from datetime import datetime
                        data['created_at'] = datetime.fromtimestamp(data['created_at'].timestamp()).isoformat()
                
                # Get user's vote if user_id provided
                if user_id:
                    user_vote = self._get_user_vote(doc.id, user_id)
                    data['user_vote'] = user_vote
                else:
                    data['user_vote'] = None
                
                return data
            
            return None
            
        except Exception as e:
            print(f"Failed to fetch post: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
    
    def vote_post(self, post_id: str, user_id: str, vote_type: str) -> Dict:
        """
        Vote on a post (upvote or downvote)
        Returns updated vote counts
        """
        try:
            # Get existing vote
            vote_ref = self.db.collection(self.votes_collection).document(f"{post_id}_{user_id}")
            vote_doc = vote_ref.get()
            
            post_ref = self.db.collection(self.posts_collection).document(post_id)
            post_doc = post_ref.get()
            
            if not post_doc.exists:
                raise Exception("Post not found")
            
            post_data = post_doc.to_dict()
            upvotes = post_data.get('upvotes', 0)
            downvotes = post_data.get('downvotes', 0)
            old_upvotes = upvotes
            old_downvotes = downvotes
            post_url = post_data.get('url')
            
            vote_change = 0  # Track vote change for domain score update
            
            if vote_doc.exists:
                # User has already voted
                existing_vote = vote_doc.to_dict().get('vote_type')
                
                if existing_vote == vote_type:
                    # Remove vote
                    vote_ref.delete()
                    if vote_type == 'upvote':
                        upvotes = max(0, upvotes - 1)
                        vote_change = -1
                    else:
                        downvotes = max(0, downvotes - 1)
                        vote_change = 1
                else:
                    # Change vote
                    vote_ref.set({
                        'post_id': post_id,
                        'user_id': user_id,
                        'vote_type': vote_type,
                        'timestamp': datetime.utcnow().isoformat()
                    })
                    if vote_type == 'upvote':
                        upvotes += 1
                        downvotes = max(0, downvotes - 1)
                        vote_change = 2  # Changed from downvote to upvote
                    else:
                        downvotes += 1
                        upvotes = max(0, upvotes - 1)
                        vote_change = -2  # Changed from upvote to downvote
            else:
                # New vote
                vote_ref.set({
                    'post_id': post_id,
                    'user_id': user_id,
                    'vote_type': vote_type,
                    'timestamp': datetime.utcnow().isoformat()
                })
                if vote_type == 'upvote':
                    upvotes += 1
                    vote_change = 1
                else:
                    downvotes += 1
                    vote_change = -1
            
            # Update domain credibility based on votes (1% per vote)
            domain_score = None
            if post_url and vote_change != 0:
                try:
                    # Update domain score on every vote
                    updated_domain = self.domain_service.update_domain_from_votes(post_url, vote_change)
                    domain_score = updated_domain.get('total_score')
                    print(f"🔄 Domain score updated: {domain_score}")
                except Exception as e:
                    print(f"Failed to update domain score from votes: {e}")
            
            # Update post with new vote counts and domain score
            update_data = {
                'upvotes': upvotes,
                'downvotes': downvotes
            }
            if domain_score is not None:
                update_data['domain_credibility'] = domain_score
            
            post_ref.update(update_data)
            
            return {
                'upvotes': upvotes,
                'downvotes': downvotes,
                'user_vote': vote_type if vote_ref.get().exists else None,
                'domain_credibility': domain_score
            }
            
        except Exception as e:
            raise Exception(f"Failed to vote on post: {str(e)}")
    
    def add_comment(self, post_id: str, user_id: str, content: str, user_name: str = None, user_picture: str = None) -> str:
        """
        Add a comment to a post
        Returns the comment ID
        """
        try:
            # Check if post exists
            post_ref = self.db.collection(self.posts_collection).document(post_id)
            post_doc = post_ref.get()
            
            if not post_doc.exists:
                raise Exception("Post not found")
            
            # Create comment
            comment_data = {
                'post_id': post_id,
                'user_id': user_id,
                'user_name': user_name,
                'user_picture': user_picture,
                'content': content,
                'upvotes': 0,
                'downvotes': 0,
                'timestamp': datetime.utcnow().isoformat(),
                'created_at': firestore.SERVER_TIMESTAMP
            }
            
            doc_ref = self.db.collection(self.comments_collection).document()
            doc_ref.set(comment_data)
            
            # Update comment count
            post_data = post_doc.to_dict()
            comment_count = post_data.get('comment_count', 0) + 1
            post_ref.update({'comment_count': comment_count})
            
            return doc_ref.id
            
        except Exception as e:
            raise Exception(f"Failed to add comment: {str(e)}")
    
    def get_post_comments(self, post_id: str, user_id: str = None) -> List[Dict]:
        """
        Get all comments for a post
        """
        try:
            comments_ref = self.db.collection(self.comments_collection)
            query = comments_ref.where(filter=firestore.FieldFilter('post_id', '==', post_id)).order_by('created_at', direction=firestore.Query.ASCENDING)
            
            docs = query.stream()
            
            comments = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                
                # Convert Firestore timestamp to ISO string if needed
                if 'created_at' in data and data['created_at'] is not None:
                    if hasattr(data['created_at'], 'isoformat'):
                        data['created_at'] = data['created_at'].isoformat()
                    elif hasattr(data['created_at'], 'timestamp'):
                        from datetime import datetime
                        data['created_at'] = datetime.fromtimestamp(data['created_at'].timestamp()).isoformat()
                
                # Get user's vote if user_id provided
                if user_id:
                    user_vote = self._get_user_comment_vote(doc.id, user_id)
                    data['user_vote'] = user_vote
                else:
                    data['user_vote'] = None
                
                comments.append(data)
            
            return comments
            
        except Exception as e:
            # Fallback without ordering
            print(f"Query with ordering failed: {str(e)}. Falling back to simple query.")
            try:
                comments_ref = self.db.collection(self.comments_collection)
                query = comments_ref.where(filter=firestore.FieldFilter('post_id', '==', post_id))
                
                docs = query.stream()
                
                comments = []
                for doc in docs:
                    data = doc.to_dict()
                    data['id'] = doc.id
                    
                    # Convert Firestore timestamp to ISO string if needed
                    if 'created_at' in data and data['created_at'] is not None:
                        if hasattr(data['created_at'], 'isoformat'):
                            data['created_at'] = data['created_at'].isoformat()
                        elif hasattr(data['created_at'], 'timestamp'):
                            from datetime import datetime
                            data['created_at'] = datetime.fromtimestamp(data['created_at'].timestamp()).isoformat()
                    
                    if user_id:
                        user_vote = self._get_user_comment_vote(doc.id, user_id)
                        data['user_vote'] = user_vote
                    else:
                        data['user_vote'] = None
                    
                    comments.append(data)
                
                # Sort in Python
                comments.sort(key=lambda x: x.get('timestamp', ''))
                return comments
            except Exception as e2:
                # If all else fails, return empty list instead of raising error
                print(f"Failed to fetch comments: {str(e2)}. Returning empty list.")
                return []
    
    def vote_comment(self, comment_id: str, user_id: str, vote_type: str) -> Dict:
        """
        Vote on a comment (upvote or downvote)
        Returns updated vote counts
        """
        try:
            # Get existing vote
            vote_ref = self.db.collection(self.comment_votes_collection).document(f"{comment_id}_{user_id}")
            vote_doc = vote_ref.get()
            
            comment_ref = self.db.collection(self.comments_collection).document(comment_id)
            comment_doc = comment_ref.get()
            
            if not comment_doc.exists:
                raise Exception("Comment not found")
            
            comment_data = comment_doc.to_dict()
            upvotes = comment_data.get('upvotes', 0)
            downvotes = comment_data.get('downvotes', 0)
            
            if vote_doc.exists:
                # User has already voted
                existing_vote = vote_doc.to_dict().get('vote_type')
                
                if existing_vote == vote_type:
                    # Remove vote
                    vote_ref.delete()
                    if vote_type == 'upvote':
                        upvotes = max(0, upvotes - 1)
                    else:
                        downvotes = max(0, downvotes - 1)
                else:
                    # Change vote
                    vote_ref.set({
                        'comment_id': comment_id,
                        'user_id': user_id,
                        'vote_type': vote_type,
                        'timestamp': datetime.utcnow().isoformat()
                    })
                    if vote_type == 'upvote':
                        upvotes += 1
                        downvotes = max(0, downvotes - 1)
                    else:
                        downvotes += 1
                        upvotes = max(0, upvotes - 1)
            else:
                # New vote
                vote_ref.set({
                    'comment_id': comment_id,
                    'user_id': user_id,
                    'vote_type': vote_type,
                    'timestamp': datetime.utcnow().isoformat()
                })
                if vote_type == 'upvote':
                    upvotes += 1
                else:
                    downvotes += 1
            
            # Update comment
            comment_ref.update({
                'upvotes': upvotes,
                'downvotes': downvotes
            })
            
            return {
                'upvotes': upvotes,
                'downvotes': downvotes,
                'user_vote': vote_type if vote_ref.get().exists else None
            }
            
        except Exception as e:
            raise Exception(f"Failed to vote on comment: {str(e)}")
    
    def _get_user_vote(self, post_id: str, user_id: str) -> Optional[str]:
        """
        Get user's vote on a post
        """
        try:
            vote_ref = self.db.collection(self.votes_collection).document(f"{post_id}_{user_id}")
            vote_doc = vote_ref.get()
            
            if vote_doc.exists:
                return vote_doc.to_dict().get('vote_type')
            return None
        except:
            return None
    
    def _get_user_comment_vote(self, comment_id: str, user_id: str) -> Optional[str]:
        """
        Get user's vote on a comment
        """
        try:
            vote_ref = self.db.collection(self.comment_votes_collection).document(f"{comment_id}_{user_id}")
            vote_doc = vote_ref.get()
            
            if vote_doc.exists:
                return vote_doc.to_dict().get('vote_type')
            return None
        except:
            return None
