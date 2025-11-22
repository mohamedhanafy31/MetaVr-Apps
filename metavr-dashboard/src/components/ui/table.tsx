"use client"

import * as React from "react"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm min-w-[600px]", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

interface TableRowProps extends React.ComponentProps<"tr"> {
  variant?: "default" | "hover-lift"
}

function TableRow({ className, variant = "default", ...props }: TableRowProps) {
  const baseClasses = "border-b transition-all duration-300"
  const variantClasses = {
    default: "hover:bg-muted/50 data-[state=selected]:bg-muted",
    "hover-lift": "hover:bg-muted/50 data-[state=selected]:bg-muted hover:shadow-md hover:-translate-y-0.5"
  }

  if (variant === "hover-lift") {
    // Filter out conflicting React drag events
    const motionProps = Object.fromEntries(
      Object.entries(props).filter(([key]) => 
        !['onDrag', 'onDragEnd', 'onDragStart', 'onAnimationStart', 'onAnimationEnd', 'onAnimationIteration'].includes(key)
      )
    );
    return (
      <motion.tr
        data-slot="table-row"
        className={cn(baseClasses, variantClasses[variant], className)}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        {...motionProps}
      />
    )
  }

  return (
    <tr
      data-slot="table-row"
      className={cn(baseClasses, variantClasses[variant], className)}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-foreground h-10 px-2 md:px-4 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-xs md:text-sm",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 md:p-4 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] text-xs md:text-sm",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}