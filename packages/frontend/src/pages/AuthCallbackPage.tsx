import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Bot } from 'lucide-react';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (data.session) {
          const user = data.session.user;

          // Check if this is a new user (account created within last 2 minutes)
          const createdAt = new Date(user.created_at);
          const now = new Date();
          const timeDiff = (now.getTime() - createdAt.getTime()) / 1000; // seconds

          const isNewUser = timeDiff < 120; // Less than 2 minutes old = new user

          if (isNewUser) {
            // New user - redirect to onboarding/signup flow
            navigate('/signup');
          } else {
            // Existing user - go to their dashboard
            navigate('/dashboard');
          }
        } else {
          // No session, redirect to login
          navigate('/login');
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');

        // Redirect to login after error
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-4">
            <Bot className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">Authentication Error</h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <p className="text-sm text-gray-500 text-center">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center gradient-bg">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center mb-4">
          <Bot className="w-10 h-10 text-primary-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Signing you in...</h2>
        <p className="text-gray-600 text-center">Please wait while we complete authentication.</p>

        <div className="mt-8 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    </div>
  );
}
