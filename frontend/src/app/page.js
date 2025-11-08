'use client';

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Loader from '../components/Loader';
import { useRouter } from 'next/navigation';
import { BackgroundBeams } from '../components/ui/background-beams';
import { Instrument_Serif } from "next/font/google";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"], // or "700" if you need bold
  style: ["normal", "italic"], // optional
  variable: "--font-instrument-serif", // optional: if you use CSS variables
  display: "swap",
});


export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleGetStarted = () => {
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader size="xlarge" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800/50 backdrop-blur-sm bg-[#0a0a0f]/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-white tracking-tight">FactFlow</h1>
            <button
              onClick={handleGetStarted}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Beams */}
        <BackgroundBeams className="absolute inset-0 z-0" />
        
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-24 sm:py-32 relative z-10">
          <div className="text-center">
            <h2 className={`text-6xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight ${instrumentSerif.className}`}>
              Truth Detection&nbsp;
            
              <span className="text-purple-500">Powered by AI</span>
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-400">
              Cut through misinformation with advanced AI analysis. Verify news authenticity instantly and protect yourself from fake content.
            </p>
            <div className="mt-12 flex gap-4 justify-center">
              <button
                onClick={handleGetStarted}
                className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded transition-all"
              >
                Get Started
              </button>
              <button
                className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded border border-gray-700 transition-all"
              >
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>

      <main>

        {/* Features Section */}
        <div className="py-20 border-t border-gray-800/50">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="p-6 bg-white/5 border border-gray-800 rounded-lg hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Instant Analysis</h4>
                <p className="text-gray-400 text-sm">
                  Get real-time credibility scores and detailed breakdowns in seconds.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 bg-white/5 border border-gray-800 rounded-lg hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">AI-Powered</h4>
                <p className="text-gray-400 text-sm">
                  Advanced machine learning models trained on millions of articles.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 bg-white/5 border border-gray-800 rounded-lg hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">Secure</h4>
                <p className="text-gray-400 text-sm">
                  Your data is encrypted and never shared with third parties.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-20 border-t border-gray-800/50">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
            <h3 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Start Verifying News Today
            </h3>
            <p className="text-lg text-gray-400 mb-8">
              Join users fighting misinformation with AI-powered fact checking.
            </p>
            <button
              onClick={handleGetStarted}
              className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded transition-all"
            >
              Get Started Free
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-800/50 py-12">
          <div className="max-w-6xl mx-auto px-6 lg:px-8">
            <div className="text-center">
              <h4 className="text-lg font-bold text-white mb-2">FactFlow</h4>
              <p className="text-gray-500 text-sm mb-6">
                AI-driven truth verification
              </p>
              <p className="text-gray-600 text-xs">
                © 2024 FactFlow. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
