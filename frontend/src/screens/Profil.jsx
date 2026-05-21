import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateMe, changePin } from '../api';
import { useToast } from '../components/Toast';
import PinModal from '../components/PinModal';

const PRODUITS = [
  { label: '🌽 Maïs', key: 'mais' },
  { label: '🫘 Soja', key: 'soja' },
  { label: '🌾 Mil', key: 'mil' },
];

export default function Profil() {
  const { user, logout, refreshUser } = useAuth();
  const showToast = useToast();
  const navigate = useNavigate();

  const [pinModal, setPinModal] = useState(false);
  const [pinCallback, setPinCallback] = useState(null);
  const [openSection, setOpenSection] = useState(null);

  const [nom, setNom] = useState(user?.nom || '');
  const [ville, setVille] = useState(user?.ville || '');
  const [newPin, setNewPin] = useState('');
  const [newPwd, setNewPwd] = useState('');

  const requirePin = (section) => {
    setPinCallback(() => () => {
      setOpenSection(prev => prev === section ? null : section);
    });
    setPinModal(true);
  };

  const saveProfil = async () => {
    try {
      await updateMe({ nom, ville });
      await refreshUser();
      showToast('Profil mis à jour ✓');
    } catch { showToast('Erreur'); }
  };

  const saveSecu = async () => {
    if (newPin && (newPin.length !== 4 || !/^\d+$/.test(newPin))) {
      showToast('PIN doit avoir 4 chiffres');
      return;
    }
    try {
      if (newPin) await changePin(newPin);
      if (newPwd) await updateMe({ password: newPwd });
      setNewPin(''); setNewPwd('');
      showToast('Sécurité mise à jour ✓');
    } catch { showToast('Erreur'); }
  };

  const doLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 19, fontWeight: 700 }}>Mon compte</h2>
          <button onClick={doLogout} style={{
            width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border)',
            background: 'var(--surface)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--muted)', fontSize: 19, cursor: 'pointer',
          }}>
            <i className="ti ti-logout" />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 15px 88px' }}>
        {/* Profil */}
        <AccordionSection
          icon="ti-user" label="Mon profil"
          open={openSection === 'profil'}
          onToggle={() => requirePin('profil')}
        >
          <Lbl>Prénom et nom</Lbl>
          <Inp value={nom} onChange={e => setNom(e.target.value)} />
          <Lbl>Mon numéro</Lbl>
          <div style={{ padding: '13px 14px', background: 'var(--bg)', borderRadius: 'var(--rad)', fontSize: 15, marginBottom: 14, color: 'var(--muted)' }}>
            +229 {user?.telephone}
          </div>
          <Lbl>Ma ville</Lbl>
          <Inp value={ville} onChange={e => setVille(e.target.value)} />
          <Lbl>Ce que je vends</Lbl>
          <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
            {PRODUITS.map(p => (
              <button key={p.key} style={{
                padding: '10px 16px', borderRadius: 'var(--rad-f)', border: '1.5px solid var(--g700)',
                fontSize: 13.5, fontWeight: 600, background: 'var(--g700)', color: '#fff', cursor: 'default',
              }}>{p.label}</button>
            ))}
          </div>
          <SmBtn onClick={saveProfil}><i className="ti ti-check" /> Enregistrer</SmBtn>
        </AccordionSection>

        {/* Maman Z */}
        <AccordionSection
          icon="ti-truck-delivery" label="Maman Z (fournisseur)"
          open={openSection === 'mz'}
          onToggle={() => requirePin('mz')}
        >
          <Lbl>Nom du fournisseur</Lbl>
          <Inp defaultValue="Maman Z" />
          <Lbl>Son numéro</Lbl>
          <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 'var(--rad)', overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '13px 11px', background: 'var(--bg)', fontSize: 13, fontWeight: 700, color: 'var(--g700)', borderRight: '1.5px solid var(--border)' }}>
              🇧🇯 +229
            </div>
            <input type="tel" maxLength={10} placeholder="01 97 00 11 22"
              style={{ flex: 1, border: 'none', padding: '13px 12px', fontSize: 15, outline: 'none', background: 'transparent' }} />
          </div>
          <Lbl>Marché tous les combien de jours ?</Lbl>
          <Inp type="number" defaultValue="5" inputMode="numeric" />
          <Lbl>Date du dernier marché</Lbl>
          <Inp type="date" defaultValue="2026-05-20" />
          <SmBtn onClick={() => showToast('Infos fournisseur mises à jour ✓')}>
            <i className="ti ti-check" /> Enregistrer
          </SmBtn>
        </AccordionSection>

        {/* Sécurité */}
        <AccordionSection
          icon="ti-lock" label="Sécurité"
          open={openSection === 'secu'}
          onToggle={() => requirePin('secu')}
        >
          <Lbl>Nouveau code PIN (4 chiffres)</Lbl>
          <Inp type="password" maxLength={4} inputMode="numeric" placeholder="••••"
            value={newPin} onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))} />
          <Lbl>Nouveau mot de passe</Lbl>
          <Inp type="password" placeholder="Minimum 6 caractères"
            value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          <SmBtn onClick={saveSecu}><i className="ti ti-check" /> Enregistrer</SmBtn>
        </AccordionSection>

        <button onClick={doLogout} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          padding: '14px 18px', borderRadius: 'var(--rad)', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', border: 'none', width: '100%', marginTop: 8,
          background: 'var(--r500)', color: '#fff',
        }}>
          <i className="ti ti-logout" /> Me déconnecter
        </button>
      </div>

      <PinModal
        open={pinModal}
        onClose={() => setPinModal(false)}
        onSuccess={() => { if (pinCallback) { pinCallback(); setPinCallback(null); } }}
      />
    </div>
  );
}

function AccordionSection({ icon, label, open, onToggle, children }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--rad-lg)', overflow: 'hidden', marginBottom: 10 }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 16,
        background: 'var(--surface)', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: 'var(--text)',
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 20, color: 'var(--g700)' }} />
        {label}
        <i className="ti ti-chevron-right" style={{
          marginLeft: 'auto', fontSize: 17, color: 'var(--muted)',
          transform: open ? 'rotate(90deg)' : 'none', transition: '.2s',
        }} />
      </button>
      {open && (
        <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Lbl({ children }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
      letterSpacing: .5, display: 'block', marginBottom: 6,
    }}>{children}</span>
  );
}

function Inp({ style, ...props }) {
  return (
    <input style={{
      width: '100%', padding: '13px 14px', border: '1.5px solid var(--border)',
      borderRadius: 'var(--rad)', fontSize: 15, color: 'var(--text)', outline: 'none',
      background: 'var(--surface)', marginBottom: 14, ...style,
    }}
      onFocus={e => e.target.style.borderColor = 'var(--g700)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
      {...props} />
  );
}

function SmBtn({ children, ...props }) {
  return (
    <button style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      padding: '10px 14px', borderRadius: 'var(--rad)', fontSize: 13, fontWeight: 700,
      cursor: 'pointer', border: 'none', background: 'var(--g700)', color: '#fff',
    }} {...props}>
      {children}
    </button>
  );
}
