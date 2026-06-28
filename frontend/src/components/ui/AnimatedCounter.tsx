import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({ value, suffix = '', className }: AnimatedCounterProps) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v));
  const [shown, setShown] = useState(0);

  useEffect(() => {
    spring.set(value);
    return display.on('change', (v) => setShown(v));
  }, [value, spring, display]);

  return (
    <motion.span className={className} key={shown}>
      {shown}
      {suffix}
    </motion.span>
  );
}
