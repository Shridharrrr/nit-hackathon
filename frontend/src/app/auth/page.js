'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../../components/Loader';
import { useRouter } from 'next/navigation';
import { WavyBackground } from '../../components/ui/wavy-background';

export default function AuthPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
      alert('Sign in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader size="xlarge" />
      </div>
    );
  }

  return (
    <WavyBackground
      colors={["#8b5cf6", "#a78bfa", "#6d28d9", "#7c3aed", "#9333ea"]}
      backgroundFill="#0a0a0f"
      blur={10}
      speed="slow"
      waveOpacity={0.3}
      containerClassName="min-h-screen"
      className="w-full max-w-md px-4"
    >
      <div className="w-full">
        <div className="bg-black/40 border border-purple-500/20 rounded-lg p-8 backdrop-blur-md shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">
              FactFlow
            </h1>
            <p className="text-gray-200 text-sm drop-shadow">
              Sign in to start verifying news
            </p>
          </div>

          <div>
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center px-4 py-3.5 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isSigningIn ? (
                <div className="flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-purple-600 animate-spin"></div>
                </div>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-gray-300 drop-shadow">
              By signing in, you agree to our Terms and Privacy Policy
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-300 drop-shadow">
            Secure authentication powered by Firebase
          </p>
        </div>
      </div>
    </WavyBackground>
  );
}
