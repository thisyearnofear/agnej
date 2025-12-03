import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Agnej",
  description: "Privacy Policy for Agnej - Decentralized Physics Game",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
      <header className="flex justify-between items-center p-6 border-b border-white/10">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold ml-2">Agnej</span>
        </Link>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center">Privacy Policy</h1>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-8 rounded-xl border border-white/10 prose prose-invert max-w-none">
          <p className="text-gray-300 mb-6"><strong>Last Updated:</strong> December 3, 2025</p>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Introduction</h2>
            <p className="text-gray-300 mb-4">
              Agnej (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy and is committed to protecting your personal information. 
              This Privacy Policy explains how we collect, use, and safeguard your information when you use our 
              decentralized physics game platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Information We Collect</h2>
            <h3 className="text-xl font-medium mb-3 text-purple-400">Personal Information</h3>
            <p className="text-gray-300 mb-4">
              We do not collect personal information such as your name, email address, or contact details unless 
              you voluntarily provide it to us through direct communication channels.
            </p>
            
            <h3 className="text-xl font-medium mb-3 text-purple-400">Usage Data</h3>
            <p className="text-gray-300 mb-4">
              We may collect non-personal information about your interaction with our game, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Gameplay statistics and scores</li>
              <li>Device information (browser type, operating system)</li>
              <li>IP address and general location data</li>
              <li>Pages visited and time spent on our platform</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Blockchain Information</h2>
            <p className="text-gray-300 mb-4">
              Our platform operates on the blockchain, which means certain information may be publicly visible:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Your wallet address when you submit scores or participate in multiplayer games</li>
              <li>Transaction details related to gameplay activities</li>
              <li>Leaderboard rankings and associated scores</li>
            </ul>
            <p className="text-gray-300 mb-4">
              This information is stored on the blockchain and cannot be deleted or modified.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">How We Use Your Information</h2>
            <p className="text-gray-300 mb-4">We use the collected information for:</p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>Providing and improving our game services</li>
              <li>Maintaining and securing the leaderboard system</li>
              <li>Analyzing gameplay patterns to enhance user experience</li>
              <li>Facilitating multiplayer game functionality</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Data Sharing and Disclosure</h2>
            <p className="text-gray-300 mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share information 
              with trusted third parties who assist us in operating our platform, conducting business, or serving 
              our users, as long as those parties agree to keep this information confidential.
            </p>
            <p className="text-gray-300 mb-4">
              We may also disclose information when required by law or to protect our rights, property, or safety, 
              or that of our users or others.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Data Security</h2>
            <p className="text-gray-300 mb-4">
              We implement appropriate security measures to protect your information from unauthorized access, 
              alteration, disclosure, or destruction. However, no method of transmission over the internet or 
              electronic storage is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Your Rights</h2>
            <p className="text-gray-300 mb-4">
              Depending on your jurisdiction, you may have certain rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-300 mb-4 space-y-2">
              <li>The right to access, update, or delete your personal information</li>
              <li>The right to object to processing of your personal information</li>
              <li>The right to data portability</li>
              <li>The right to withdraw consent</li>
            </ul>
            <p className="text-gray-300 mb-4">
              Please note that blockchain data cannot be deleted or modified due to the immutable nature of the technology.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Children&apos;s Privacy</h2>
            <p className="text-gray-300 mb-4">
              Our platform is not intended for children under 13 years of age. We do not knowingly collect 
              personal information from children under 13. If you are a parent or guardian and believe your 
              child has provided us with personal information, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Changes to This Privacy Policy</h2>
            <p className="text-gray-300 mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
              the new Privacy Policy on this page with an updated revision date. You are advised to review this 
              Privacy Policy periodically for any changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">Contact Us</h2>
            <p className="text-gray-300 mb-4">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-gray-300 mb-4">
              Email: privacy@agnej.com
            </p>
          </section>
        </div>
      </main>

      <footer className="py-8 text-center text-gray-500 text-sm border-t border-white/10">
        <p>© {new Date().getFullYear()} Agnej. All rights reserved.</p>
      </footer>
    </div>
  );
}