import React, { useRef } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LeaveProvider } from '../../context/LeaveContext';
import { GridScan } from './GridScan';
import { Navbar } from './Navbar';

export const Layout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <LeaveProvider>
      <div className="fixed inset-0 z-0 pointer-events-none bg-slate-950">
        <GridScan
          sensitivity={0.55}
          lineThickness={1.5}
          linesColor="#22d3ee"
          gridScale={0.1}
          scanColor="#c084fc"
          scanOpacity={0.85}
          enablePost
          bloomIntensity={1.2}
          chromaticAberration={0.003}
          noiseIntensity={0.015}
        />
      </div>
      <div className="flex flex-col h-screen overflow-hidden bg-slate-950/60 backdrop-blur-[2px] relative z-10 text-slate-200 font-sans selection:bg-cyan-500/30">
        <Navbar />

        <main className="flex-1 overflow-y-auto outline-none pt-[64px]" tabIndex="-1">
          <div className="px-4 py-8 sm:px-8 lg:px-10 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </LeaveProvider>
  );
};
