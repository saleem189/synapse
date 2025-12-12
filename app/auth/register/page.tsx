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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-surface-50 via-primary-50/30 to-accent-50/20 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950" />
        </div>
        <Card className="text-center animate-scale-in">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl mb-2">Account Created!</CardTitle>
            <CardDescription className="text-base">
              Redirecting you to login...
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-50 via-primary-50/30 to-accent-50/20 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950" />
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-accent-400/20 dark:bg-accent-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-primary-400/20 dark:bg-primary-500/10 rounded-full blur-3xl" />
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
              <CardTitle className="text-2xl mb-2">Create Account</CardTitle>
              <CardDescription className="text-base">
                Join Synapse and start chatting
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">

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
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 z-10" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    disabled={isLoading}
                    className={cn("pl-12", errors.name && "border-destructive")}
                  />
                </div>
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 z-10" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    disabled={isLoading}
                    className={cn("pl-12", errors.email && "border-destructive")}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
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
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className={cn("pl-12", errors.password && "border-destructive")}
                  />
                </div>
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-1">
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
                    <p className="text-xs text-surface-500">
                      Password strength: {strengthLabels[passwordStrength - 1] || "Too Short"}
                    </p>
                  </div>
                )}
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400 z-10" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    disabled={isLoading}
                    className={cn("pl-12", errors.confirmPassword && "border-destructive")}
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
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

