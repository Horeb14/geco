import { useState, useEffect, useCallback } from 'react';
import { getClients, createClient } from '../api';
import { useToast } from '../components/Toast';

export default function Clientes() {
  const showToast = useToast();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [ncNom, setNcNom] = useState('');
  const [ncTel, setNcTel] = useState('');
  const [ncLimit, setNcLimit] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await getClients();
      setClients(data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = clients.filter(c => {
    const ms = c.nom.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'all'
      || (filter === 'retard' && c.solde_du > 0)
      || (filter === 'ok' && c.solde_du === 0);
    return ms && mf;
  });

  const addClient = async () => {
    if (!ncNom.trim()) { showToast('Entre le nom de la cliente'); return; }
    setSaving(true);
    try {
      await createClient({
        nom: ncNom.trim(),
        telephone: ncTel,
        limite_credit: parseInt(ncLimit) || 50000,
      });
      await load();
      setModalOpen(false);
      setNcNom(''); setNcTel(''); setNcLimit('');
      showToast(`${ncNom} ajoutée ✓`);
    } catch { showToast('Erreur lors de l\'ajout'); }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>Mes clientes</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 15px 88px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)', fontSize: 17 }} />
          <input type="text" placeholder="Chercher..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px 12px 38px', border: '1.5px solid var(--border)',
              borderRadius: 'var(--rad)', fontSize: 14, outline: 'none', background: 'var(--surface)',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--g700)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
          {[['all','Toutes'],['retard','En retard'],['ok','À jour']].map(([f,l]) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 13px', borderRadius: 'var(--rad-f)', fontSize: 12, fontWeight: 600,
              border: '1.5px solid', cursor: 'pointer',
              borderColor: filter === f ? 'var(--g700)' : 'var(--border)',
              background: filter === f ? 'var(--g700)' : 'var(--surface)',
              color: filter === f ? '#fff' : 'var(--text)',
            }}>{l}</button>
          ))}
        </div>

        {/* List */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--rad-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {filtered.length === 0
            ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                {clients.length === 0
                  ? <>Aucune cliente enregistrée.<br />Appuie sur + pour en ajouter.</>
                  : 'Aucun résultat'}
              </div>
            )
            : filtered.map((c, i) => (
              <ClienteRow key={c.id} c={c} first={i === 0} />
            ))}
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => setModalOpen(true)} style={{
        position: 'absolute', bottom: 84, right: 18, width: 54, height: 54,
        borderRadius: '50%', background: 'var(--a500)', color: '#fff', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
        cursor: 'pointer', boxShadow: '0 6px 20px rgba(232,144,10,.4)', zIndex: 99,
      }}>
        <i className="ti ti-plus" />
      </button>

      {/* Modal Ajouter cliente */}
      {modalOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', zIndex: 300,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '24px 24px 0 0',
            padding: '20px 18px 36px', width: '100%', maxWidth: 390,
          }}>
            <div style={{ width: 34, height: 4, background: 'var(--border)', borderRadius: 'var(--rad-f)', margin: '0 auto 18px' }} />
            <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 18 }}>Ajouter une cliente</h3>
            <Lbl>Son nom</Lbl>
            <Inp placeholder="Ex : Fatoumata Diallo" value={ncNom} onChange={e => setNcNom(e.target.value)} />
            <Lbl>Son numéro</Lbl>
            <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 'var(--rad)', overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '13px 11px', background: 'var(--bg)', fontSize: 13, fontWeight: 700, color: 'var(--g700)', borderRight: '1.5px solid var(--border)' }}>
                🇧🇯 +229
              </div>
              <input type="tel" maxLength={10} placeholder="01 23 45 67 89"
                value={ncTel} onChange={e => setNcTel(e.target.value.replace(/[^0-9]/g, ''))}
                style={{ flex: 1, border: 'none', padding: '13px 12px', fontSize: 15, outline: 'none', background: 'transparent' }} />
            </div>
            <Lbl>Limite de crédit (FCFA)</Lbl>
            <div style={{ position: 'relative' }}>
              <Inp type="number" inputMode="numeric" placeholder="Ex : 50 000"
                value={ncLimit} onChange={e => setNcLimit(e.target.value)}
                style={{ paddingRight: 56, marginBottom: 14 }} />
              <span style={{ position: 'absolute', right: 13, top: 14, color: 'var(--muted)', fontSize: 13 }}>FCFA</span>
            </div>
            <Btn onClick={addClient} disabled={saving}>
              <i className="ti ti-check" /> {saving ? 'Enregistrement...' : 'Enregistrer la cliente'}
            </Btn>
            <Btn variant="outline" onClick={() => setModalOpen(false)} style={{ marginTop: 8 }}>
              Annuler
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function ClienteRow({ c, first }) {
  const init = c.nom.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const late = c.solde_du > 0;
  const [bg, fg] = late ? ['var(--r100)', 'var(--r600)'] : ['var(--g100)', 'var(--g700)'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px',
      borderTop: first ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 13, fontWeight: 700, background: bg, color: fg, flexShrink: 0,
      }}>{init}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{c.nom}</div>
        {c.telephone && <div style={{ fontSize: 11, color: 'var(--muted)' }}>+229 {c.telephone}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: 'var(--g600)', fontWeight: 600 }}>
            Limite: {c.limite_credit.toLocaleString('fr-FR')} FCFA
          </span>
          {c.solde_du > 0 && (
            <span style={{ fontSize: 11, color: 'var(--r600)', fontWeight: 600 }}>
              Doit: {c.solde_du.toLocaleString('fr-FR')} FCFA
            </span>
          )}
        </div>
      </div>
      {c.telephone && (
        <a href={`tel:+229${c.telephone}`} style={{
          width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--g100)',
          background: 'var(--g50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--g700)', fontSize: 19, flexShrink: 0, textDecoration: 'none',
        }}>
          <i className="ti ti-phone" />
        </a>
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
      background: 'var(--surface)', marginBottom: 0, ...style,
    }}
      onFocus={e => e.target.style.borderColor = 'var(--g700)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
      {...props} />
  );
}

function Btn({ children, variant, style, ...props }) {
  return (
    <button style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      padding: '14px 18px', borderRadius: 'var(--rad)', fontSize: 15, fontWeight: 700,
      cursor: props.disabled ? 'not-allowed' : 'pointer', width: '100%',
      background: variant === 'outline' ? 'transparent' : 'var(--g700)',
      color: variant === 'outline' ? 'var(--text)' : '#fff',
      border: variant === 'outline' ? '1.5px solid var(--border)' : 'none',
      opacity: props.disabled ? .7 : 1,
      ...style,
    }} {...props}>
      {children}
    </button>
  );
}
