import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NarrativeIntelligenceProvider } from '@/context/NarrativeIntelligenceContext';
import { CommandCenterProvider } from '@/context/CommandCenterContext';
import { AlertResponseProvider } from '@/runtime/AlertResponseProvider';
import { RealtimeSyncProvider } from '@/runtime/RealtimeSyncProvider';
import { DashboardPage } from '@/features/dashboard';
import { PatientsPage } from '@/features/patients';
import { AlertsPage } from '@/features/alerts';
import { AnalyticsPage } from '@/features/analytics';
import { ShiftReportPage } from '@/features/shift-report';
import { InsightsPage } from '@/features/insights/InsightsPage';
import { DemoPage } from '@/features/demo';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { PatientCheckerPage } from '@/features/patient-checker';

export default function App() {
  return (
    <ErrorBoundary>
      <CommandCenterProvider>
        <RealtimeSyncProvider>
          <NarrativeIntelligenceProvider>
            <AlertResponseProvider>
              <BrowserRouter>
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="patients" element={<PatientsPage />} />
                    <Route path="alerts" element={<AlertsPage />} />
                    <Route path="insights" element={<InsightsPage />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="shift-report" element={<ShiftReportPage />} />
                    <Route path="patient-checker" element={<PatientCheckerPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="demo" element={<DemoPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </AlertResponseProvider>
          </NarrativeIntelligenceProvider>
        </RealtimeSyncProvider>
      </CommandCenterProvider>
    </ErrorBoundary>
  );
}
