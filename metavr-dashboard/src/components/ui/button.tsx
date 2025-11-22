import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
            "vr-primary": "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-glow-md hover:shadow-glow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden",
            "vr-secondary": "border border-blue-500/50 text-blue-500 hover:bg-blue-500/10 hover:shadow-glow-md hover:scale-105 transition-all duration-300 relative overflow-hidden",
            "vr-success": "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-glow-green hover:shadow-glow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden",
            "vr-warning": "bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-glow-md hover:shadow-glow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden",
            "vr-danger": "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-glow-md hover:shadow-glow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden",
            "vr-ghost": "text-blue-500 hover:bg-blue-500/10 hover:shadow-glow-sm hover:scale-105 transition-all duration-300 relative overflow-hidden",
            "vr-outline": "border-2 border-blue-500/50 text-blue-500 hover:bg-blue-500/5 hover:border-blue-500 hover:shadow-glow-md hover:scale-105 transition-all duration-300 relative overflow-hidden",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  // Filter out Framer Motion props to prevent them from being passed to DOM elements
  const {
    ...domProps
  } = props as React.ComponentProps<"button"> & {
    loading?: boolean;
    ripple?: boolean;
    whileHover?: unknown;
    whileTap?: unknown;
    whileFocus?: unknown;
    whileInView?: unknown;
    animate?: unknown;
    initial?: unknown;
    exit?: unknown;
    transition?: unknown;
    variants?: unknown;
  }

  const buttonContent = (
    <span>
      {loading && (
        <motion.div
          className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      )}
      {children}
    </span>
  )

      if (variant?.startsWith('vr-')) {
        return (
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <Comp
              data-slot="button"
              className={cn(buttonVariants({ variant, size, className }))}
              disabled={loading || domProps.disabled}
              {...domProps}
            >
              {/* Shimmer effect overlay */}
              <div className="absolute inset-0 -top-1 -bottom-1 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 hover:animate-shimmer transition-opacity duration-300" />
              {buttonContent}
            </Comp>
          </motion.div>
        )
      }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={loading || domProps.disabled}
      {...domProps}
    >
      {buttonContent}
    </Comp>
  )
}

export { Button, buttonVariants }
