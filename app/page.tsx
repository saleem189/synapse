// ================================
// Landing Page
// ================================
// The main landing page with hero section, features, and auth buttons

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  MessageCircle,
  Shield,
  Zap,
  Users,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// Enable ISR (Incremental Static Regeneration)
// Revalidate every 60 seconds for fresh content
export const revalidate = 60;

export default async function LandingPage() {
  // Check if user is already logged in
  const session = await getServerSession(authOptions);

  // If logged in, redirect based on role
  if (session) {
    if (session.user.role === "admin") {
      redirect("/admin");
    }
    redirect("/chat");
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface-50 via-primary-50/30 to-accent-50/20 dark:from-surface-950 dark:via-surface-900 dark:to-surface-950" />

        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-primary-400/20 dark:bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-accent-400/20 dark:bg-accent-500/10 rounded-full blur-3xl animate-pulse animation-delay-500" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-surface-900 dark:text-white">
            ChatFlow
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/auth/login"
            className="btn-ghost hidden sm:inline-flex"
          >
            Sign In
          </Link>
          <Link href="/auth/register" className="btn-primary">
            Get Started
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-6 pt-16 pb-24 lg:px-12 lg:pt-24">
        <div className="max-w-6xl mx-auto">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Real-time messaging powered by Socket.io</span>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="text-center text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            <span className="text-surface-900 dark:text-white">
              Connect & Chat
            </span>
            <br />
            <span className="text-gradient">in Real-Time</span>
          </h1>

          {/* Subheading */}
          <p className="text-center text-lg sm:text-xl text-surface-600 dark:text-surface-400 max-w-2xl mx-auto mb-10 animate-slide-up animation-delay-100">
            Experience seamless communication with our modern chat platform.
            Create rooms, invite friends, and start chatting instantly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-slide-up animation-delay-200">
            <Link
              href="/auth/register"
              className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto"
            >
              Start Chatting Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth/login"
              className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto"
            >
              I Have an Account
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up animation-delay-300">
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Lightning Fast"
              description="Real-time messaging with Socket.io for instant delivery"
              gradient="from-amber-400 to-orange-500"
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Secure"
              description="End-to-end encryption and secure authentication"
              gradient="from-emerald-400 to-teal-500"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Group Chats"
              description="Create rooms and invite multiple participants"
              gradient="from-primary-400 to-blue-500"
            />
            <FeatureCard
              icon={<MessageCircle className="w-6 h-6" />}
              title="Rich Features"
              description="Typing indicators, online status, and more"
              gradient="from-accent-400 to-pink-500"
            />
          </div>

          {/* Chat Preview */}
          <div className="mt-20 relative animate-slide-up animation-delay-400">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-50 dark:from-surface-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="card p-4 sm:p-6 max-w-3xl mx-auto shadow-2xl shadow-surface-900/10 dark:shadow-black/30">
              <ChatPreview />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-surface-200 dark:border-surface-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-surface-500 dark:text-surface-400 text-sm">
            © 2024 ChatFlow. Built with Next.js & Socket.io
          </p>
          <div className="flex items-center gap-6 text-sm text-surface-500 dark:text-surface-400">
            <a href="#" className="hover:text-primary-500 transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-primary-500 transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-primary-500 transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  icon,
  title,
  description,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="card p-6 hover:shadow-lg transition-all duration-300 group">
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-surface-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-surface-600 dark:text-surface-400">
        {description}
      </p>
    </div>
  );
}

// Chat Preview Component
function ChatPreview() {
  const messages = [
    {
      id: 1,
      sender: "Alice",
      content: "Hey! Have you tried the new ChatFlow app? 🚀",
      time: "10:30 AM",
      isSent: false,
    },
    {
      id: 2,
      sender: "You",
      content: "Yes! It's amazing. The real-time features are so smooth.",
      time: "10:31 AM",
      isSent: true,
    },
    {
      id: 3,
      sender: "Alice",
      content: "Right? And the UI is beautiful! Love the dark mode too.",
      time: "10:32 AM",
      isSent: false,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Chat Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-surface-200 dark:border-surface-700">
        <div className="avatar-md bg-gradient-to-br from-pink-400 to-rose-500">
          A
        </div>
        <div>
          <h4 className="font-semibold text-surface-900 dark:text-white">
            Alice Johnson
          </h4>
          <p className="text-xs text-green-500 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Online
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                message.isSent
                  ? "message-bubble-sent"
                  : "message-bubble-received"
              }
            >
              <p className="text-sm">{message.content}</p>
              <p
                className={`text-xs mt-1 ${
                  message.isSent
                    ? "text-primary-200"
                    : "text-surface-500 dark:text-surface-400"
                }`}
              >
                {message.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Typing Indicator */}
      <div className="flex justify-start">
        <div className="typing-indicator">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

