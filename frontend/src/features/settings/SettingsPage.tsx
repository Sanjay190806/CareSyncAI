import { GlassPanel } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { useRealtimeSync } from '@/runtime/RealtimeSyncProvider';
import { env } from '@/config/env';

export function SettingsPage() {
  const { wsStatus, operationMode, setOperationMode } = useCommandCenter();
  const { mode, lastSync, backendOnline } = useRealtimeSync();

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold">Settings</h2>
        <p className="text-sm text-command-muted">System configuration</p>
      </div>

      <GlassPanel className="p-4 space-y-4">
        <SettingRow label="WebSocket Status" value={wsStatus} />
        <SettingRow label="Sync Mode" value={mode.toUpperCase()} />
        <SettingRow label="Backend Online" value={backendOnline ? 'Yes' : 'No (mock fallback)'} />
        <SettingRow label="Last Sync" value={lastSync ?? '—'} />
        <SettingRow label="Poll Interval" value={`${env.pollIntervalMs / 1000}s`} />
        <SettingRow label="Operation Mode" value={operationMode} />
        <SettingRow label="Hospital" value="Metro General Hospital" />
        <SettingRow label="Unit" value="ICU — Bay 3" />
        <SettingRow label="Runtime" value="Phase 8 Production Layer" />

        <div>
          <label className="text-xs text-command-muted uppercase tracking-wider">Operation Mode</label>
          <select
            value={operationMode}
            onChange={(e) => setOperationMode(e.target.value as typeof operationMode)}
            className="mt-1 w-full bg-command-elevated border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-command-glow/40"
          >
            <option value="ICU">ICU</option>
            <option value="Ward">Ward</option>
            <option value="Ambulance">Ambulance</option>
            <option value="RPM">RPM</option>
          </select>
        </div>
      </GlassPanel>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
      <span className="text-sm text-command-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
