import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  variant?: "default" | "vr-glow"
  error?: boolean
}

function Input({ className, type, variant = "default", error = false, ...props }: InputProps) {
  const baseClasses = "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-all duration-300 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
  
  const variantClasses = {
    default: "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    "vr-glow": "focus-visible:border-blue-500 focus-visible:shadow-glow-md focus-visible:ring-blue-500/50 focus-visible:ring-[3px]"
  }

  const errorClasses = error ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/50" : ""

  if (variant === "vr-glow") {
    // Filter out conflicting React drag events
    const motionProps = Object.fromEntries(
      Object.entries(props).filter(([key]) => 
        !['onDrag', 'onDragEnd', 'onDragStart', 'onAnimationStart', 'onAnimationEnd', 'onAnimationIteration'].includes(key)
      )
    );
    return (
      <motion.input
        type={type}
        data-slot="input"
        className={cn(baseClasses, variantClasses[variant], errorClasses, className)}
        whileFocus={{ scale: 1.01 }}
        transition={{ duration: 0.2 }}
        {...motionProps}
      />
    )
  }

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(baseClasses, variantClasses[variant], errorClasses, className)}
      {...props}
    />
  )
}

export { Input }
