import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { Sidebar } from './Sidebar';
import { LiveEventStream } from '@/components/events/LiveEventStream';
import { PatientDetailDrawer } from '@/components/patient/PatientDetailDrawer';

export function AppLayout() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopNav />
      <div className="flex-1 flex min-h-0">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 overflow-hidden">
            <Outlet />
          </div>
          <LiveEventStream />
        </main>
      </div>
      <PatientDetailDrawer />
    </div>
  );
}
