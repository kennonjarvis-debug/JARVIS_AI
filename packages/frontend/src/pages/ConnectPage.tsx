import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Twitter, Mail, CheckCircle, ArrowRight, Loader, MessageSquare, FileText, Mic } from 'lucide-react';
import { api } from '../lib/api';

const OBSERVATORY_ID = 'd66d0922-a735-4ea5-bd70-daef059e392c'; // Your observatory ID

interface ConnectionForm {
  twitter: {
    api_key: string;
    api_secret: string;
    access_token: string;
    access_token_secret: string;
    account_name: string;
  };
}

export default function ConnectPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'welcome' | 'twitter' | 'success'>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ConnectionForm>({
    twitter: {
      api_key: '',
      api_secret: '',
      access_token: '',
      access_token_secret: '',
      account_name: '',
    },
  });

  const handleTwitterConnect = () => {
    // Redirect to OAuth flow
    const backendURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
    window.location.href = `${backendURL}/api/auth/twitter?observatory_id=${OBSERVATORY_ID}`;
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gold-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-600 to-gold-600 rounded-full mb-4">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Jarvis! 👋
            </h1>
            <p className="text-gray-600">
              Let's connect your accounts to get started. This takes less than 2 minutes.
            </p>
          </div>

          {/* Available Integrations */}
          <div className="space-y-3 mb-8">
            <IntegrationOption
              icon={<Twitter className="w-6 h-6" />}
              name="Twitter / X"
              description="Post tweets and monitor mentions"
              available
            />
            <IntegrationOption
              icon={<MessageSquare className="w-6 h-6" />}
              name="iMessage"
              description="Auto-respond to messages intelligently"
              available
            />
            <IntegrationOption
              icon={<FileText className="w-6 h-6" />}
              name="Notes"
              description="Create notes from emails & reminders"
              available
            />
            <IntegrationOption
              icon={<Mic className="w-6 h-6" />}
              name="Voice Memos"
              description="Transcribe & organize voice memos"
              available
            />
            <IntegrationOption
              icon={<Mail className="w-6 h-6" />}
              name="Gmail"
              description="Send and manage emails"
              available={false}
            />
          </div>

          {/* CTA */}
          <button
            onClick={() => setStep('twitter')}
            className="w-full bg-gradient-to-r from-primary-600 to-gold-600 text-white py-3 rounded-lg font-medium hover:from-primary-700 hover:to-gold-700 transition flex items-center justify-center space-x-2"
          >
            <span>Connect Twitter</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={handleSkip}
            className="w-full mt-3 text-gray-600 hover:text-gray-900 py-2 text-sm"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  if (step === 'twitter') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gold-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Twitter className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Connect Twitter</h2>
              <p className="text-sm text-gray-600">Authorize Jarvis to access your Twitter account</p>
            </div>
          </div>

          {/* Info */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 mb-3 font-medium">
              What Jarvis can do with your Twitter:
            </p>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                <span>Post tweets and replies on your behalf</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                <span>Monitor mentions and direct messages</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                <span>Auto-respond with AI-generated replies</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                <span>Schedule tweets for optimal engagement</span>
              </li>
            </ul>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => setStep('welcome')}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={handleTwitterConnect}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition flex items-center justify-center space-x-2"
            >
              <Twitter className="w-5 h-5" />
              <span>Connect with Twitter</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <p className="mt-4 text-xs text-center text-gray-500">
            You'll be redirected to Twitter to authorize Jarvis. You can revoke access anytime.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gold-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Twitter Connected! 🎉
        </h2>
        <p className="text-gray-600 mb-8">
          Your Twitter account is now connected and ready to use.
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-gradient-to-r from-primary-600 to-gold-600 text-white py-3 rounded-lg font-medium hover:from-primary-700 hover:to-gold-700 transition"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

function IntegrationOption({
  icon,
  name,
  description,
  available,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  available: boolean;
}) {
  return (
    <div
      className={`p-4 border rounded-lg flex items-center space-x-3 ${
        available
          ? 'border-gray-200 bg-white'
          : 'border-gray-100 bg-gray-50 opacity-60'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          available ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <p className="font-medium text-gray-900">{name}</p>
          {!available && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}
