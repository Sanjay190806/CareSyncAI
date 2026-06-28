import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  ClipboardList,
  LayoutDashboard,
  Settings,
  Stethoscope,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patients', icon: Activity, label: 'Patients' },
  { to: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { to: '/insights', icon: Brain, label: 'AI Insights' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/shift-report', icon: ClipboardList, label: 'Shift Reports' },
  { to: '/patient-checker', icon: Stethoscope, label: 'Patient Checker' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/demo', icon: Zap, label: 'Demo Mode' },
];

export function Sidebar() {
  return (
    <aside className="w-52 shrink-0 border-r border-white/[0.08] bg-command-surface/40 backdrop-blur-xl flex flex-col py-4">
      <nav className="flex-1 px-2 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <motion.div
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                  isActive ? 'text-white' : 'text-command-muted hover:text-white hover:bg-white/[0.04]',
                )}
                whileHover={{ x: 2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-command-glow/10 border border-command-glow/20 shadow-glow"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    'w-4 h-4 relative z-10 transition-colors',
                    isActive ? 'text-command-glow' : 'group-hover:text-command-glow/70',
                  )}
                />
                <span className="relative z-10 font-medium">{label}</span>
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pt-4 border-t border-white/[0.06] mx-2">
        <p className="text-[10px] text-command-muted uppercase tracking-wider">System</p>
        <p className="text-xs text-tier-1 mt-1 font-mono">v8.0 · Production ICU</p>
      </div>
    </aside>
  );
}
