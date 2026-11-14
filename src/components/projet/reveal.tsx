"use client";

import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

/** Respecte le réglage « réduire les animations » du système pour toute la page. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Décalage vertical de départ, en px. */
  y?: number;
}

/** Fait apparaître son contenu en douceur quand il entre à l'écran. */
export function Reveal({ children, className, delay = 0, y = 20 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ type: "spring", bounce: 0, duration: 0.7, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Trait qui se dessine entre les étapes du schéma. */
export function DrawLine({ className }: { className?: string }) {
  return (
    <motion.div
      aria-hidden
      className={className}
      initial={{ scaleX: 0, scaleY: 0 }}
      whileInView={{ scaleX: 1, scaleY: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
    />
  );
}

/** Léger flottement continu (maquette du téléphone). */
export function Float({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} animate={{ y: [0, -8, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
      {children}
    </motion.div>
  );
}
