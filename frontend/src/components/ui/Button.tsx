import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'danger' | 'glow' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        variant === 'default' && 'bg-command-elevated hover:bg-white/10 text-white border border-white/10',
        variant === 'ghost' && 'hover:bg-white/5 text-command-muted hover:text-white',
        variant === 'danger' && 'bg-tier-5/20 hover:bg-tier-5/30 text-tier-5 border border-tier-5/30',
        variant === 'glow' && 'bg-command-glow/10 hover:bg-command-glow/20 text-command-glow border border-command-glow/30 shadow-glow',
        variant === 'outline' && 'border border-white/10 hover:border-command-glow/40 hover:text-command-glow',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
