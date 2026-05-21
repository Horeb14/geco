import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLots, getClients, getVentes, getPaiementsFournisseur, getRemboursements } from '../api';

const JOURS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const MOIS = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
const EMOJI = { mais: '🌽', soja: '🫘', mil: '🌾' };

export default function Accueil() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lots, setLots] = useState([]);
  const [clients, setClients] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [rembs, setRembs] = useState([]);
  const [histFilter, setHistFilter] = useState('all');
  const [retardOpen, setRetardOpen] = useState(false);
  const [rappelOpen, setRappelOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [l, c, v, p, r] = await Promise.all([
        getLots(), getClients(), getVentes(), getPaiementsFournisseur(), getRemboursements(),
      ]);
      setLots(l.data);
      setClients(c.data);
      setVentes(v.data);
      setPaiements(p.data);
      setRembs(r.data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const dateStr = `${JOURS[now.getDay()]} ${now.getDate()} ${MOIS[now.getMonth()]} ${now.getFullYear()} · Comé`;

  // Stock par produit
  const stock = { mais: 0, soja: 0, mil: 0 };
  lots.forEach(l => {
    if (l.quantite_restante > 0) stock[l.produit_nom?.toLowerCase().replace('ï', 'i').replace('maïs', 'mais')] =
      (stock[l.produit_nom?.toLowerCase().replace('ï', 'i').replace('maïs', 'mais')] || 0) + l.quantite_restante;
  });

  // Dette Maman Z = total lots crédit - paiements
  const detteMZ = lots
    .filter(l => l.mode_paiement === 'credit')
    .reduce((s, l) => s + l.prix_achat_sac * l.quantite_sacs, 0)
    - paiements.reduce((s, p) => s + p.montant, 0);

  // Clientes en retard (dette > 0 avec vente ancienne)
  const retard = clients.filter(c => c.solde_du > 0);
  const rappel = clients.filter(c => c.solde_du === 0 && c.solde_du !== undefined);

  // Historique
  const hist = buildHist(ventes, rembs, paiements, lots);
  const filteredHist = hist.filter(h => {
    if (histFilter === 'all') return true;
    if (histFilter === 'vente') return h.type === 'vente';
    if (histFilter === 'remb') return h.type === 'remb';
    if (histFilter === 'mz') return h.type === 'mz_remb' || h.type === 'mz_stock';
    return true;
  });

  const stockKeys = [
    { key: 'mais', label: 'sacs maïs' },
    { key: 'soja', label: 'sacs soja' },
    { key: 'mil', label: 'sacs mil' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Topbar */}
      <div style={{
        padding: '14px 18px 10px', background: 'var(--surface)',
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 700 }}>Bonjour {user?.nom?.split(' ')[0]} 👋</h2>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{dateStr}</p>
          </div>
          <button onClick={() => navigate('/profil')}
            style={{
              width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border)',
              background: 'var(--surface)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--muted)', fontSize: 19, cursor: 'pointer',
            }}>
            <i className="ti ti-user-circle" />
          </button>
        </div>
      </div>

      {/* Scroll */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 15px 88px' }}>
        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <StatCard label="Prochain marché" value="Sam. 24 mai" sub="dans 4 jours" subColor="var(--a500)" />
          <StatCard label="Tu dois à Maman Z"
            value={Math.max(0, detteMZ).toLocaleString('fr-FR')}
            sub="FCFA" valColor="var(--r600)" />
        </div>

        {/* Clientes en retard */}
        <CollapseBtn
          red open={retardOpen} onClick={() => setRetardOpen(o => !o)}
          icon="ti-alert-circle"
          label={`${retard.length} cliente${retard.length !== 1 ? 's' : ''} en retard`}
          count={retard.length}
        />
        {retardOpen && (
          <div style={{
            border: '1px solid var(--border)', borderRadius: 'var(--rad-lg)',
            overflow: 'hidden', marginBottom: 12, background: 'var(--surface)',
          }}>
            {retard.length === 0
              ? <EmptyRow text="Aucune cliente en retard 😊" />
              : retard.map(c => <ClienteRow key={c.id} c={c} type="red" />)}
          </div>
        )}

        {/* À rappeler */}
        <CollapseBtn
          amber open={rappelOpen} onClick={() => setRappelOpen(o => !o)}
          icon="ti-clock"
          label={`${rappel.length} à rappeler aujourd'hui`}
          count={rappel.length}
        />
        {rappelOpen && (
          <div style={{
            border: '1px solid var(--border)', borderRadius: 'var(--rad-lg)',
            overflow: 'hidden', marginBottom: 12, background: 'var(--surface)',
          }}>
            {rappel.length === 0
              ? <EmptyRow text="Aucune à rappeler" />
              : rappel.map(c => <ClienteRow key={c.id} c={c} type="amber" />)}
          </div>
        )}

        {/* Stock */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 10, marginTop: 4 }}>
          Sacs disponibles
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {stockKeys.map(({ key, label }) => {
            const nb = lots.filter(l => {
              const n = l.produit_nom?.toLowerCase();
              return n === key || (key === 'mais' && n === 'maïs');
            }).reduce((s, l) => s + l.quantite_restante, 0);
            const low = nb <= 2;
            return (
              <div key={key} style={{
                background: low ? 'var(--r50)' : 'var(--surface)',
                border: `1px solid ${low ? '#FECACA' : 'var(--border)'}`,
                borderRadius: 'var(--rad)', padding: 12, textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{EMOJI[key]}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: low ? 'var(--r600)' : 'var(--text)' }}>{nb}</div>
                <div style={{ fontSize: 11, color: low ? 'var(--r500)' : 'var(--muted)' }}>
                  {label}{low ? ' ⚠' : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Historique */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6, marginTop: 14, marginBottom: 10 }}>
          Historique des mouvements
        </div>
        <div style={{ display: 'flex', gap: 7, marginBottom: 12, overflowX: 'auto' }}>
          {[['all','Tout'],['vente','Ventes'],['remb','Remboursements'],['mz','Maman Z']].map(([f,l]) => (
            <button key={f} onClick={() => setHistFilter(f)} style={{
              padding: '6px 13px', borderRadius: 'var(--rad-f)', fontSize: 12, fontWeight: 600,
              border: '1.5px solid', cursor: 'pointer', whiteSpace: 'nowrap',
              borderColor: histFilter === f ? 'var(--g700)' : 'var(--border)',
              background: histFilter === f ? 'var(--g700)' : 'var(--surface)',
              color: histFilter === f ? '#fff' : 'var(--text)',
            }}>{l}</button>
          ))}
        </div>
        <HistList items={filteredHist} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, valColor, subColor }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--rad-lg)', padding: 16,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1, lineHeight: 1, color: valColor || 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 11, color: subColor || 'var(--muted)', marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function CollapseBtn({ red, amber, open, onClick, icon, label, count }) {
  const bg = red ? 'var(--r50)' : amber ? 'var(--a50)' : 'var(--surface)';
  const border = red ? '#FECACA' : amber ? '#FDE68A' : 'var(--border)';
  const color = red ? 'var(--r600)' : amber ? '#92400E' : 'var(--text)';
  const countBg = amber ? 'var(--a500)' : 'var(--r500)';
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '14px 16px', background: bg, border: `1px solid ${border}`,
      borderRadius: 'var(--rad-lg)', cursor: 'pointer', fontSize: 15, fontWeight: 700,
      color, marginBottom: 10,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 18 }} />
      <span>{label}</span>
      <span style={{
        marginLeft: 'auto', background: countBg, color: '#fff',
        fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--rad-f)',
      }}>{count}</span>
      <i className="ti ti-chevron-right" style={{
        fontSize: 16, color: 'var(--muted)',
        transform: open ? 'rotate(90deg)' : 'none', transition: '.2s',
      }} />
    </button>
  );
}

function ClienteRow({ c, type }) {
  const init = c.nom.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const colors = {
    red: ['var(--r100)', 'var(--r600)'],
    amber: ['var(--a100)', '#92400E'],
    ok: ['var(--g100)', 'var(--g700)'],
  };
  const [bg, fg] = colors[type] || colors.ok;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderTop: '1px solid var(--border)' }}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 13, fontWeight: 700, background: bg, color: fg, flexShrink: 0,
      }}>{init}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{c.nom}</div>
        {c.telephone && <div style={{ fontSize: 11, color: 'var(--muted)' }}>+229 {c.telephone}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: 'var(--g600)', fontWeight: 600 }}>
            Payé: {(c.solde_du === undefined ? 0 : 0).toLocaleString('fr-FR')} FCFA
          </span>
          <span style={{ fontSize: 11, color: 'var(--r600)', fontWeight: 600 }}>
            Doit: {(c.solde_du || 0).toLocaleString('fr-FR')} FCFA
          </span>
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

function EmptyRow({ text }) {
  return <div style={{ padding: 14, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>{text}</div>;
}

function HistList({ items }) {
  if (!items.length) return (
    <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
      Aucun mouvement enregistré
    </div>
  );

  const grouped = [];
  let lastDate = '';
  items.forEach(h => {
    const d = new Date(h.date);
    const ds = `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()].replace('.', '')}`;
    if (ds !== lastDate) { grouped.push({ dateStr: ds, items: [] }); lastDate = ds; }
    grouped[grouped.length - 1].items.push(h);
  });

  const colors = {
    vente: ['var(--g50)', 'var(--g700)', 'ti-shopping-cart'],
    remb: ['var(--a50)', 'var(--a500)', 'ti-coin'],
    mz_remb: ['var(--r50)', 'var(--r500)', 'ti-cash'],
    mz_stock: ['var(--g50)', 'var(--g600)', 'ti-package'],
  };

  return (
    <>
      {grouped.map((g, gi) => (
        <div key={gi}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5, padding: '8px 2px 6px' }}>
            {g.dateStr}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rad-lg)', overflow: 'hidden', marginBottom: 10 }}>
            {g.items.map((h, i) => {
              const c = colors[h.type] || colors.vente;
              const amtColor = h.signe === '+' ? 'var(--g700)' : h.signe === '-' ? 'var(--r600)' : 'var(--muted)';
              const prefix = h.signe === '+' ? '+' : h.signe === '-' ? '-' : '';
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 17, background: c[0], color: c[1], flexShrink: 0,
                  }}>
                    <i className={`ti ${c[2]}`} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13.5, fontWeight: 600 }}>{h.desc}</p>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{h.detail}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: amtColor, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {prefix}{h.montant.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function buildHist(ventes, rembs, paiements, lots) {
  const items = [];
  ventes.forEach(v => {
    items.push({
      type: 'vente',
      desc: `Vente · ${v.produit_nom} · ${v.unite_display}`,
      detail: `${fmtTime(v.date_vente)} · ${v.mode_paiement}${v.client_nom ? ' · ' + v.client_nom : ''}`,
      montant: v.montant_total,
      signe: v.mode_paiement === 'credit' ? '~' : '+',
      date: v.date_vente,
    });
  });
  rembs.forEach(r => {
    items.push({
      type: 'remb',
      desc: `Remboursement · ${r.client_nom}`,
      detail: fmtTime(r.date),
      montant: r.montant,
      signe: '+',
      date: r.date,
    });
  });
  paiements.forEach(p => {
    items.push({
      type: 'mz_remb',
      desc: `Paiement à ${p.fournisseur_nom}`,
      detail: fmtTime(p.date),
      montant: p.montant,
      signe: '-',
      date: p.date,
    });
  });
  lots.forEach(l => {
    items.push({
      type: 'mz_stock',
      desc: `Stock pris · ${l.produit_nom} ×${l.quantite_sacs} sacs`,
      detail: `${fmtTime(l.date_achat)} · +${(l.prix_achat_sac * l.quantite_sacs).toLocaleString('fr-FR')} FCFA de dette`,
      montant: l.prix_achat_sac * l.quantite_sacs,
      signe: '-',
      date: l.date_achat,
    });
  });
  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function fmtTime(d) {
  const dt = new Date(d);
  return dt.getHours().toString().padStart(2, '0') + ':' + dt.getMinutes().toString().padStart(2, '0');
}
