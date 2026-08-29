import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { ComposeModal } from '../components/compose/ComposeModal';
import { DevSandboxDrawer } from '../components/demo/DevSandboxDrawer';

export const DashboardLayout: React.FC = () => {
  const [composeOpen, setComposeOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCampaignSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />

      <div className="flex-1 flex">
        <Sidebar onOpenCompose={() => setComposeOpen(true)} />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          <Outlet context={{ onOpenCompose: () => setComposeOpen(true), refreshKey }} />
        </main>
      </div>

      <ComposeModal
        isOpen={composeOpen}
        onClose={() => setComposeOpen(false)}
        onSuccess={handleCampaignSuccess}
      />

      <DevSandboxDrawer onCampaignCreated={handleCampaignSuccess} />
    </div>
  );
};
