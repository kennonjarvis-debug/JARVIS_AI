import { Link } from 'react-router-dom';
import { Bot, Zap, MessageSquare, Calendar, Mail, TrendingUp, Check, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Bot className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold gradient-text">Jarvis AI</span>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition">Pricing</a>
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition">How It Works</a>
            <Link to="/login" className="text-gray-600 hover:text-gray-900 transition">Login</Link>
            <Link
              to="/signup"
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition"
            >
              Start Free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-primary-100 rounded-full px-4 py-2 mb-6">
              <Zap className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">Your AI Chief of Staff</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Work Less.<br />
              <span className="gradient-text">Scale More.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Jarvis automates your business operations 24/7. From iMessages to social media,
              let AI handle the routine while you focus on growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Link
                to="/signup"
                className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary-700 transition flex items-center space-x-2"
              >
                <span>Start Free Trial</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#how-it-works"
                className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-medium hover:border-gray-400 transition"
              >
                See How It Works
              </a>
            </div>
            <p className="text-gray-500 text-sm">
              ✨ No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">16 hrs</div>
              <div className="text-gray-600">Saved per week</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">90%</div>
              <div className="text-gray-600">Tasks automated</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600 mb-2">24/7</div>
              <div className="text-gray-600">Always working</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Scale</h2>
            <p className="text-xl text-gray-600">Powerful automation that actually works</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MessageSquare className="w-8 h-8 text-primary-600" />}
              title="Smart iMessage Responses"
              description="AI-powered auto-responses that sound like you. Jarvis learns your style and handles customer conversations 24/7."
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8 text-primary-600" />}
              title="Social Media Automation"
              description="Schedule and post to Twitter, LinkedIn, Instagram. AI generates engaging content with your brand voice."
            />
            <FeatureCard
              icon={<Calendar className="w-8 h-8 text-primary-600" />}
              title="Calendar Management"
              description="Automatically detect scheduling requests in messages and create calendar events. Never miss an appointment."
            />
            <FeatureCard
              icon={<Mail className="w-8 h-8 text-primary-600" />}
              title="Email & Gmail Sync"
              description="Read, categorize, and respond to emails. Integrated with Gmail for seamless workflows."
            />
            <FeatureCard
              icon={<Bot className="w-8 h-8 text-primary-600" />}
              title="Contact Profiling"
              description="AI analyzes conversations to build detailed profiles. Know your contacts' interests, communication style, and history."
            />
            <FeatureCard
              icon={<Zap className="w-8 h-8 text-primary-600" />}
              title="CRM Integration"
              description="Sync with HubSpot, Notion, and more. Keep all your data in one place automatically."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 gradient-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How Jarvis Works</h2>
            <p className="text-xl text-gray-600">Get started in minutes, not hours</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Connect Your Tools"
              description="Link your iMessage, social media accounts, Gmail, and calendar. All secured with industry-standard encryption."
            />
            <StepCard
              number="2"
              title="Train Your AI"
              description="Jarvis learns your communication style, preferences, and business rules. The more it works, the smarter it gets."
            />
            <StepCard
              number="3"
              title="Watch It Work"
              description="Jarvis handles routine tasks 24/7 while you focus on high-value work. Monitor everything from your dashboard."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Start free, scale as you grow</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <PricingCard
              name="Starter"
              price="Free"
              description="Perfect for trying out Jarvis"
              features={[
                '100 iMessage responses/month',
                '1 social media account',
                'Basic contact profiling',
                'Email notifications',
                'Community support',
              ]}
              cta="Start Free"
              ctaLink="/signup"
            />
            <PricingCard
              name="Pro"
              price="$49"
              period="/month"
              description="For growing businesses"
              features={[
                'Unlimited iMessage responses',
                '3 social media accounts',
                'Advanced contact profiling',
                'Gmail & Calendar integration',
                'CRM sync (HubSpot)',
                'Priority support',
                '50 AI posts/month',
              ]}
              cta="Start Trial"
              ctaLink="/signup"
              popular
            />
            <PricingCard
              name="Business"
              price="$149"
              period="/month"
              description="For power users"
              features={[
                'Everything in Pro',
                'Unlimited social accounts',
                'Custom AI training',
                'Analytics & reporting',
                'API access',
                'White-label option',
                'Dedicated support',
              ]}
              cta="Start Trial"
              ctaLink="/signup"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Your Time Back?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join the solopreneurs and small businesses scaling with AI automation
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center space-x-2 bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-50 transition"
          >
            <span>Start Your Free Trial</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-4 text-primary-100 text-sm">
            14-day free trial • No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Bot className="w-6 h-6 text-primary-500" />
                <span className="text-xl font-bold text-white">Jarvis AI</span>
              </div>
              <p className="text-sm">
                Your AI Chief of Staff for business automation
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            © 2025 Jarvis AI. Built with 🤖 by Ben Kennon
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-2xl font-bold mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  cta,
  ctaLink,
  popular,
}: {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: string;
  ctaLink: string;
  popular?: boolean;
}) {
  return (
    <div className={`bg-white border-2 ${popular ? 'border-primary-600 shadow-xl scale-105' : 'border-gray-200'} rounded-xl p-8 relative`}>
      {popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">{name}</h3>
        <div className="mb-2">
          <span className="text-4xl font-bold">{price}</span>
          {period && <span className="text-gray-600">{period}</span>}
        </div>
        <p className="text-gray-600">{description}</p>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start space-x-2">
            <Check className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        to={ctaLink}
        className={`block w-full text-center py-3 rounded-lg font-medium transition ${
          popular
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'border-2 border-gray-300 text-gray-700 hover:border-gray-400'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
