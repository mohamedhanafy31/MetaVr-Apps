"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  variant?: "default" | "gradient" | "glow" | "pulse" | "shimmer"
  color?: "blue" | "green" | "purple" | "cyan" | "orange" | "red"
  animated?: boolean
}

function Progress({
  className,
  value,
  variant = "default",
  color = "blue",
  animated = false,
  ...props
}: ProgressProps) {
  const colorClasses = {
    blue: "bg-gradient-to-r from-blue-500 to-cyan-500",
    green: "bg-gradient-to-r from-green-500 to-emerald-500",
    purple: "bg-gradient-to-r from-purple-500 to-pink-500",
    cyan: "bg-gradient-to-r from-cyan-500 to-blue-500",
    orange: "bg-gradient-to-r from-orange-500 to-yellow-500",
    red: "bg-gradient-to-r from-red-500 to-pink-500"
  }

  const glowClasses = {
    blue: "shadow-glow-md",
    green: "shadow-glow-green",
    purple: "shadow-glow-purple",
    cyan: "shadow-glow-cyan",
    orange: "shadow-glow-md",
    red: "shadow-glow-md"
  }

  const baseClasses = "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full"
  const variantClasses = {
    default: "",
    gradient: "",
    glow: "",
    pulse: "animate-pulse",
    shimmer: "relative overflow-hidden"
  }

  const indicatorClasses = {
    default: "bg-primary h-full w-full flex-1 transition-all duration-500 ease-out",
    gradient: `${colorClasses[color]} h-full w-full flex-1 transition-all duration-500 ease-out`,
    glow: `${colorClasses[color]} ${glowClasses[color]} h-full w-full flex-1 transition-all duration-500 ease-out`,
    pulse: `${colorClasses[color]} ${glowClasses[color]} h-full w-full flex-1 transition-all duration-500 ease-out animate-pulse-glow`,
    shimmer: `${colorClasses[color]} h-full w-full flex-1 transition-all duration-500 ease-out relative overflow-hidden`
  }

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    >
      <motion.div
        className={indicatorClasses[variant]}
        initial={{ width: 0 }}
        animate={{ width: `${value || 0}%` }}
        transition={{ duration: animated ? 1.2 : 0.8, ease: "easeOut" }}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      >
        {/* Shimmer effect for shimmer variant */}
        {variant === "shimmer" && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        )}
      </motion.div>
    </ProgressPrimitive.Root>
  )
}

export { Progress }
