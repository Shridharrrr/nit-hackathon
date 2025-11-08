'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [newsText, setNewsText] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
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

        {/* Main Content */}
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

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow-lg rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Quick Check</h3>
                      <p className="text-sm text-gray-500">Verify news articles instantly</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow-lg rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
                      <p className="text-sm text-gray-500">View detection statistics</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow-lg rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">History</h3>
                      <p className="text-sm text-gray-500">Review past detections</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* News Analysis Section */}
            <div className="bg-white shadow-lg rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Analyze News Article</h3>
                <p className="text-sm text-gray-500">Paste a news article or URL to check its authenticity</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="news-input" className="block text-sm font-medium text-gray-700 mb-2">
                      News Article Text or URL
                    </label>
                    <textarea
                      id="news-input"
                      rows={6}
                      value={newsText}
                      onChange={(e) => setNewsText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500"
                      placeholder="Paste your news article text or URL here..."
                    />
                  </div>
                  
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
