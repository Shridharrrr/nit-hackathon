'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [newsUrl, setNewsUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

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
      const response = await fetch('http://localhost:8000/api/news/history?limit=5', {
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

    try {
      const token = await user.getIdToken();
      const response = await fetch('http://localhost:8000/api/news/analyze', {
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
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  Fake News Detector
                </h1>
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

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to your Dashboard
              </h2>
              <p className="text-lg text-gray-600">
                Start detecting fake news with our advanced AI-powered system
              </p>
            </div>

            <div className="bg-white shadow-lg rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Analyze News Article</h3>
                <p className="text-sm text-gray-500">Paste a news URL to check its authenticity</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="news-url" className="block text-sm font-medium text-gray-700 mb-2">
                      News Article URL
                    </label>
                    <input
                      id="news-url"
                      type="url"
                      value={newsUrl}
                      onChange={(e) => setNewsUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                      placeholder="https://example.com/news-article"
                      disabled={loading}
                    />
                  </div>
                  
                  <button
                    onClick={handleAnalyze}
                    disabled={loading || !newsUrl.trim()}
                    className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Analyze News
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex">
                        <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="ml-3 text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  )}

                  {result && (
                    <div className="mt-6 space-y-4">
                      <div className="border-t pt-4">
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Analysis Results</h4>
                        
                        {result.title && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-1">Article Title</h5>
                            <p className="text-gray-900">{result.title}</p>
                          </div>
                        )}

                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Credibility Assessment</h5>
                          <div className={`p-3 rounded-md border ${getCredibilityColor(result.credibility)}`}>
                            <p className="font-semibold">{result.credibility}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-700 mb-2">Verdict</h5>
                          <p className="text-gray-800 leading-relaxed">{result.verdict}</p>
                        </div>

                        {result.summary && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Summary</h5>
                            <p className="text-gray-800 leading-relaxed">{result.summary}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-600 mb-1">Classification</p>
                            <p className="font-medium text-gray-900">{result.sentiment}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-xs text-gray-600 mb-1">Confidence</p>
                            <p className="font-medium text-gray-900">{result.confidence}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {history.length > 0 && (
              <div className="mt-8 bg-white shadow-lg rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent Analyses</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {history.map((item, index) => (
                    <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900 mb-1">{item.title || 'Untitled'}</h4>
                          <p className="text-xs text-gray-500 mb-2">{item.url}</p>
                          <span className={`inline-block px-2 py-1 text-xs rounded ${getCredibilityColor(item.credibility)}`}>
                            {item.credibility}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
