import { motion } from 'framer-motion';
import { AlertOctagon, HeartPulse, Wind, Zap, Activity } from 'lucide-react';
import { Button, GlassPanel } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { useNarrativeIntelligence } from '@/context/NarrativeIntelligenceContext';
import type { CrisisScenario } from '@/types';

const SCENARIOS: { id: CrisisScenario; label: string; icon: typeof Zap; description: string; primary?: boolean }[] = [
  { id: 'copd', label: 'Simulate COPD Event', icon: Wind, description: 'Trigger COPD exacerbation on Patient 01' },
  { id: 'sepsis', label: 'Simulate Sepsis Event', icon: AlertOctagon, description: 'Activate sepsis cascade on Patient 02' },
  { id: 'cardiac', label: 'Simulate Cardiac Arrest', icon: HeartPulse, description: 'Cardiac crisis on Patient 04' },
  { id: 'respiratory', label: 'Simulate Respiratory Failure', icon: Activity, description: 'PE respiratory failure on Patient 06' },
  { id: 'patient7', label: 'Patient 7 Crisis', icon: Zap, description: 'Full respiratory failure demo sequence', primary: true },
];

interface DemoCrisisPanelProps {
  compact?: boolean;
}

export function DemoCrisisPanel({ compact }: DemoCrisisPanelProps) {
  const { triggerCrisis, crisisRunning, demoActive } = useCommandCenter();
  const { runPatient7NarrativeDemo, demoStageRunning } = useNarrativeIntelligence();
  const running = crisisRunning || demoStageRunning;

  return (
    <GlassPanel className={compact ? 'p-3' : 'p-5'} glow={running}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-command-glow" />
        <div>
          <h3 className="text-sm font-bold">Simulate Crisis</h3>
          {!compact && (
            <p className="text-[10px] text-command-muted">Trigger live deterioration scenarios</p>
          )}
        </div>
        {demoActive && (
          <motion.span
            className="ml-auto text-[10px] font-bold uppercase tracking-wider text-tier-5 px-2 py-0.5 rounded-full bg-tier-5/10 border border-tier-5/30"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {crisisRunning ? 'Running' : demoStageRunning ? 'Narrative Demo' : 'Active'}
          </motion.span>
        )}
      </div>

      <div className={compact ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
        {SCENARIOS.map((scenario) => (
          <Button
            key={scenario.id}
            variant={scenario.primary ? 'danger' : 'outline'}
            size={compact ? 'sm' : 'md'}
            className="w-full justify-start text-left"
            disabled={running}
            onClick={() => (scenario.primary ? runPatient7NarrativeDemo() : triggerCrisis(scenario.id))}
          >
            <scenario.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{scenario.label}</span>
          </Button>
        ))}
      </div>
    </GlassPanel>
  );
}
