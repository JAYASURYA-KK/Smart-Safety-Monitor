import { useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import type { PageId } from './components/Sidebar';
import { Overview } from './pages/Overview';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { SafetyAlerts } from './pages/SafetyAlerts';
import { Analytics } from './pages/Analytics';
import { EventHistory } from './pages/EventHistory';
import { SystemModel } from './pages/SystemModel';
import { Settings } from './pages/Settings';
import { FullscreenCameraModal } from './components/FullscreenCameraModal';
import type { CameraStatus } from './types';

export function App() {
  const { telemetry, isConnected } = useWebSocket();
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [expandedCamera, setExpandedCamera] = useState<CameraStatus | null>(null);

  const activeAlertsCount = telemetry.system.total_active_violations;

  const renderContent = () => {
    switch (activePage) {
      case 'overview':
        return (
          <Overview
            telemetry={telemetry}
            onNavigate={(page) => setActivePage(page as PageId)}
            onExpandCamera={(cam) => setExpandedCamera(cam)}
          />
        );
      case 'monitoring':
        return (
          <LiveMonitoring
            telemetry={telemetry}
            onExpandCamera={(cam) => setExpandedCamera(cam)}
          />
        );
      case 'alerts':
        return <SafetyAlerts />;
      case 'analytics':
        return <Analytics />;
      case 'history':
        return <EventHistory />;
      case 'system':
        return <SystemModel />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <Overview
            telemetry={telemetry}
            onNavigate={(page) => setActivePage(page as PageId)}
            onExpandCamera={(cam) => setExpandedCamera(cam)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar telemetry={telemetry} wsConnected={isConnected} />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <Sidebar
          activePage={activePage}
          onSelectPage={(page) => setActivePage(page)}
          activeAlertsCount={activeAlertsCount}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-br from-slate-950 via-slate-900/40 to-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Fullscreen Camera Modal */}
      <FullscreenCameraModal
        camera={expandedCamera}
        onClose={() => setExpandedCamera(null)}
      />
    </div>
  );
}

export default App;
