import requests
from bs4 import BeautifulSoup
import google.generativeai as genai
import os
from typing import Dict, Optional
import re
from dotenv import load_dotenv

load_dotenv()

# Try to import transformers for local model inference
try:
    from transformers import pipeline
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False

class NewsAnalyzer:
    def __init__(self):
        # Initialize Gemini
        gemini_api_key = os.getenv("GEMINI_API_KEY","AIzaSyBm-IGEvqdOB5QHdo0X-29XLDhFkkek_gw")
        if gemini_api_key:
            genai.configure(api_key=gemini_api_key)
            self.gemini_model = genai.GenerativeModel('gemini-2.0-flash')
        else:
            self.gemini_model = None
            
        # Initialize HuggingFace model locally
        self.classifier = None
        if TRANSFORMERS_AVAILABLE:
            try:
                self.classifier = pipeline(
                    "text-classification",
                    model="mrm8488/bert-tiny-finetuned-fake-news-detection",
                    device=-1  # Use CPU
                )
            except Exception as e:
                self.classifier = None
    
    def scrape_url(self, url: str) -> Dict[str, str]:
        """
        Scrape content from a news URL
        Returns dict with title, content, and url
        """
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'lxml')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            # Try to find title
            title = ""
            if soup.find('h1'):
                title = soup.find('h1').get_text().strip()
            elif soup.find('title'):
                title = soup.find('title').get_text().strip()
            
            # Try to find main content
            content = ""
            
            # Look for article tags
            article = soup.find('article')
            if article:
                paragraphs = article.find_all('p')
                content = ' '.join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
            
            # If no article tag, look for main content area
            if not content:
                main = soup.find('main') or soup.find('div', class_=re.compile(r'content|article|post', re.I))
                if main:
                    paragraphs = main.find_all('p')
                    content = ' '.join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
            
            # Fallback: get all paragraphs
            if not content:
                paragraphs = soup.find_all('p')
                content = ' '.join([p.get_text().strip() for p in paragraphs if p.get_text().strip()])
            
            # Clean up content
            content = re.sub(r'\s+', ' ', content).strip()
            
            if not content:
                raise Exception("Could not extract content from URL")
            
            return {
                "title": title,
                "content": content[:5000],  # Limit content length
                "url": url
            }
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to fetch URL: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to scrape content: {str(e)}")
    
    def generate_summary(self, content: str) -> str:
        """
        Generate a summary using Gemini API with fallback to basic extraction
        """
        try:
            if not self.gemini_model:
                return self._fallback_summary(content)
            
            prompt = f"""Summarize the following news article in 3-4 concise sentences. Focus on the main facts and key points:

{content}

Summary:"""
            
            response = self.gemini_model.generate_content(prompt)
            summary = response.text.strip()
            
            return summary
            
        except Exception as e:
            # If Gemini fails (quota, rate limit, etc.), use fallback
            return self._fallback_summary(content)
    
    def _fallback_summary(self, content: str) -> str:
        """
        Fallback method to create a basic summary when Gemini API is unavailable
        """
        # Split into sentences
        sentences = content.replace('!', '.').replace('?', '.').split('.')
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
        
        # Take first 3-4 sentences as summary
        summary_sentences = sentences[:4] if len(sentences) >= 4 else sentences[:3]
        summary = '. '.join(summary_sentences)
        
        if summary and not summary.endswith('.'):
            summary += '.'
        
        return summary if summary else "Unable to generate summary. Please read the full article."
    
    def analyze_sentiment(self, content: str) -> Dict[str, str]:
        """
        Analyze credibility and detect fake news using local HuggingFace model
        Uses mrm8488/bert-tiny-finetuned-fake-news-detection model
        Returns verdict in max 2 lines
        """
        # If classifier is not available, use fallback
        if not self.classifier:
            return self._fallback_sentiment_analysis(content)
        
        try:
            # Truncate content if too long (BERT models have token limits)
            # Take first 400 characters for better performance
            analysis_content = content[:400].strip()
            
            if not analysis_content:
                raise Exception("No content to analyze")
            
            # Use local fake news detection model
            result = self.classifier(analysis_content)
            
            # Get label and confidence
            # This model returns LABEL_0 (REAL) or LABEL_1 (FAKE)
            if not result or len(result) == 0:
                raise Exception("Empty result from model")
            
            label = result[0]['label']
            confidence = result[0]['score']
            
            # Map labels to our format
            if label == "LABEL_0":  # REAL news
                if confidence > 0.8:
                    verdict = "High confidence this is real news. Content appears credible and fact-based."
                    credibility = "Likely Credible"
                elif confidence > 0.6:
                    verdict = "Moderate confidence this is real news. Cross-check with other sources for verification."
                    credibility = "Likely Credible"
                else:
                    verdict = "Low confidence assessment. Verify claims with multiple trusted sources before sharing."
                    credibility = "Neutral"
            else:  # LABEL_1 - FAKE news
                if confidence > 0.8:
                    verdict = "High confidence this may be fake news. Exercise extreme caution and verify from trusted sources."
                    credibility = "Needs Verification"
                elif confidence > 0.6:
                    verdict = "Moderate confidence this may contain misinformation. Verify facts before sharing."
                    credibility = "Needs Verification"
                else:
                    verdict = "Uncertain classification. Always verify important claims with established news sources."
                    credibility = "Neutral"
            
            # Normalize confidence to 0-100 range
            normalized_confidence = min(100.0, max(0.0, round(confidence * 100, 2)))
            
            return {
                "verdict": verdict,
                "confidence": normalized_confidence
            }
            
        except Exception as e:
            # Use fallback analysis if model fails
            return self._fallback_sentiment_analysis(content)
    
    def is_url(self, input_string: str) -> bool:
        """
        Check if the input string is a URL
        """
        url_pattern = re.compile(
            r'^https?://'
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'
            r'localhost|'
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
            r'(?::\d+)?'
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        return bool(url_pattern.match(input_string))
    
    def _fallback_sentiment_analysis(self, content: str) -> Dict[str, str]:
        """
        Fallback credibility analysis using basic keyword matching
        """
        content_lower = content.lower()
        
        # Positive indicators
        positive_words = ['excellent', 'great', 'good', 'positive', 'success', 'achievement', 
                         'breakthrough', 'innovative', 'improved', 'beneficial', 'effective']
        
        # Negative indicators
        negative_words = ['bad', 'terrible', 'negative', 'failure', 'crisis', 'disaster',
                         'dangerous', 'harmful', 'threat', 'concern', 'risk', 'problem']
        
        # Sensational/clickbait indicators
        sensational_words = ['shocking', 'unbelievable', 'you won\'t believe', 'secret', 
                           'they don\'t want you to know', 'miracle', 'exposed']
        
        # Count occurrences
        positive_count = sum(1 for word in positive_words if word in content_lower)
        negative_count = sum(1 for word in negative_words if word in content_lower)
        sensational_count = sum(1 for phrase in sensational_words if phrase in content_lower)
        
        # Calculate basic credibility
        total_words = len(content.split())
        
        if sensational_count > 2:
            confidence = 65.0
            verdict = "Article contains sensational language. Exercise caution and verify from trusted sources."
            credibility = "Needs Verification"
        elif positive_count > negative_count and positive_count > 3:
            confidence = 60.0 + min(positive_count * 2, 20)
            verdict = "Article shows credible tone. Content appears informative but always cross-check important facts."
            credibility = "Likely Credible"
        elif negative_count > positive_count and negative_count > 3:
            confidence = 60.0 + min(negative_count * 2, 20)
            verdict = "Article has concerning indicators. Verify claims with multiple reliable sources before sharing."
            credibility = "Needs Verification"
        else:
            confidence = 55.0
            verdict = "Article appears balanced. Always verify important claims with established news sources."
            credibility = "Neutral"
        
        # Normalize confidence to 0-100 range
        normalized_confidence = min(100.0, max(0.0, round(confidence, 2)))
        
        return {
            "verdict": verdict,
            "confidence": normalized_confidence
        }
    
    async def analyze_news(self, input_data: str) -> Dict:
        """
        Complete news analysis pipeline:
        1. Detect if input is URL or text
        2. If URL: Scrape content, generate summary
        3. If text: Use text directly, send to n8n
        4. Analyze credibility with HuggingFace
        5. Get cross-check from n8n webhook
        """
        try:
            # Step 1: Detect if input is URL or text
            is_url_input = self.is_url(input_data)
            
            if is_url_input:
                # Step 2a: Scrape URL content
                scraped_data = self.scrape_url(input_data)
                title = scraped_data['title']
                content = scraped_data['content']
                source_url = input_data
            else:
                # Step 2b: Use text directly
                content = input_data
                title = input_data[:100] + "..." if len(input_data) > 100 else input_data
                source_url = "custom_text"
            
            # Step 3: Generate summary
            summary = self.generate_summary(content)
            
            # Step 4: Analyze credibility
            analysis = self.analyze_sentiment(content)
            
            # Step 5: Get cross-check from n8n webhook
            # For text input, send the text directly to n8n
            cross_check_data = None
            try:
                from app.services.n8n_service import get_cross_check
                if is_url_input:
                    cross_check_data = await get_cross_check(title)
                else:
                    # Send text directly to n8n
                    cross_check_data = await get_cross_check(input_data)
            except Exception as e:
                cross_check_data = {
                    "support_sources": [],
                    "contradict_sources": [],
                    "error": str(e)
                }
            
            return {
                "success": True,
                "url": source_url,
                "title": title,
                "content": content,
                "summary": summary,
                "verdict": analysis['verdict'],
                "confidence": analysis['confidence'],
                "cross_check": cross_check_data
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
