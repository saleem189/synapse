// ================================
// Register Page
// ================================
// User registration page with form validation

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageCircle,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { registerSchema, type RegisterFormData } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<RegisterFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormData, string>>>({});
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof RegisterFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    setErrors({});

    // Validate form data
    const result = registerSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof RegisterFormData, string>> = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof RegisterFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error || "Registration failed");
        setIsLoading(false);
        return;
      }

      // Success - show message and redirect
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/auth/login?registered=true");
      }, 2000);
    } catch {
      setApiError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);
  const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500", "bg-emerald-500"];
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/20 to-background" />
        </div>
        <Card variant="elevated" className="text-center scale-in shadow-xl">
          <CardContent className="surface-padding-xl">
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 border-2 border-[hsl(var(--success))] flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-[hsl(var(--success))]" />
            </div>
            <CardTitle className="mb-3">Account Created!</CardTitle>
            <CardDescription>
              Redirecting you to login...
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <CardTitle>Create Account</CardTitle>
              <CardDescription>
                Join Synapse and start chatting
              </CardDescription>
            </CardHeader>
            <CardContent className="surface-padding-lg pb-8">

            {/* API Error Message */}
            {apiError && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3 animate-scale-in">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600 dark:text-red-400">
                  {apiError}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </Label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    disabled={isLoading}
                    className={cn(
                      "pl-10 h-11 transition-all",
                      errors.name && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1.5 mt-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    className={cn(
                      "pl-10 h-11 transition-all",
                      errors.email && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1.5 mt-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className={cn(
                      "pl-10 h-11 transition-all",
                      errors.password && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-1.5 mt-2">
                    <div className="flex gap-1">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-all duration-300",
                            i < passwordStrength
                              ? strengthColors[passwordStrength - 1]
                              : "bg-surface-200 dark:bg-surface-700"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password strength: {strengthLabels[passwordStrength - 1] || "Too Short"}
                    </p>
                  </div>
                )}
                {errors.password && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1.5 mt-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className={cn(
                      "pl-10 h-11 transition-all",
                      errors.confirmPassword && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1.5 mt-1.5">
                    <AlertCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                variant="default"
                className="w-full h-11 font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
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
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Login Link */}
            <Button variant="secondary" asChild className="w-full">
              <Link href="/auth/login">Sign In</Link>
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

