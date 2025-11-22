'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
}

export function HoverCard({ children, className }: HoverCardProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
    >
      {children}
    </motion.div>
  );
}

export default HoverCard;


