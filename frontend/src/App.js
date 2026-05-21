import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import BottomNav from './components/BottomNav';
import Auth from './screens/Auth';
import Accueil from './screens/Accueil';
import Ventes from './screens/Ventes';
import MamanZ from './screens/MamanZ';
import Clientes from './screens/Clientes';
import Profil from './screens/Profil';

function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        width: 390, minHeight: 844, background: 'var(--bg)',
        borderRadius: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 32px 80px rgba(0,0,0,.28)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 46, fontWeight: 800, color: 'var(--g700)', letterSpacing: -2 }}>
            Gé<span style={{ color: 'var(--a500)' }}>co</span>
          </h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        width: 390, minHeight: 844, background: 'var(--bg)',
        borderRadius: 40, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,.28)', display: 'flex', flexDirection: 'column',
      }}>
        <Routes>
          <Route path="/" element={<Auth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div style={{
      width: 390, minHeight: 844, background: 'var(--bg)',
      borderRadius: 40, overflow: 'hidden',
      boxShadow: '0 32px 80px rgba(0,0,0,.28)',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 0 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/accueil" replace />} />
          <Route path="/accueil" element={<Accueil />} />
          <Route path="/ventes" element={<Ventes />} />
          <Route path="/mamanz" element={<MamanZ />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="*" element={<Navigate to="/accueil" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
