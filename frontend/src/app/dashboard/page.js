'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import Loader from '../../components/Loader';
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
      const response = await fetch('http://127.0.0.1:8000/api/community/share', {
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
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'Needs Verification':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      default:
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0a0a0f]">
        <header className="bg-black/40 border-b border-gray-800/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo - Extreme Left */}
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold text-white">
                  FactFlow
                </h1>
              </div>

              {/* Navigation - Center */}
              <nav className="absolute left-1/2 transform -translate-x-1/2 flex space-x-2">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 rounded transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/community')}
                  className="px-5 py-2 text-sm font-semibold text-gray-300 hover:bg-white/10 rounded transition-colors"
                >
                  Community
                </button>
              </nav>
              
              {/* Profile & Sign Out - Extreme Right */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  {user?.photoURL && (
                    <img
                      src={user.photoURL}
                      alt="Profile"
                      className="h-8 w-8 rounded-full border-2 border-purple-500/30"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-300">
                    {user?.displayName || user?.email}
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10 rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-4rem)]">
          {/* Left Sidebar - Recent News */}
          <aside className="w-100 bg-black/20 border-r border-gray-800/50 overflow-y-auto">
            <div className="sticky top-0 bg-purple-600 px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-base font-bold text-white">Recent Analyses</h3>
                  </div>
                </div>
                {isViewingHistory && (
                  <button
                    onClick={handleBackToFresh}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded transition-all"
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
                    className="group bg-white/5 rounded-lg p-4 border border-gray-800 hover:border-purple-500/50 hover:bg-white/10 transition-all cursor-pointer"
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
                      <h4 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-purple-400 transition-colors">
                        {item.title || 'Untitled Article'}
                      </h4>
                      
                      {/* URL */}
                      <div className="flex items-start space-x-2">
                        <svg className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <p className="text-xs text-gray-400 line-clamp-1 flex-1">{item.url}</p>
                      </div>
                      
                      {/* Credibility Badge and Date */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${getCredibilityColor(item.credibility)}`}>
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {item.credibility === 'Likely Credible' ? 'Credible' : item.credibility === 'Needs Verification' ? 'Verify' : 'Check'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <div className="bg-white/5 rounded-lg p-8 border border-gray-800">
                    <svg className="mx-auto h-16 w-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                    <p className="mt-4 text-sm font-semibold text-gray-300">No analyses yet</p>
                    <p className="text-xs text-gray-500 mt-2">Start by analyzing your first news article</p>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-[#0a0a0f]">
            <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
              {/* Hero Section */}
              <div className="text-center mb-12">
                <h2 className="text-4xl font-bold text-white mb-4">
                  AI-Powered Truth Verification
                </h2>
                <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                  Analyze news articles instantly with advanced AI
                </p>
              </div>

              {/* Floating Input Card */}
              <div className="relative mb-8">
                <div className="bg-white/5 backdrop-blur-sm border border-gray-800 rounded-lg p-6">
                  <div className="relative">
                    <input
                      type="url"
                      value={newsUrl}
                      onChange={(e) => setNewsUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !loading && newsUrl.trim() && handleAnalyze()}
                      className="w-full px-6 py-4 pr-16 bg-black/40 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder:text-gray-500 transition-all"
                      placeholder="Paste news article URL here..."
                      disabled={loading}
                    />
                    <button
                      onClick={handleAnalyze}
                      disabled={loading || !newsUrl.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all"
                      title="Analyze"
                    >
                      {loading ? (
                        <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-red-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-medium text-red-400">{error}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="bg-white/5 border border-gray-800 rounded-lg p-12 text-center">
                  <Loader size="large" />
                  <h3 className="text-xl font-semibold text-white mb-2 mt-6">Analyzing Article...</h3>
                  <p className="text-gray-400">Our AI is processing the content and verifying credibility</p>
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
                  <div className="bg-white/5 backdrop-blur-lg border border-gray-800 rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-purple-600 px-8 py-5">
                      <h3 className="text-xl font-bold text-white flex items-center">
                        <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Analysis Results
                      </h3>
                    </div>

                    <div className="p-8 space-y-6">
                      {/* Article Title */}
                      {result.title && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Article Title</h4>
                          <p className="text-xl font-semibold text-white leading-relaxed">{result.title}</p>
                        </div>
                      )}

                      {/* Credibility Badge */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Credibility Assessment</h4>
                        <div className={`inline-flex items-center px-6 py-3 rounded-lg border ${getCredibilityColor(result.credibility)}`}>
                          <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-lg font-bold">{result.credibility}</span>
                        </div>
                      </div>

                      {/* Verdict */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">AI Verdict</h4>
                        <div className="bg-purple-500/10 p-6 rounded-lg border border-purple-500/30">
                          <p className="text-gray-200 leading-relaxed">{result.verdict}</p>
                        </div>
                      </div>

                      {/* Summary */}
                      {result.summary && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Summary</h4>
                          <div className="bg-black/40 p-6 rounded-lg border border-gray-800">
                            <p className="text-gray-300 leading-relaxed">{result.summary}</p>
                          </div>
                        </div>
                      )}

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-purple-500/10 p-6 rounded-lg border border-purple-500/30">
                          <p className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-2">Classification</p>
                          <p className="text-2xl font-bold text-white">{result.sentiment}</p>
                        </div>
                        <div className="bg-green-500/10 p-6 rounded-lg border border-green-500/30">
                          <p className="text-sm font-semibold text-green-400 uppercase tracking-wide mb-2">Confidence</p>
                          <p className="text-2xl font-bold text-white">{result.confidence}%</p>
                        </div>
                      </div>

                      {/* Cross-Check Button */}
                      {result.cross_check && (result.cross_check.support_sources?.length > 0 || result.cross_check.contradict_sources?.length > 0) && (
                        <div>
                          <button
                            onClick={() => setShowCrossCheckModal(true)}
                            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-semibold"
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
                        <div className="pt-4 border-t border-gray-800">
                          <button
                            onClick={handleShareToCommunity}
                            disabled={shareLoading}
                            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-all font-semibold"
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
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowCrossCheckModal(false)}>
            <div className="bg-[#0a0a0f] border border-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-purple-600 px-6 py-4 flex items-center justify-between rounded-t-lg">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cross-Check Sources
                </h3>
                <button
                  onClick={() => setShowCrossCheckModal(false)}
                  className="text-white hover:bg-white/20 rounded p-2 transition-colors"
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
                    <h4 className="text-lg font-bold text-green-400 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Supporting Sources ({result.cross_check.support_sources.length})
                    </h4>
                    <div className="space-y-3">
                      {result.cross_check.support_sources.map((source, index) => (
                        <div key={index} className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 hover:bg-green-500/20 transition-colors">
                          <h5 className="font-semibold text-white mb-2">{source.title}</h5>
                          <p className="text-sm text-gray-300 mb-3">{source.snippet}</p>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-green-400 hover:text-green-300 font-medium"
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
                    <h4 className="text-lg font-bold text-red-400 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Contradicting Sources ({result.cross_check.contradict_sources.length})
                    </h4>
                    <div className="space-y-3">
                      {result.cross_check.contradict_sources.map((source, index) => (
                        <div key={index} className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 hover:bg-red-500/20 transition-colors">
                          <h5 className="font-semibold text-white mb-2">{source.title}</h5>
                          <p className="text-sm text-gray-300 mb-3">{source.snippet}</p>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-red-400 hover:text-red-300 font-medium"
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
                    <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="mt-2 text-gray-400">No cross-check sources available</p>
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
