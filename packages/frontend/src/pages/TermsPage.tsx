export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Terms of Service</h1>

        <p className="text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Agreement to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            By accessing or using Jarvis ("the Service"), you agree to be bound by these Terms of Service
            ("Terms"). If you disagree with any part of the terms, you may not access the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
          <p className="text-gray-700 leading-relaxed">
            Jarvis is a social media management and automation platform that helps users manage their
            social media presence across multiple platforms including Twitter and other supported networks.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            When you create an account with us, you must provide accurate, complete, and current information.
            Failure to do so constitutes a breach of the Terms, which may result in immediate termination
            of your account.
          </p>
          <p className="text-gray-700 leading-relaxed">
            You are responsible for safeguarding the password and for all activities that occur under your
            account. You agree not to disclose your password to any third party.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Social Media Integration</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            By connecting your social media accounts to Jarvis:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>You authorize us to access and use your social media accounts on your behalf</li>
            <li>You are responsible for ensuring compliance with each platform's terms of service</li>
            <li>You acknowledge that social media platforms may revoke access at any time</li>
            <li>You can disconnect your accounts at any time through your settings</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Acceptable Use</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            You agree not to use the Service to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Violate any laws or regulations</li>
            <li>Infringe on the rights of others</li>
            <li>Distribute spam, malware, or harmful content</li>
            <li>Harass, abuse, or harm other users</li>
            <li>Attempt to gain unauthorized access to the Service or related systems</li>
            <li>Use the Service for any automated or bulk posting that violates platform policies</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
          <p className="text-gray-700 leading-relaxed">
            The Service and its original content, features, and functionality are owned by Jarvis and
            are protected by international copyright, trademark, patent, trade secret, and other
            intellectual property laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Termination</h2>
          <p className="text-gray-700 leading-relaxed">
            We may terminate or suspend your account immediately, without prior notice or liability, for
            any reason whatsoever, including without limitation if you breach the Terms. Upon termination,
            your right to use the Service will immediately cease.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
          <p className="text-gray-700 leading-relaxed">
            In no event shall Jarvis, nor its directors, employees, partners, agents, suppliers, or
            affiliates, be liable for any indirect, incidental, special, consequential or punitive damages,
            including without limitation, loss of profits, data, use, goodwill, or other intangible losses,
            resulting from your access to or use of or inability to access or use the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disclaimer</h2>
          <p className="text-gray-700 leading-relaxed">
            Your use of the Service is at your sole risk. The Service is provided on an "AS IS" and
            "AS AVAILABLE" basis. The Service is provided without warranties of any kind, whether express
            or implied.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
            We will provide notice of any material changes by posting the new Terms on this page and
            updating the "Last updated" date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Governing Law</h2>
          <p className="text-gray-700 leading-relaxed">
            These Terms shall be governed and construed in accordance with the laws, without regard to
            its conflict of law provisions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Us</h2>
          <p className="text-gray-700 leading-relaxed">
            If you have any questions about these Terms, please contact us at support@jarvis-ai.co
          </p>
        </section>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <a
            href="/"
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
