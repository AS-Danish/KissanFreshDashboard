"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/firebase/config";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Loader2, KeyRound, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      setEmail(""); // clear the input on success
    } catch (err) {
      const firebaseErrors = {
        "auth/invalid-email": "Invalid email address format.",
        "auth/user-not-found": "No account found with this email.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/network-request-failed": "Network error. Check your connection.",
      };
      setError(firebaseErrors[err.code] ?? "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Logo / Brand mark */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center shadow-md">
            <KeyRound className="h-5 w-5 text-white dark:text-slate-900" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Reset Password
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            We will send a reset link to your email
          </p>
        </div>

        {/* Card */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-medium text-slate-800 dark:text-slate-200">
              Forgot Password
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
              Enter your registered email address below
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4">
              
              {/* Success Alert */}
              {success && (
                <Alert
                  className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40 animate-in fade-in slide-in-from-top-1 duration-300"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-sm text-green-800 dark:text-green-200 ml-2">
                    A password reset link has been sent to your email!
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {error && (
                <Alert
                  variant="destructive"
                  className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 animate-in fade-in slide-in-from-top-1 duration-300"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10 border-slate-200 dark:border-slate-700 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500 placeholder:text-slate-400 transition-colors"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-2">
              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 font-medium transition-all duration-200 shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
              
              <Link href="/login" className="flex items-center justify-center text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors w-full group py-2">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover:-translate-x-1" />
                Back to sign in
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
