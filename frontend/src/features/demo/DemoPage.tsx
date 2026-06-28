import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { DemoCrisisPanel } from '@/components/demo/DemoCrisisPanel';
import { Button, GlassPanel } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { useNarrativeIntelligence } from '@/context/NarrativeIntelligenceContext';
import { PatientCard } from '@/components/patient/PatientCard';
import { getDemoStageCount, PATIENT_7_DEMO_STAGES } from '@/lib/narrative';

export function DemoPage() {
  const { patients, crisisRunning, demoActive } = useCommandCenter();
  const { runPatient7NarrativeDemo, demoStageIndex, demoStageRunning, getStoryBeats } = useNarrativeIntelligence();
  const patient7 = patients.find((p) => p.id === 'p7');
  const storyBeats = getStoryBeats('p7');

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Demo Mode</h2>
        <p className="text-sm text-command-muted">6-stage Patient 7 narrative crisis sequence for judges</p>
      </div>

      {(crisisRunning || demoStageRunning) && (
        <motion.div
          className="p-3 rounded-lg bg-tier-5/10 border border-tier-5/30 text-sm text-tier-5 text-center font-medium"
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          Narrative demo stage {demoStageIndex + 1} of {getDemoStageCount()} — watch Patient 07 clinical story unfold
        </motion.div>
      )}

      <GlassPanel className="p-4" glow>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-tier-5" />
              Patient 7 Crisis — Full Story Demo
            </h3>
            <p className="text-[10px] text-command-muted">6 stages: baseline → deviation → worsening → deterioration → CODE RED → recovery</p>
          </div>
          <Button variant="danger" disabled={demoStageRunning} onClick={runPatient7NarrativeDemo}>
            Run Full Demo
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PATIENT_7_DEMO_STAGES.map((stage, i) => (
            <div
              key={stage.stage}
              className={`p-2 rounded-lg border text-xs ${
                demoStageIndex === i ? 'border-tier-5/50 bg-tier-5/10' : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              <div className="font-medium">Stage {i + 1}</div>
              <div className="text-command-muted text-[10px]">{stage.storyBeat}</div>
            </div>
          ))}
        </div>
      </GlassPanel>

      <DemoCrisisPanel />

      {storyBeats.length > 0 && (
        <GlassPanel className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-command-muted mb-2">Clinical Story Timeline</h3>
          <ol className="space-y-1">
            {storyBeats.map((beat, i) => (
              <li key={i} className="text-xs text-white/80 flex gap-2">
                <span className="text-command-glow font-mono">{i + 1}.</span>
                {beat}
              </li>
            ))}
          </ol>
        </GlassPanel>
      )}

      <GlassPanel className="p-4">
        <h3 className="text-sm font-semibold mb-2">Demo Instructions</h3>
        <ol className="text-xs text-command-muted space-y-2 list-decimal list-inside">
          <li>Click <strong className="text-tier-5">Run Full Demo</strong> for the 6-stage Patient 7 narrative sequence</li>
          <li>Watch tier escalations and AI clinical reasoning update each stage</li>
          <li>CODE RED narrative triggers at Stage 5 with emergency interpretation</li>
          <li>Stage 6 shows intervention response and recovery narrative</li>
          <li>Live event stream and intelligence feed update in real time</li>
        </ol>
      </GlassPanel>

      {patient7 && demoActive && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-command-muted mb-2">Patient 07 — Live Monitor</h3>
          <div className="max-w-sm">
            <PatientCard patient={patient7} />
          </div>
        </div>
      )}
    </div>
  );
}
