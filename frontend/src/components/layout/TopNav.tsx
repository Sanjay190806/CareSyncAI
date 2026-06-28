import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Radio, Users } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { cn, formatTime, getShift } from '@/lib/utils';
import type { OperationMode } from '@/types';

const MODES: OperationMode[] = ['ICU', 'Ward', 'Ambulance', 'RPM'];

export function TopNav() {
  const { patients, activeAlertsCount, wsStatus, operationMode, setOperationMode } = useCommandCenter();
  const [clock, setClock] = useState(formatTime());
  const shift = getShift();

  useEffect(() => {
    const t = window.setInterval(() => setClock(formatTime()), 1000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <header className="h-14 shrink-0 border-b border-white/[0.08] bg-command-surface/60 backdrop-blur-xl px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-command-glow/30 to-tier-2/20 flex items-center justify-center border border-command-glow/30">
            <Activity className="w-4 h-4 text-command-glow" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight leading-none">CareSync AI</h1>
            <p className="text-[10px] text-command-muted">From Alarm Noise to Clinical Clarity</p>
          </div>
        </div>

        <div className="hidden lg:block h-6 w-px bg-white/10" />

        <div className="hidden lg:flex items-center gap-1 text-xs text-command-muted">
          <span className="text-white font-medium">Metro General Hospital</span>
          <span>·</span>
          <span className={cn(shift === 'Emergency' ? 'text-tier-5' : 'text-command-glow')}>{shift} Shift</span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <Stat icon={Users} label="Patients" value={patients.length} />
        <Stat icon={AlertTriangle} label="Alerts" value={activeAlertsCount} alert={activeAlertsCount > 0} />

        <div className="hidden md:flex items-center gap-1 p-0.5 rounded-lg bg-command-elevated/80 border border-white/[0.06]">
          {MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => setOperationMode(mode)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all',
                operationMode === mode
                  ? 'bg-command-glow/15 text-command-glow shadow-glow'
                  : 'text-command-muted hover:text-white',
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="font-mono text-sm tabular-nums text-command-muted hidden sm:block">{clock}</div>

        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
            wsStatus === 'LIVE'
              ? 'text-tier-1 border-tier-1/30 bg-tier-1/10'
              : 'text-tier-5 border-tier-5/30 bg-tier-5/10',
          )}
        >
          <Radio className={cn('w-3 h-3', wsStatus === 'LIVE' && 'animate-pulse')} />
          {wsStatus}
        </div>
      </div>
    </header>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('w-3.5 h-3.5', alert ? 'text-tier-4' : 'text-command-muted')} />
      <div className="text-right">
        <div className={cn('text-sm font-bold font-mono leading-none', alert && 'text-tier-4')}>
          <AnimatedCounter value={value} />
        </div>
        <div className="text-[9px] uppercase tracking-wider text-command-muted">{label}</div>
      </div>
    </div>
  );
}
