import React from "react";
import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { 
  IconArrowLeft, 
  IconUserCircle, 
  IconClick, 
  IconTrash, 
  IconAlertCircle,
  IconHistory,
  IconCircleCheck
} from "@tabler/icons-react";

export const metadata = {
  title: "Delete Account | Kissan Fresh",
  description: "Guide on how to delete your Kissan Fresh account and data retention policy.",
};

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-red-100 dark:selection:bg-red-900/30">
      <LandingNav />

      <main className="flex-grow max-w-3xl mx-auto px-6 py-16 md:py-24 w-full">
        <header className="mb-16 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-6">
            <IconTrash size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-zinc-950 dark:text-white">
            Delete Your Account
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
            We're sorry to see you go. Below is a simple guide on how to delete your account and what happens to your data.
          </p>
        </header>

        {/* Steps */}
        <div className="space-y-12">
          <section className="relative pl-12">
            <div className="absolute left-0 top-0 w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-sm font-bold border border-zinc-200 dark:border-zinc-700">1</div>
            <h2 className="text-xl font-bold mb-4">Open the Kissan Fresh App</h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Launch the Kissan Fresh application on your mobile device and ensure you are logged into the account you wish to delete.
            </p>
          </section>

          <section className="relative pl-12">
            <div className="absolute left-0 top-0 w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-sm font-bold border border-zinc-200 dark:border-zinc-700">2</div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              Go to Your Profile
              <IconUserCircle size={24} className="text-zinc-400" />
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              In the top-right corner of the home screen, tap on your <strong>Profile Icon</strong> to open the account settings menu.
            </p>
          </section>

          <section className="relative pl-12">
            <div className="absolute left-0 top-0 w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-sm font-bold border border-zinc-200 dark:border-zinc-700">3</div>
            <h2 className="text-xl font-bold mb-4">Select "Delete Account"</h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Scroll down to the bottom of the profile settings list. You will find the <strong>Delete Account</strong> option located near the sign-out button.
            </p>
          </section>

          <section className="relative pl-12">
            <div className="absolute left-0 top-0 w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-sm font-bold border border-zinc-200 dark:border-zinc-700">4</div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              Confirm Deletion
              <IconClick size={24} className="text-zinc-400" />
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Tap on Delete Account. A confirmation dialog will appear. Click <strong>"Yes"</strong> to finalize the process. Your account will be immediately deactivated.
            </p>
          </section>
        </div>

        {/* Data Retention Note */}
        <div className="mt-20 p-8 bg-zinc-50 dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 text-zinc-200 dark:text-zinc-800 -mr-4 -mt-4 opacity-50">
            <IconAlertCircle size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
            <div className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center text-orange-500 shadow-sm shrink-0">
               <IconHistory size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-3">What happens to my data?</h3>
              <div className="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
                <div className="flex gap-2">
                  <IconCircleCheck size={20} className="text-green-500 shrink-0 mt-1" />
                  <p>Your personal information (name, email, phone) will be permanently deleted from our active user database.</p>
                </div>
                <div className="flex gap-2">
                  <IconAlertCircle size={20} className="text-amber-500 shrink-0 mt-1" />
                  <p>Your <strong>order history</strong> will remain with Kissan Fresh. This information is anonymized and used exclusively for our internal financial calculations, inventory statistics, and business growth analysis.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
      <LandingFooter />
    </div>
  );
}
