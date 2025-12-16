import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold text-body transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary - Slack green/teal (#007a5a)
        default:
          "bg-[hsl(var(--brand-secondary))] text-white rounded-md shadow-sm hover:bg-[hsl(var(--brand-secondary))]/90 hover:shadow-md",
        // Destructive - Red
        destructive:
          "bg-destructive text-destructive-foreground rounded-md shadow-sm hover:bg-destructive/90",
        // Outline - White with border
        outline:
          "border-2 border-border bg-background text-foreground rounded-md shadow-sm hover:bg-muted",
        // Secondary - Light gray
        secondary:
          "bg-secondary text-secondary-foreground rounded-md shadow-sm hover:bg-secondary/80",
        // Ghost - Transparent
        ghost: "hover:bg-muted hover:text-foreground rounded-md",
        // Link - Text only
        link: "text-[hsl(var(--interactive))] underline-offset-4 hover:underline font-normal",
        // Brand - Aubergine purple
        brand:
          "bg-[hsl(var(--brand-primary))] text-white rounded-md shadow-sm hover:bg-[hsl(var(--brand-primary-hover))]",
      },
      size: {
        default: "h-11 px-4",      /* 44px height - standard input height */
        sm: "h-9 px-3 text-caption", /* 36px height */
        lg: "h-12 px-6",           /* 48px height */
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
