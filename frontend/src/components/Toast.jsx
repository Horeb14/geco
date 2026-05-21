import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState('');
  const [visible, setVisible] = useState(false);
  const timerRef = React.useRef(null);

  const showToast = useCallback((text) => {
    setMsg(text);
    setVisible(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 2500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : -70}px)`,
        background: 'var(--g800)',
        color: '#fff',
        padding: '11px 22px',
        borderRadius: 'var(--rad-f)',
        fontSize: 14,
        fontWeight: 600,
        zIndex: 999,
        transition: '.28s',
        whiteSpace: 'nowrap',
        boxShadow: '0 8px 24px rgba(0,0,0,.2)',
        pointerEvents: 'none',
      }}>
        {msg}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
