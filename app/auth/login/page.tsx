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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Background - Minimal, clean design */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
      </div>

      {/* Header */}
      <header className="p-6 flex items-center justify-between border-b border-border">
        <Link href="/" className="flex items-center gap-3 transition-base hover-scale">
          <div className="w-12 h-12 rounded-lg bg-[hsl(var(--brand-primary))] flex items-center justify-center shadow-md">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black text-foreground">
            Synapse
          </span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md slide-in-up">
          {/* Card */}
          <Card variant="elevated" className="shadow-xl">
            <CardHeader className="text-center space-y-3 pb-8">
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>
                Sign in to continue chatting
              </CardDescription>
            </CardHeader>
            <CardContent className="surface-padding-lg pb-8">

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-md bg-destructive/10 border border-destructive/30 flex items-center gap-3 scale-in">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-caption text-destructive">
                  {error}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-body font-semibold text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                    className={cn(
                      "pl-10",
                      error && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-body font-semibold text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                    className={cn(
                      "pl-10",
                      error && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                variant="default"
                size="default"
                className="w-full press-effect"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-caption">
                <span className="px-4 bg-card text-muted-foreground">
                  New to Synapse?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <Button variant="outline" asChild className="w-full press-effect">
              <Link href="/auth/register">Create an Account</Link>
            </Button>
            </CardContent>
          </Card>

          {/* Back to Home */}
          <p className="text-center mt-6 text-caption text-muted-foreground">
            <Link
              href="/"
              className="hover:text-[hsl(var(--interactive))] transition-base"
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--interactive))]" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

