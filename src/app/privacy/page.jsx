
import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata = {
  title: "Privacy Policy for Kissan Fresh",
  description: "Privacy Policy for Kissan Fresh mobile application and related services.",
};

export default function PrivacyPolicy() {
  const lastUpdated = "March 27, 2026";

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-green-100 dark:selection:bg-green-900/30">
      <LandingNav />
      <main className="flex-grow max-w-4xl mx-auto px-6 py-12 md:py-20 w-full">
        
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-zinc-950 dark:text-white">
            Privacy Policy for Kissan Fresh
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Last Updated: {lastUpdated}
          </p>
        </header>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">1. Introduction</h2>
            <p className="leading-relaxed">
              This Privacy Policy applies to Kissan Fresh (package name: com.kissanfresh.app), operated by Abdul Salaam Danish under the Kissan Fresh brand. This policy explains how we collect, use, disclose, and protect your information when you use our mobile application and related services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">2. Information We Collect</h2>
            <p className="mb-4">We collect various types of information to provide and improve our services:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Personal Information:</strong> Name, email address, phone number, and delivery address provided during registration or checkout.</li>
              <li><strong>Device Information:</strong> IP address, browser type, device ID, and operating system.</li>
              <li><strong>Transaction Data:</strong> Details of orders you place and payment confirmations (handled via secure third-party processors).</li>
            </ul>
          </section>

          <section className="bg-green-50 dark:bg-green-900/10 p-6 rounded-2xl border border-green-100 dark:border-green-900/20">
            <h2 className="text-2xl font-semibold mb-4 text-green-900 dark:text-green-100">3. App Permissions</h2>
            <p className="mb-4">Our mobile app requires certain permissions to function effectively as an e-commerce and delivery platform:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">Location Services</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Location is used only for delivery-related services and address verification.
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">Microphone</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Microphone is used only when the user actively uses voice search and is never used for background recording.
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">Camera & Media</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Access is only used when the user uploads images, scans QR codes, or updates profile pictures.
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">Notifications</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Notifications are used for order updates, delivery tracking, and promotional alerts.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">4. How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To process and deliver your orders.</li>
              <li>To manage your account and provide customer support.</li>
              <li>To send service-related notifications and promotional offers.</li>
              <li>To improve our website, app performance, and user experience.</li>
              <li>To prevent fraud and enhance security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">5. Data Sharing</h2>
            <p className="leading-relaxed">
              We do not sell your personal data. We share information only with:
              <br />- <strong>Delivery Partners:</strong> To ensure your orders reach you.
              <br />- <strong>Payment Gateways:</strong> To securely process transactions.
              <br />- <strong>Legal Compliance:</strong> If required by law or to protect our rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">6. Third-Party Services</h2>
            <p className="leading-relaxed">
              We may use third-party services such as Firebase for authentication, push notifications, analytics, and cloud storage, and payment gateways for secure transaction processing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">7. Data Security</h2>
            <p className="leading-relaxed">
              We implement industry-standard security measures, including encryption and secure protocols, 
              to protect your personal information from unauthorized access, disclosure, or alteration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">8. Your Rights</h2>
            <p className="leading-relaxed mb-4">
              You have the right to access, update, or request the deletion of your personal information. 
              You can manage most of your data directly through your account settings in the App or Website.
            </p>
            <p className="leading-relaxed">
              For account deletion requests, users can use the in-app account settings or contact support at <a href="mailto:support@kissanfresh.com" className="text-green-600 hover:underline">support@kissanfresh.com</a>.
            </p>
          </section>

          <section className="pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <h2 className="text-2xl font-semibold mb-4 text-zinc-900 dark:text-zinc-100">Contact Us</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p className="mt-2 font-medium text-green-600">support@kissanfresh.com</p>
          </section>
        </div>
        
      </main>
      <LandingFooter />
    </div>
  );
}
