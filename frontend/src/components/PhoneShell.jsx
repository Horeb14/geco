import React from 'react';

const styles = {
  phone: {
    width: 390,
    minHeight: 844,
    background: 'var(--bg)',
    borderRadius: 40,
    overflow: 'hidden',
    boxShadow: '0 32px 80px rgba(0,0,0,.28)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
};

export default function PhoneShell({ children }) {
  return <div style={styles.phone}>{children}</div>;
}
