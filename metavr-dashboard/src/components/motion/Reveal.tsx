'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
}

export function Reveal({ children, delay = 0 }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}

export default Reveal;


