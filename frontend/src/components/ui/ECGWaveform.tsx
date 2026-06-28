import { motion } from 'framer-motion';

interface ECGWaveformProps {
  heartRate: number;
  color?: string;
  className?: string;
  height?: number;
}

export function ECGWaveform({ heartRate, color = '#22D3EE', className, height = 32 }: ECGWaveformProps) {
  const duration = 60 / Math.max(heartRate, 40);

  const path =
    'M0,16 L8,16 L12,16 L14,4 L16,28 L18,12 L22,16 L40,16 L44,16 L46,8 L48,24 L50,14 L54,16 L80,16 L84,16 L86,6 L88,26 L90,10 L94,16 L120,16';

  return (
    <div className={`overflow-hidden relative ${className ?? ''}`} style={{ height }}>
      <motion.svg
        viewBox="0 0 120 32"
        preserveAspectRatio="none"
        className="w-[200%] h-full"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: duration * 2, repeat: Infinity, ease: 'linear' }}
      >
        <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" opacity={0.15} transform="translate(120,0)" />
      </motion.svg>
      <div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-command-surface to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-command-surface to-transparent pointer-events-none" />
    </div>
  );
}
