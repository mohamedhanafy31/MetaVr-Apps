import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        success:
          "border-transparent bg-green-500 text-white shadow-glow-green",
        warning:
          "border-transparent bg-yellow-500 text-white shadow-glow-md",
        active:
          "border-transparent bg-blue-500 text-white shadow-glow-md animate-pulse-glow",
        inactive:
          "border-transparent bg-gray-500 text-white",
        maintenance:
          "border-transparent bg-orange-500 text-white shadow-glow-md",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  asChild?: boolean
  animated?: boolean
}

function Badge({
  className,
  variant,
  asChild = false,
  animated = false,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "span"

  if (animated && variant === "active") {
    // Filter out conflicting React drag events
    const motionProps = Object.fromEntries(
      Object.entries(props).filter(([key]) => 
        !['onDrag', 'onDragEnd', 'onDragStart', 'onAnimationStart', 'onAnimationEnd', 'onAnimationIteration'].includes(key)
      )
    );
    return (
      <motion.span
        data-slot="badge"
        className={cn(badgeVariants({ variant }), className)}
        animate={{ 
          scale: [1, 1.05, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        {...motionProps}
      >
        {children}
      </motion.span>
    )
  }

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </Comp>
  )
}

export { Badge, badgeVariants }
