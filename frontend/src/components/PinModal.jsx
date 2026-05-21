import React, { useRef } from 'react';
import { verifyPin } from '../api';
import { useToast } from './Toast';

export default function PinModal({ open, onClose, onSuccess }) {
  const showToast = useToast();
  const refs = [useRef(), useRef(), useRef(), useRef()];

  const getCode = () => refs.map(r => r.current?.value || '').join('');

  const clear = () => refs.forEach(r => { if (r.current) r.current.value = ''; });

  const handleInput = (i) => (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(-1);
    if (e.target.value && i < 3) refs[i + 1].current?.focus();
  };

  const confirm = async () => {
    const code = getCode();
    if (code.length < 4) { showToast('Entre les 4 chiffres'); return; }
    try {
      const { data } = await verifyPin(code);
      if (data.valid) {
        clear();
        onClose();
        onSuccess();
        showToast('Code correct ✓');
      } else {
        clear();
        refs[0].current?.focus();
        showToast('Code incorrect ✗');
      }
    } catch {
      showToast('Erreur réseau');
    }
  };

  if (!open) return null;

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) { clear(); onClose(); } }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', zIndex: 300,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '24px 24px 0 0',
        padding: '20px 18px 36px', width: '100%', maxWidth: 390, textAlign: 'center',
      }}>
        <div style={{ width: 34, height: 4, background: 'var(--border)', borderRadius: 'var(--rad-f)', margin: '0 auto 18px' }} />
        <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>Entre ton code PIN</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Pour protéger tes données</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20 }}>
          {refs.map((r, i) => (
            <input key={i} ref={r}
              type="password" maxLength={1} inputMode="numeric"
              onInput={handleInput(i)}
              style={{
                width: 56, height: 60, textAlign: 'center', fontSize: 26, fontWeight: 800,
                border: '1.5px solid var(--border)', borderRadius: 'var(--rad)', outline: 'none',
                background: 'var(--surface)', color: 'var(--text)',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--g700)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          ))}
        </div>
        <button onClick={confirm}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '14px 18px', borderRadius: 'var(--rad)', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', border: 'none', width: '100%',
            background: 'var(--g700)', color: '#fff', marginBottom: 8,
          }}>
          <i className="ti ti-check" /> Confirmer
        </button>
        <button onClick={() => { clear(); onClose(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '14px 18px', borderRadius: 'var(--rad)', fontSize: 15, fontWeight: 700,
            cursor: 'pointer', border: '1.5px solid var(--border)', width: '100%',
            background: 'transparent', color: 'var(--text)',
          }}>
          Annuler
        </button>
      </div>
    </div>
  );
}
