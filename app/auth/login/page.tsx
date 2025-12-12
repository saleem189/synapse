// ================================
// Login Page
// ================================
// User authentication page with email/password login

"use client";

// Note: This is a client component, so ISR/SSG doesn't apply
// But we can add metadata for SEO

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { logger } from "@/lib/logger";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Safely get callbackUrl and validate it
  let callbackUrl = "/chat";
  try {
    const rawCallbackUrl = searchParams.get("callbackUrl");
    if (rawCallbackUrl && typeof rawCallbackUrl === 'string') {
      const trimmed = rawCallbackUrl.trim();
      
      // Only accept relative paths starting with / (security: prevent open redirect)
      if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        // Basic validation: ensure it's a safe path
        if (/^\/[a-zA-Z0-9\/\-_?=&.:]*$/.test(trimmed)) {
          callbackUrl = trimmed;
        }
      }
      // If it's a full URL, extract just the pathname
      else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
          // Only parse if it's a valid URL format
          if (trimmed.includes('://') && trimmed.length > 7) {
            const url = new URL(trimmed);
            const pathname = url.pathname || "/chat";
            // Only use if it's a valid relative path
            if (pathname.startsWith('/')) {
              callbackUrl = pathname;
            }
          }
        } catch (urlError) {
          // If URL construction fails, use default
          logger.error("Invalid callbackUrl format", { error: urlError });
          callbackUrl = "/chat";
        }
      }
    }
  } catch (error) {
    logger.error("Error parsing callbackUrl", { error });
    callbackUrl = "/chat";
  }

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Use signIn with relative callbackUrl to avoid client-side URL construction errors
      // NextAuth client-side can't access NEXTAUTH_URL (server-only env var)
      // By using redirect: false and handling redirects manually, we avoid URL construction
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        // Don't pass callbackUrl - NextAuth client tries to construct absolute URLs
        // which requires NEXTAUTH_URL (not available in browser)
        // We'll handle redirects manually after successful login
      });

      if (result?.error) {
        // Map NextAuth error messages to user-friendly messages
        let errorMessage = result.error;
        if (result.error === "CredentialsSignin") {
          errorMessage = "Invalid email or password. Please try again.";
        } else if (result.error.includes("Email and password are required")) {
          errorMessage = "Please enter both email and password.";
        } else if (result.error.includes("No user found")) {
          errorMessage = "No account found with this email address.";
        } else if (result.error.includes("Invalid password")) {
          errorMessage = "Invalid password. Please try again.";
        }
        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Check if login was successful
      if (!result?.ok) {
        setError("Login failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Successful login - fetch session to check role
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (!sessionRes.ok) {
          throw new Error("Failed to fetch session");
        }
        const session = await sessionRes.json();
        
        // Redirect based on role
        if (session?.user?.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push(callbackUrl || "/chat");
        }
        router.refresh();
      } catch (sessionError) {
        logger.error("Session fetch error", { error: sessionError });
        // Even if session fetch fails, try to redirect (session might still be set)
        router.push(callbackUrl || "/chat");
        router.refresh();
      }
    } catch (error) {
      // CRITICAL: Check if this is a client-side URL construction error
      // NextAuth client-side code tries to use NEXTAUTH_URL (server-only env var)
      // This causes "Failed to construct 'URL': Invalid URL" errors in the browser
      const isUrlConstructionError = error instanceof Error && (
        error.message.includes("Failed to construct 'URL'") || 
        error.message.includes("Invalid URL") ||
        (error.name === "TypeError" && error.message.includes("URL"))
      );
      
      // If it's a URL construction error, the server-side auth might still succeed
      // Check if we actually have a valid session despite the client-side error
      if (isUrlConstructionError) {
        // Don't log as error - this is expected and handled gracefully
        // Only log in development for debugging
        if (process.env.NODE_ENV === "development") {
          logger.warn("Client-side URL construction error (expected - NextAuth client can't access NEXTAUTH_URL). Checking if authentication succeeded on server...");
        }
        
        try {
          const sessionRes = await fetch("/api/auth/session");
          if (sessionRes.ok) {
            const session = await sessionRes.json();
            // If we have a valid session, authentication succeeded despite the client error
            if (session?.user) {
              logger.info("Authentication succeeded on server despite client-side URL error. Redirecting...");
              // Redirect based on role
              if (session.user.role === "ADMIN") {
                router.push("/admin");
              } else {
                router.push(callbackUrl || "/chat");
              }
              router.refresh();
              setIsLoading(false);
              return; // Exit early - don't show error if auth succeeded
            }
          }
        } catch (sessionCheckError) {
          logger.error("Failed to check session after URL construction error", { error: sessionCheckError });
        }
        
        // If no session found, it's a real auth failure
        setError("Authentication failed. Please check your credentials and try again.");
        setIsLoading(false);
        return;
      }
      
      // For other (non-URL-construction) errors, log them for debugging
      logger.error("Login error", { error });
      
      // Check if authentication actually succeeded despite the error
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          if (session?.user) {
            logger.info("Authentication succeeded despite error, redirecting...");
            if (session.user.role === "ADMIN") {
              router.push("/admin");
            } else {
              router.push(callbackUrl || "/chat");
            }
            router.refresh();
            setIsLoading(false);
            return;
          }
        }
      } catch (sessionCheckError) {
        logger.error("Failed to check session after error", { error: sessionCheckError });
      }
      
      // Only show error if authentication actually failed (no session)
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request timed out. Please try again.";
        } else {
          // In development, show the actual error message
          if (process.env.NODE_ENV === "development") {
            errorMessage = `Error: ${error.message}`;
          }
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-50 via-primary-50/30 to-accent-50/20 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950" />
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-primary-400/20 dark:bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-accent-400/20 dark:bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-surface-900 dark:text-white">
            Synapse
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-slide-up">
          {/* Card */}
          <Card className="shadow-xl shadow-surface-900/5 dark:shadow-black/20">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl mb-2">Welcome Back</CardTitle>
              <CardDescription className="text-base">
                Sign in to continue chatting
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 animate-scale-in">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 z-10" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                    className={cn("pl-12", error && "border-destructive")}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 z-10" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className={cn("pl-12", error && "border-destructive")}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                variant="default"
                className="w-full py-3.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-200 dark:border-surface-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-surface-900 text-surface-500">
                  New to Synapse?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <Button variant="secondary" asChild className="w-full">
              <Link href="/auth/register">Create an Account</Link>
            </Button>
            </CardContent>
          </Card>

          {/* Back to Home */}
          <p className="text-center mt-6 text-sm text-surface-500 dark:text-surface-400">
            <Link
              href="/"
              className="hover:text-primary-500 transition-colors"
            >
              ← Back to Home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

