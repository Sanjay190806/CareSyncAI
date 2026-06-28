import { cn } from '@/lib/utils';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  glow?: boolean;
}

export function GlassPanel({ children, className, elevated, glow }: GlassPanelProps) {
  return (
    <div
      className={cn(
        elevated ? 'glass-panel-elevated' : 'glass-panel',
        glow && 'shadow-glow border-command-glow/20',
        className,
      )}
    >
      {children}
    </div>
  );
}
