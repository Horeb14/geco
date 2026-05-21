import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const tabs = [
  { path: '/accueil', icon: 'ti-home', label: 'Accueil' },
  { path: '/ventes', icon: 'ti-shopping-cart-plus', label: 'Vendre' },
  { path: '/mamanz', icon: 'ti-truck-delivery', label: 'Maman Z' },
  { path: '/clientes', icon: 'ti-users', label: 'Clientes' },
  { path: '/profil', icon: 'ti-user-circle', label: 'Profil' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'var(--surface)', borderTop: '1px solid var(--border)',
      display: 'flex', padding: '6px 0 18px', zIndex: 100,
    }}>
      {tabs.map(t => {
        const active = pathname === t.path;
        return (
          <button key={t.path}
            onClick={() => navigate(t.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, border: 'none', background: 'none', cursor: 'pointer', padding: '5px 0',
            }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 22, color: active ? 'var(--g700)' : 'var(--faint)' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--g700)' : 'var(--faint)' }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
