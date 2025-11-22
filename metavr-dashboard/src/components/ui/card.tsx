import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

interface CardProps extends React.ComponentProps<"div"> {
  variant?: "default" | "holographic" | "floating" | "premium" | "elite"
  glowColor?: "blue" | "purple" | "cyan" | "green"
}

function Card({ className, variant = "default", glowColor = "blue", ...props }: CardProps) {
  const baseClasses = "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm transition-all duration-300"
  
  const glowClasses = {
    blue: "hover:shadow-glow-md",
    purple: "hover:shadow-glow-purple", 
    cyan: "hover:shadow-glow-cyan",
    green: "hover:shadow-glow-green"
  }
  
  const variantClasses = {
    default: "",
    holographic: "holographic-border hover-lift relative overflow-hidden",
    floating: "hover-lift backdrop-blur-sm bg-card/80",
    premium: `holographic-border hover-lift relative overflow-hidden ${glowClasses[glowColor]} border-blue-500/30`,
    elite: `holographic-border hover-lift relative overflow-hidden ${glowClasses[glowColor]} border-blue-500/50 shadow-glow-sm`
  }

  if (variant === "holographic" || variant === "premium" || variant === "elite") {
    // Filter out conflicting React drag events
    const motionProps = Object.fromEntries(
      Object.entries(props).filter(([key]) => 
        !['onDrag', 'onDragEnd', 'onDragStart', 'onAnimationStart', 'onAnimationEnd', 'onAnimationIteration'].includes(key)
      )
    );
    return (
      <motion.div
        className={cn(baseClasses, variantClasses[variant], className)}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        {...motionProps}
      >
        {/* Shimmer effect for premium variants */}
        {(variant === "premium" || variant === "elite") && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 hover:animate-shimmer transition-opacity duration-300" />
        )}
        {props.children}
      </motion.div>
    )
  }

  if (variant === "floating") {
    // Filter out conflicting React drag events
    const motionProps = Object.fromEntries(
      Object.entries(props).filter(([key]) => 
        !['onDrag', 'onDragEnd', 'onDragStart', 'onAnimationStart', 'onAnimationEnd', 'onAnimationIteration'].includes(key)
      )
    );
    return (
      <motion.div
        className={cn(baseClasses, variantClasses[variant], className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ y: -2 }}
        {...motionProps}
      />
    )
  }

  return (
    <div
      data-slot="card"
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}