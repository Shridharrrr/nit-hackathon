from firebase_admin import firestore
from datetime import datetime
from typing import Dict, Optional, List
from urllib.parse import urlparse


class DomainService:
    def __init__(self):
        self.db = firestore.client()
        self.domains_collection = 'domain_credibility'
    
    def extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc or parsed.path
            # Remove www. prefix
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain.lower()
        except Exception as e:
            print(f"Error extracting domain: {e}")
            return url.lower()
    
    def check_https(self, url: str) -> bool:
        """Check if URL uses HTTPS"""
        try:
            parsed = urlparse(url)
            return parsed.scheme == 'https'
        except:
            return False
    
    # Removed slow WHOIS age check - using only HTTPS, analysis, and community scores
    
    def calculate_analysis_score(self, supporting: int, contradicting: int) -> float:
        """
        Calculate analysis score based on cross-check results (-30 to +30 points)
        Each supporting source: +2 points (max +30)
        Each contradicting source: -3 points (max -30)
        """
        score = (supporting * 2) - (contradicting * 3)
        return max(-30.0, min(30.0, score))
    
    def calculate_community_score(self, upvotes: int, downvotes: int) -> float:
        """
        Calculate community score based on votes (-20 to +20 points)
        Each upvote: +1 point
        Each downvote: -1 point
        """
        net_votes = upvotes - downvotes
        return max(-20.0, min(20.0, float(net_votes)))
    
    def calculate_total_score(self, https_score: float, analysis_score: float, 
                            community_score: float) -> float:
        """
        Calculate total credibility score (0-100)
        Base: 50 points
        HTTPS: +10 points
        Analysis: -30 to +30 points
        Community: -20 to +20 points (1 point = 1% per vote)
        """
        total = 50.0 + https_score + analysis_score + community_score
        return max(0.0, min(100.0, total))
    
    def get_or_create_domain_score(self, url: str) -> Dict:
        """Get existing domain score or create new one"""
        domain = self.extract_domain(url)
        
        # Check if domain exists in database
        domain_ref = self.db.collection(self.domains_collection).document(domain)
        domain_doc = domain_ref.get()
        
        if domain_doc.exists:
            return domain_doc.to_dict()
        
        # Create new domain score (simplified - only HTTPS check)
        is_https = self.check_https(url)
        https_score = 10.0 if is_https else 0.0
        
        domain_data = {
            'domain': domain,
            'base_score': 50.0,
            'https_score': https_score,
            'analysis_score': 0.0,
            'community_score': 0.0,
            'total_score': 50.0 + https_score,
            'is_https': is_https,
            'total_analyses': 0,
            'supporting_count': 0,
            'contradicting_count': 0,
            'community_upvotes': 0,
            'community_downvotes': 0,
            'last_updated': datetime.utcnow().isoformat(),
            'created_at': firestore.SERVER_TIMESTAMP
        }
        
        domain_ref.set(domain_data)
        return domain_data
    
    def update_domain_from_analysis(self, url: str, supporting_sources: list, 
                                   contradicting_sources: list) -> Dict:
        """Update domain score based on analysis results"""
        domain = self.extract_domain(url)
        domain_ref = self.db.collection(self.domains_collection).document(domain)
        domain_doc = domain_ref.get()
        
        if not domain_doc.exists:
            # Create if doesn't exist
            domain_data = self.get_or_create_domain_score(url)
        else:
            domain_data = domain_doc.to_dict()
        
        # Update counts
        new_supporting = domain_data.get('supporting_count', 0) + len(supporting_sources)
        new_contradicting = domain_data.get('contradicting_count', 0) + len(contradicting_sources)
        new_total_analyses = domain_data.get('total_analyses', 0) + 1
        
        # Recalculate analysis score
        analysis_score = self.calculate_analysis_score(new_supporting, new_contradicting)
        
        # Recalculate total score
        total_score = self.calculate_total_score(
            domain_data.get('https_score', 0.0),
            analysis_score,
            domain_data.get('community_score', 0.0)
        )
        
        # Update database
        domain_ref.update({
            'supporting_count': new_supporting,
            'contradicting_count': new_contradicting,
            'total_analyses': new_total_analyses,
            'analysis_score': analysis_score,
            'total_score': total_score,
            'last_updated': datetime.utcnow().isoformat()
        })
        
        # Also update scores for source domains
        for source in supporting_sources:
            self._update_source_domain(source.get('url'), is_supporting=True)
        
        for source in contradicting_sources:
            self._update_source_domain(source.get('url'), is_supporting=False)
        
        domain_data.update({
            'supporting_count': new_supporting,
            'contradicting_count': new_contradicting,
            'total_analyses': new_total_analyses,
            'analysis_score': analysis_score,
            'total_score': total_score
        })
        
        return domain_data
    
    def _update_source_domain(self, url: str, is_supporting: bool):
        """Update credibility score for source domains"""
        if not url:
            return
        
        domain = self.extract_domain(url)
        domain_ref = self.db.collection(self.domains_collection).document(domain)
        domain_doc = domain_ref.get()
        
        if not domain_doc.exists:
            # Create new domain entry
            self.get_or_create_domain_score(url)
            domain_doc = domain_ref.get()
        
        domain_data = domain_doc.to_dict()
        
        # Update counts
        if is_supporting:
            new_supporting = domain_data.get('supporting_count', 0) + 1
            new_contradicting = domain_data.get('contradicting_count', 0)
        else:
            new_supporting = domain_data.get('supporting_count', 0)
            new_contradicting = domain_data.get('contradicting_count', 0) + 1
        
        # Recalculate scores
        analysis_score = self.calculate_analysis_score(new_supporting, new_contradicting)
        total_score = self.calculate_total_score(
            domain_data.get('https_score', 0.0),
            analysis_score,
            domain_data.get('community_score', 0.0)
        )
        
        # Update database
        domain_ref.update({
            'supporting_count': new_supporting,
            'contradicting_count': new_contradicting,
            'analysis_score': analysis_score,
            'total_score': total_score,
            'last_updated': datetime.utcnow().isoformat()
        })
    
    def update_domain_from_votes(self, url: str, vote_change: int) -> Dict:
        """
        Update domain score based on community votes
        vote_change: +1 for upvote, -1 for downvote
        """
        domain = self.extract_domain(url)
        domain_ref = self.db.collection(self.domains_collection).document(domain)
        domain_doc = domain_ref.get()
        
        if not domain_doc.exists:
            domain_data = self.get_or_create_domain_score(url)
        else:
            domain_data = domain_doc.to_dict()
        
        # Update vote counts
        if vote_change > 0:
            new_upvotes = domain_data.get('community_upvotes', 0) + 1
            new_downvotes = domain_data.get('community_downvotes', 0)
        else:
            new_upvotes = domain_data.get('community_upvotes', 0)
            new_downvotes = domain_data.get('community_downvotes', 0) + 1
        
        # Recalculate community score
        community_score = self.calculate_community_score(new_upvotes, new_downvotes)
        
        # Recalculate total score
        total_score = self.calculate_total_score(
            domain_data.get('https_score', 0.0),
            domain_data.get('analysis_score', 0.0),
            community_score
        )
        
        # Update database
        domain_ref.update({
            'community_upvotes': new_upvotes,
            'community_downvotes': new_downvotes,
            'community_score': community_score,
            'total_score': total_score,
            'last_updated': datetime.utcnow().isoformat()
        })
        
        domain_data.update({
            'community_upvotes': new_upvotes,
            'community_downvotes': new_downvotes,
            'community_score': community_score,
            'total_score': total_score
        })
        
        return domain_data
    
    def get_domain_credibility(self, url: str) -> Dict:
        """Get domain credibility with breakdown"""
        domain_data = self.get_or_create_domain_score(url)
        
        return {
            'domain': domain_data['domain'],
            'total_score': domain_data['total_score'],
            'breakdown': {
                'base_score': domain_data.get('base_score', 50.0),
                'https_score': domain_data.get('https_score', 0.0),
                'analysis_score': domain_data.get('analysis_score', 0.0),
                'community_score': domain_data.get('community_score', 0.0)
            },
            'metadata': {
                'is_https': domain_data.get('is_https', False),
                'total_analyses': domain_data.get('total_analyses', 0),
                'supporting_count': domain_data.get('supporting_count', 0),
                'contradicting_count': domain_data.get('contradicting_count', 0),
                'community_upvotes': domain_data.get('community_upvotes', 0),
                'community_downvotes': domain_data.get('community_downvotes', 0)
            }
        }
