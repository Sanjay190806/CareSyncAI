import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TypingTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypingText({ text, speed = 18, className, onComplete }: TypingTextProps) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(timer);
        setDone(true);
        onComplete?.();
      }
    }, speed);
    return () => window.clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <motion.p className={className} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}>
      {displayed}
      {!done && (
        <motion.span
          className="inline-block w-0.5 h-4 bg-command-glow ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </motion.p>
  );
}
