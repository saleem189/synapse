import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex w-full bg-background text-foreground text-body font-normal",
          // Dimensions - 44px height standard
          "h-11 px-3 rounded-md",
          // Border
          "border border-border",
          // Focus states
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--interactive))] focus-visible:ring-offset-0 focus-visible:border-[hsl(var(--interactive))]",
          // Placeholder
          "placeholder:text-muted-foreground",
          // File input
          "file:border-0 file:bg-transparent file:text-caption file:font-medium file:text-foreground",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          // Hover state
          "hover:border-border-strong",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
