"use client";

import { motion } from "motion/react";

export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        type: "spring",
        stiffness: 90,
        damping: 18,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
