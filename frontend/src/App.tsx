import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { User } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Overview } from './pages/Overview';
import { NewInvestigation } from './pages/NewInvestigation';
import { InvestigationResult } from './pages/InvestigationResult';
import { IncidentHistory } from './pages/IncidentHistory';
import { EvidenceExplorerPage } from './pages/EvidenceExplorerPage';
import { ServiceMapPage } from './pages/ServiceMapPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProjectGuidePage } from './pages/ProjectGuidePage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('incidentiq_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentPage, setCurrentPage] = useState<string>('overview');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [backendHealthy, setBackendHealthy] = useState<boolean>(false);

  // Check health periodically
  useEffect(() => {
    const check = async () => {
      try {
        await api.checkHealth();
        setBackendHealthy(true);
      } catch {
        setBackendHealthy(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen for 401 session expiration
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setAuthView('login');
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    setAuthView('login');
  };

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    setCurrentPage('investigation-result');
  };

  if (!user) {
    if (authView === 'register') {
      return (
        <Register
          onRegisterSuccess={(u) => {
            setUser(u);
            setCurrentPage('overview');
          }}
          onNavigateToLogin={() => setAuthView('login')}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={(u) => {
          setUser(u);
          setCurrentPage('overview');
        }}
        onNavigateToRegister={() => setAuthView('register')}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#080c14] text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => {
          setCurrentPage(page);
          if (page !== 'investigation-result') {
            setSelectedIncidentId(null);
          }
        }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        user={user}
        onLogout={handleLogout}
        backendHealthy={backendHealthy}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          currentPage={currentPage}
          onNavigate={(page) => {
            setCurrentPage(page);
            if (page !== 'investigation-result') {
              setSelectedIncidentId(null);
            }
          }}
          user={user}
          backendHealthy={backendHealthy}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {currentPage === 'overview' && (
            <Overview
              onNavigate={(page) => setCurrentPage(page)}
              onSelectIncident={handleSelectIncident}
            />
          )}

          {currentPage === 'new-investigation' && (
            <NewInvestigation
              onInvestigationComplete={(incId) => {
                setSelectedIncidentId(incId);
                setCurrentPage('investigation-result');
              }}
              onCancel={() => setCurrentPage('overview')}
            />
          )}

          {currentPage === 'investigation-result' && selectedIncidentId && (
            <InvestigationResult
              incidentId={selectedIncidentId}
              onBack={() => setCurrentPage('overview')}
            />
          )}

          {currentPage === 'history' && (
            <IncidentHistory
              onSelectIncident={handleSelectIncident}
              onNewInvestigation={() => setCurrentPage('new-investigation')}
            />
          )}

          {currentPage === 'evidence-explorer' && (
            <EvidenceExplorerPage
              onSelectIncident={handleSelectIncident}
            />
          )}

          {currentPage === 'service-map' && (
            <ServiceMapPage
              onSelectIncident={handleSelectIncident}
            />
          )}

          {currentPage === 'reports' && (
            <ReportsPage
              onSelectIncident={handleSelectIncident}
            />
          )}

          {currentPage === 'guide' && (
            <ProjectGuidePage />
          )}

          {currentPage === 'settings' && (
            <SettingsPage
              user={user}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>
    </div>
  );
};
export default App;
