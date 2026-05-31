"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/services/authService";
import { useAppStore } from "@/store/useAppStore";

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
import { AlertCircle, Loader2, LogIn, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const user = useAppStore((state) => state.user);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      window.location.replace("/dashboard");
    }
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await loginUser(email, password);
      // Wait for useAppStore's onAuthStateChanged to set the cookie and update the 'user' state.
      // The useEffect will automatically redirect us to /dashboard when the state updates.
    } catch (err) {
      const firebaseErrors = {
        "auth/invalid-credential": "Invalid email or password.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/user-disabled": "This account has been disabled.",
        "auth/network-request-failed": "Network error. Check your connection.",
      };
      setError(firebaseErrors[err.code] ?? "Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

        {/* Logo / Brand mark */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 dark:bg-slate-100 flex items-center justify-center shadow-md">
            <LogIn className="h-5 w-5 text-white dark:text-slate-900" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            Welcome back
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sign in to your account to continue
          </p>
        </div>

        {/* Card */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-slate-950/60">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-medium text-slate-800 dark:text-slate-200">
              Sign in
            </CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
              Enter your credentials below
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">

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

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Password
                  </Label>
                  <a
                    href="/forgot-password"
                    className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="h-10 pr-10 border-slate-200 dark:border-slate-700 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500 placeholder:text-slate-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:pointer-events-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
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
                    Signing in…
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}