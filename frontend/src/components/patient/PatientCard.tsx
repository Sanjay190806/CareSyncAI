import { motion } from 'framer-motion';
import { BellOff, Heart, Thermometer, Wind } from 'lucide-react';
import {
  Button,
  DiagnosisTag,
  RiskRing,
  TierBadge,
} from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { useAlertResponse } from '@/runtime/AlertResponseProvider';
import { cn, TIER_COLORS, trendIcon } from '@/lib/utils';
import type { PatientSnapshot } from '@/types';

interface PatientCardProps {
  patient: PatientSnapshot;
}

export function PatientCard({ patient }: PatientCardProps) {
  const { openDrawer } = useCommandCenter();
  const { activeAlert, emergencyMode, acknowledge } = useAlertResponse();
  const tierColor = TIER_COLORS[patient.tier];
  const isCritical = patient.tier >= 4;
  const isCodeRedTarget = emergencyMode && activeAlert?.patientId === patient.id;

  return (
    <motion.div
      role="button"
      tabIndex={0}
      layout
      onClick={() => openDrawer(patient.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDrawer(patient.id);
        }
      }}
      className="text-left w-full"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <div
        className={cn(
          'glass-panel p-3 relative overflow-hidden transition-shadow duration-300',
          isCritical && 'shadow-glow-red',
          isCodeRedTarget && 'animate-pulse ring-2 ring-tier-5/60',
        )}
        style={{
          borderColor: `${tierColor}30`,
          boxShadow: isCritical ? `0 0 24px ${tierColor}25, inset 0 0 0 1px ${tierColor}20` : undefined,
        }}
      >
        {isCritical && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle at top right, ${tierColor}12, transparent 60%)` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}

        <div className="flex items-start justify-between gap-2 mb-2 relative">
          <div className="flex items-start gap-2 min-w-0">
            <PatientAvatar patient={patient} />
            <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">{patient.name}</h3>
              <span className="text-[10px] text-command-muted shrink-0">
                {patient.age}{patient.gender}
              </span>
            </div>
            <div className="text-[10px] text-command-muted truncate">
              {patient.room} · {patient.bedNumber ?? 'Bed --'} · {patient.ward ?? 'ICU'}
            </div>
            <DiagnosisTag label={patient.diagnosis} className="mt-1 inline-block" />
            </div>
          </div>
          <RiskRing score={patient.riskScore} tier={patient.tier} size={44} strokeWidth={3} />
        </div>

        <div className="mb-2 relative flex items-center justify-between gap-2">
          <TierBadge tier={patient.tier} pulse={patient.tier >= 4} />
          <span className={cn(
            'text-[9px] px-2 py-0.5 rounded border',
            patient.baselineStatus === 'Established' && 'border-tier-1/30 text-tier-1 bg-tier-1/10',
            patient.baselineStatus === 'Learning' && 'border-tier-2/30 text-tier-2 bg-tier-2/10',
            patient.baselineStatus === 'Needs Review' && 'border-tier-4/30 text-tier-4 bg-tier-4/10',
          )}>
            {patient.baselineStatus ?? 'Baseline'}
          </span>
        </div>

        {isCodeRedTarget && (
          <Button
            variant="danger"
            size="sm"
            className="relative mb-3 w-full bg-tier-5 text-white hover:bg-tier-5/90 border-tier-5 shadow-glow-red"
            onClick={(event) => {
              event.stopPropagation();
              void acknowledge();
            }}
          >
            <BellOff className="w-3.5 h-3.5" />
            Turn off alarm
          </Button>
        )}

        <div className="grid grid-cols-3 gap-x-2 gap-y-1 mb-3 relative">
          <Vital label="SpO₂" value={`${patient.spo2}%`} warn={patient.spo2 < 90} />
          <Vital label="HR" value={`${patient.heartRate}`} icon={Heart} warn={patient.heartRate > 120} pulse={patient.heartRate} />
          <Vital label="BP" value={`${patient.bloodPressure}`} warn={patient.bloodPressure < 90} />
          <Vital label="Temp" value={`${patient.temperature}°`} icon={Thermometer} />
          <Vital label="RR" value={`${patient.respiratoryRate}`} icon={Wind} warn={patient.respiratoryRate > 24} />
          <Vital
            label="Trend"
            value={trendIcon(patient.trend)}
            className={cn(
              patient.trend === 'up' && 'text-tier-1',
              patient.trend === 'down' && 'text-tier-5',
              patient.trend === 'flat' && 'text-command-muted',
            )}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-command-muted relative">
          <span>Updated {patient.lastUpdated}</span>
          {patient.alerts.length > 0 && (
            <span className="text-tier-4 font-medium">{patient.alerts[0]}</span>
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-white/[0.05] grid grid-cols-3 gap-2 text-[9px] text-command-muted relative">
          <span>Rank #{patient.urgencyRank ?? '-'}</span>
          <span>Δ {patient.riskVelocity != null && patient.riskVelocity >= 0 ? '+' : ''}{patient.riskVelocity ?? 0}</span>
          <span>10m {patient.prediction10Min?.riskForecast10Min ?? patient.riskScore}</span>
        </div>
      </div>
    </motion.div>
  );
}

function PatientAvatar({ patient }: { patient: PatientSnapshot }) {
  const initials = patient.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-9 h-9 rounded-md bg-command-elevated border border-white/10 overflow-hidden shrink-0">
      {patient.photoUrl ? (
        <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full grid place-items-center text-[11px] font-semibold text-command-glow bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(255,255,255,0.04))]">
          {initials}
        </div>
      )}
    </div>
  );
}

function Vital({
  label,
  value,
  icon: Icon,
  warn,
  pulse,
  className,
}: {
  label: string;
  value: string;
  icon?: typeof Heart;
  warn?: boolean;
  pulse?: number;
  className?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] uppercase tracking-wider text-command-muted flex items-center gap-0.5">
        {Icon && <Icon className="w-2.5 h-2.5" />}
        {label}
      </span>
      <span
        className={cn(
          'text-xs font-mono font-semibold',
          warn && 'text-tier-4',
          pulse && pulse > 100 && 'animate-pulse',
          className,
        )}
      >
        {value}
      </span>
    </div>
  );
}
