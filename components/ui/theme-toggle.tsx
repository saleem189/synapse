// ================================
// Theme Toggle Component
// ================================
// A button to toggle between light and dark modes

"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          "bg-surface-100 dark:bg-surface-800",
          className
        )}
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5 bg-surface-300 rounded animate-pulse" />
      </button>
    );
  }

  // Use resolvedTheme to check actual active theme (dark or light)
  // theme can be "system", but resolvedTheme is always "dark" or "light"
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center",
        "bg-surface-100 dark:bg-surface-800",
        "hover:bg-surface-200 dark:hover:bg-surface-700",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-500" />
      ) : (
        <Moon className="w-5 h-5 text-surface-600" />
      )}
    </button>
  );
}

