import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GlassPanel } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { TIER_COLORS } from '@/lib/utils';

const TIER_NAMES = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5'];

export function AnalyticsPage() {
  const { patients } = useCommandCenter();

  const tierDistribution = [1, 2, 3, 4, 5].map((t) => ({
    name: TIER_NAMES[t - 1],
    count: patients.filter((p) => p.tier === t).length,
    tier: t,
  }));

  const riskBuckets = [
    { range: '0-20', count: patients.filter((p) => p.riskScore <= 20).length },
    { range: '21-40', count: patients.filter((p) => p.riskScore > 20 && p.riskScore <= 40).length },
    { range: '41-60', count: patients.filter((p) => p.riskScore > 40 && p.riskScore <= 60).length },
    { range: '61-80', count: patients.filter((p) => p.riskScore > 60 && p.riskScore <= 80).length },
    { range: '81-100', count: patients.filter((p) => p.riskScore > 80).length },
  ];

  const responseTime = [
    { hour: '06', ms: 98000 },
    { hour: '08', ms: 112000 },
    { hour: '10', ms: 89000 },
    { hour: '12', ms: 142000 },
    { hour: '14', ms: 118000 },
    { hour: '16', ms: 95000 },
    { hour: '18', ms: 134000 },
  ];

  const alertFrequency = [
    { day: 'Mon', alerts: 12 },
    { day: 'Tue', alerts: 18 },
    { day: 'Wed', alerts: 15 },
    { day: 'Thu', alerts: 22 },
    { day: 'Fri', alerts: 19 },
    { day: 'Sat', alerts: 11 },
    { day: 'Sun', alerts: 14 },
  ];

  const recoveryTrend = patients
    .filter((p) => p.trend === 'up')
    .slice(0, 6)
    .map((p) => ({ name: p.name.replace('Patient ', 'P'), delta: p.history[0]?.score - p.riskScore }));

  const chartTooltip = {
    contentStyle: { background: '#121A2B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 },
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Analytics</h2>
        <p className="text-sm text-command-muted">Unit performance & risk intelligence</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChartCard title="Tier Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={tierDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                {tierDistribution.map((entry) => (
                  <Cell key={entry.tier} fill={TIER_COLORS[entry.tier as 1|2|3|4|5]} />
                ))}
              </Pie>
              <Tooltip {...chartTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risk Score Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riskBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="range" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltip} />
              <Bar dataKey="count" fill="#22D3EE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Response Time (simulated)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={responseTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="hour" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}s`} />
              <Tooltip {...chartTooltip} formatter={(v: number) => [`${Math.round(v / 1000)}s`, 'Response']} />
              <Line type="monotone" dataKey="ms" stroke="#FBBF24" strokeWidth={2} dot={{ fill: '#FBBF24', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Alert Frequency">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={alertFrequency}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltip} />
              <Bar dataKey="alerts" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Recovery Trends" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={recoveryTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltip} formatter={(v: number) => [`+${v} pts`, 'Risk reduction']} />
              <Bar dataKey="delta" fill="#00CC66" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <GlassPanel className={`p-4 ${className ?? ''}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-command-muted mb-3">{title}</h3>
      {children}
    </GlassPanel>
  );
}
