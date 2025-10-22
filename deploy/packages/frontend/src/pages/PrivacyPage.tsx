export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">Privacy Policy</h1>

        <p className="text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
          <p className="text-gray-700 leading-relaxed">
            Jarvis ("we", "our", or "us") operates jarvis-ai.co (the "Service"). This page informs you
            of our policies regarding the collection, use, and disclosure of personal data when you use
            our Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information Collection and Use</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We collect several different types of information for various purposes to provide and improve
            our Service to you:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Personal Data: Email address, name, and profile information</li>
            <li>Usage Data: Information on how the Service is accessed and used</li>
            <li>Social Media Data: When you connect Twitter or other social media accounts, we collect
                access tokens and profile information necessary to provide the Service</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Data</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Jarvis uses the collected data for various purposes:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>To provide and maintain our Service</li>
            <li>To notify you about changes to our Service</li>
            <li>To provide customer support</li>
            <li>To gather analysis or valuable information to improve our Service</li>
            <li>To monitor the usage of our Service</li>
            <li>To detect, prevent and address technical issues</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Social Media Integration</h2>
          <p className="text-gray-700 leading-relaxed">
            When you connect your Twitter or other social media accounts to Jarvis, we request only
            the minimum permissions necessary to provide our Service. We store access tokens securely
            and use them solely to perform actions you authorize. You can revoke access at any time
            through your account settings or directly through the social media platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
          <p className="text-gray-700 leading-relaxed">
            The security of your data is important to us. We use industry-standard encryption and
            security practices to protect your personal information. However, no method of transmission
            over the Internet or electronic storage is 100% secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
          <p className="text-gray-700 leading-relaxed">
            We may employ third-party companies and individuals to facilitate our Service ("Service
            Providers"), provide the Service on our behalf, perform Service-related services, or assist
            us in analyzing how our Service is used. These third parties have access to your Personal
            Data only to perform these tasks on our behalf and are obligated not to disclose or use it
            for any other purpose.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Data Rights</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Access, update, or delete the information we have on you</li>
            <li>Request a copy of your data</li>
            <li>Object to the processing of your data</li>
            <li>Request data portability</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
          <p className="text-gray-700 leading-relaxed">
            We may update our Privacy Policy from time to time. We will notify you of any changes by
            posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
          <p className="text-gray-700 leading-relaxed">
            If you have any questions about this Privacy Policy, please contact us at support@jarvis-ai.co
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
