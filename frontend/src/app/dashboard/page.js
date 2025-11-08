'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [newsUrl, setNewsUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [showCrossCheckModal, setShowCrossCheckModal] = useState(false);
  const resultRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    try {
      const token = await user.getIdToken();
      const response = await fetch('http://127.0.0.1:8000/api/news/history?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHistory(data.analyses || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!newsUrl.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setShowResult(false);
    setIsViewingHistory(false);

    try {
      const token = await user.getIdToken();
      const response = await fetch('http://127.0.0.1:8000/api/news/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ url: newsUrl })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data);
        setTimeout(() => {
          setShowResult(true);
          if (resultRef.current) {
            resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
        fetchHistory();
      } else {
        setError(data.detail || data.error || 'Failed to analyze news');
      }
    } catch (error) {
      setError('An error occurred while analyzing the news. Please try again.');
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToFresh = () => {
    setNewsUrl('');
    setResult(null);
    setShowResult(false);
    setError('');
    setIsViewingHistory(false);
  };

  const handleShareToCommunity = async () => {
    if (!result || !result.id) {
      alert('No analysis to share');
      return;
    }

    try {
      setShareLoading(true);
      const token = await user.getIdToken();
      const response = await fetch('http://localhost:8000/api/community/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ analysis_id: result.id })
      });

      if (response.ok) {
        const data = await response.json();
        alert('Successfully shared to community!');
        // Redirect to community page after a short delay
        setTimeout(() => {
          router.push('/community');
        }, 1000);
      } else {
        const data = await response.json();
        alert(data.detail || 'Failed to share to community');
      }
    } catch (error) {
      console.error('Failed to share:', error);
      alert('An error occurred while sharing');
    } finally {
      setShareLoading(false);
    }
  };

  const getCredibilityColor = (credibility) => {
    switch (credibility) {
      case 'Likely Credible':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Needs Verification':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <h1 className="text-2xl font-bold text-gray-900">
                  Fake News Detector
                </h1>
                <nav className="flex space-x-4">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => router.push('/community')}
                    className="px-4 py-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
                  >
                    Community
                  </button>
                </nav>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  {user?.photoURL && (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {user?.displayName || user?.email}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-4rem)]">
          {/* Left Sidebar - Recent News */}
          <aside className="w-80 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 overflow-y-auto shadow-lg">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 z-10 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-bold text-white">Recent News</h3>
                    <p className="text-xs text-blue-100">Click to view analysis</p>
                  </div>
                </div>
                {isViewingHistory && (
                  <button
                    onClick={handleBackToFresh}
                    className="flex items-center space-x-1 px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
                    title="Back to fresh input"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-xs font-semibold">Back</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-3 space-y-3">
              {history.length > 0 ? (
                history.map((item, index) => (
                  <div 
                    key={index} 
                    className="group bg-white rounded-xl p-4 border border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                    onClick={() => {
                      setNewsUrl(item.url);
                      setResult({
                        title: item.title,
                        credibility: item.credibility,
                        verdict: item.verdict,
                        summary: item.summary,
                        sentiment: item.sentiment,
                        confidence: item.confidence,
                        cross_check: item.cross_check
                      });
                      setShowResult(true);
                      setIsViewingHistory(true);
                      setError('');
                      // Scroll to top of main content
                      setTimeout(() => {
                        if (resultRef.current) {
                          resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 100);
                    }}
                  >
                    <div className="space-y-3">
                      {/* Title */}
                      <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {item.title || 'Untitled Article'}
                      </h4>
                      
                      {/* URL */}
                      <div className="flex items-start space-x-2">
                        <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <p className="text-xs text-gray-700 line-clamp-1 flex-1 font-medium">{item.url}</p>
                      </div>
                      
                      {/* Credibility Badge and Date */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getCredibilityColor(item.credibility)} shadow-sm`}>
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {item.credibility === 'Likely Credible' ? 'Credible' : item.credibility === 'Needs Verification' ? 'Verify' : 'Check'}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    
                    {/* Hover indicator */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
                    <svg className="mx-auto h-16 w-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <p className="mt-4 text-sm font-semibold text-gray-700">No analyses yet</p>
                    <p className="text-xs text-gray-500 mt-2">Start by analyzing your first news article</p>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
            <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
              {/* Hero Section */}
              <div className="text-center mb-12 animate-fade-in">
                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4">
                  AI-Powered News Verification
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Analyze news articles instantly with advanced AI to detect misinformation and verify credibility
                </p>
              </div>

              {/* Floating Input Card */}
              <div className="relative mb-8">
                <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 p-8 transform transition-all duration-300">
                  <div className="relative">
                    <input
                      type="url"
                      value={newsUrl}
                      onChange={(e) => setNewsUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !loading && newsUrl.trim() && handleAnalyze()}
                      className="w-full px-6 py-5 pr-16 text-gray-800 text-lg border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-gray-400 transition-all duration-300"
                      placeholder="Paste news article URL here..."
                      disabled={loading}
                    />
                    <button
                      onClick={handleAnalyze}
                      disabled={loading || !newsUrl.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg"
                      title="Analyze"
                    >
                      {loading ? (
                        <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {error && (
                    <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-slide-down">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-medium text-red-800">{error}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl p-12 text-center animate-pulse-slow">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full mb-4">
                    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Analyzing Article...</h3>
                  <p className="text-gray-600">Our AI is processing the content and verifying credibility</p>
                </div>
              )}

              {/* Results Section */}
              {result && (
                <div 
                  ref={resultRef}
                  className={`transform transition-all duration-700 ${
                    showResult 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-8'
                  }`}
                >
                  <div className="bg-white/80 backdrop-blur-lg shadow-xl rounded-2xl overflow-hidden border border-gray-200/50">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                      <h3 className="text-2xl font-bold text-white flex items-center">
                        <svg className="w-7 h-7 mr-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Analysis Results
                      </h3>
                    </div>

                    <div className="p-8 space-y-6">
                      {/* Article Title */}
                      {result.title && (
                        <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Article Title</h4>
                          <p className="text-xl font-semibold text-gray-900 leading-relaxed">{result.title}</p>
                        </div>
                      )}

                      {/* Credibility Badge */}
                      <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Credibility Assessment</h4>
                        <div className={`inline-flex items-center px-6 py-4 rounded-xl border-2 ${getCredibilityColor(result.credibility)} transform transition-all duration-300 hover:scale-105 shadow-lg`}>
                          <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-lg font-bold">{result.credibility}</span>
                        </div>
                      </div>

                      {/* Verdict */}
                      <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">AI Verdict</h4>
                        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
                          <p className="text-gray-800 leading-relaxed text-lg">{result.verdict}</p>
                        </div>
                      </div>

                      {/* Summary */}
                      {result.summary && (
                        <div className="animate-slide-up" style={{ animationDelay: '400ms' }}>
                          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Summary</h4>
                          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-gray-700 leading-relaxed">{result.summary}</p>
                          </div>
                        </div>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: '500ms' }}>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 transform transition-all duration-300 hover:scale-101 hover:shadow-lg">
                          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Classification</p>
                          <p className="text-2xl font-bold text-gray-900">{result.sentiment}</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 transform transition-all duration-300 hover:scale-101 hover:shadow-lg">
                          <p className="text-sm font-semibold text-green-600 uppercase tracking-wide mb-2">Confidence</p>
                          <p className="text-2xl font-bold text-gray-900">{result.confidence}%</p>
                        </div>
                      </div>

                      {/* Cross-Check Button */}
                      {result.cross_check && (result.cross_check.support_sources?.length > 0 || result.cross_check.contradict_sources?.length > 0) && (
                        <div className="animate-slide-up" style={{ animationDelay: '550ms' }}>
                          <button
                            onClick={() => setShowCrossCheckModal(true)}
                            className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] shadow-lg font-semibold"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>View Cross-Check Sources ({(result.cross_check.support_sources?.length || 0) + (result.cross_check.contradict_sources?.length || 0)})</span>
                          </button>
                        </div>
                      )}

                      {/* Share to Community Button */}
                      {!isViewingHistory && result.id && (
                        <div className="animate-slide-up pt-4 border-t border-gray-200" style={{ animationDelay: '600ms' }}>
                          <button
                            onClick={handleShareToCommunity}
                            disabled={shareLoading}
                            className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] shadow-lg font-semibold"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span>{shareLoading ? 'Sharing...' : 'Share to Community'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Cross-Check Modal */}
        {showCrossCheckModal && result?.cross_check && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowCrossCheckModal(false)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cross-Check Sources
                </h3>
                <button
                  onClick={() => setShowCrossCheckModal(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Supporting Sources */}
                {result.cross_check.support_sources && result.cross_check.support_sources.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-green-600 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Supporting Sources ({result.cross_check.support_sources.length})
                    </h4>
                    <div className="space-y-3">
                      {result.cross_check.support_sources.map((source, index) => (
                        <div key={index} className="bg-green-50 border border-green-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                          <h5 className="font-semibold text-gray-900 mb-2">{source.title}</h5>
                          <p className="text-sm text-gray-700 mb-3">{source.snippet}</p>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-green-600 hover:text-green-700 font-medium"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Read Full Article
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contradicting Sources */}
                {result.cross_check.contradict_sources && result.cross_check.contradict_sources.length > 0 && (
                  <div>
                    <h4 className="text-lg font-bold text-red-600 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Contradicting Sources ({result.cross_check.contradict_sources.length})
                    </h4>
                    <div className="space-y-3">
                      {result.cross_check.contradict_sources.map((source, index) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                          <h5 className="font-semibold text-gray-900 mb-2">{source.title}</h5>
                          <p className="text-sm text-gray-700 mb-3">{source.snippet}</p>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-red-600 hover:text-red-700 font-medium"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Read Full Article
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No sources found */}
                {(!result.cross_check.support_sources || result.cross_check.support_sources.length === 0) &&
                 (!result.cross_check.contradict_sources || result.cross_check.contradict_sources.length === 0) && (
                  <div className="text-center py-8">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2 text-gray-600">No cross-check sources available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
