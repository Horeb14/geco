import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLots, getClients, getVentes, getPaiementsFournisseur } from '../api';

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
  const [retardOpen, setRetardOpen] = useState(false);
  const [rappelOpen, setRappelOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [l, c, v, p] = await Promise.all([
        getLots(), getClients(), getVentes(), getPaiementsFournisseur(),
      ]);
      setLots(l.data);
      setClients(c.data);
      setVentes(v.data);
      setPaiements(p.data);
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

  // Clientes en retard = date d'échéance dépassée ET dette non soldée
  const retard = clients.filter(c => c.en_retard && c.solde_du > 0);
  // À rappeler = échéance dans ≤ 2 jours mais pas encore dépassée
  const rappel = clients.filter(c =>
    !c.en_retard && c.solde_du > 0 &&
    c.jours_restants !== null && c.jours_restants <= 2
  );

  // Bilan du jour
  const today = new Date().toDateString();
  const ventesAujourdhui = ventes.filter(v => new Date(v.date_vente).toDateString() === today);
  const encaisseAujourdhui = ventesAujourdhui
    .filter(v => v.mode_paiement === 'comptant')
    .reduce((s, v) => s + v.montant_total, 0);
  const creditAujourdhui = ventesAujourdhui
    .filter(v => v.mode_paiement !== 'comptant')
    .reduce((s, v) => s + v.montant_total, 0);
  const beneficeAujourdhui = ventesAujourdhui.reduce((s, v) => {
    const lot = lots.find(l => l.id === v.lot);
    if (!lot) return s;
    return s + (v.prix_unitaire - lot.prix_achat_sac) * parseFloat(v.quantite);
  }, 0);

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

        {/* Bilan du jour */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6, marginTop: 14, marginBottom: 10 }}>
          Bilan du jour — {ventesAujourdhui.length} vente{ventesAujourdhui.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
          <div style={{ background: 'var(--g50)', border: '1.5px solid var(--g100)', borderRadius: 'var(--rad-lg)', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--g600)', marginBottom: 5 }}>Encaissé</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--g700)', letterSpacing: -1 }}>
              {encaisseAujourdhui.toLocaleString('fr-FR')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--g600)', marginTop: 2 }}>FCFA · comptant</div>
          </div>
          <div style={{ background: 'var(--a50)', border: '1.5px solid var(--a100)', borderRadius: 'var(--rad-lg)', padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--a500)', marginBottom: 5 }}>Crédit accordé</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#92400E', letterSpacing: -1 }}>
              {creditAujourdhui.toLocaleString('fr-FR')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--a500)', marginTop: 2 }}>FCFA · à récupérer</div>
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--rad-lg)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Bénéfice estimé</div>
            <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>sur les ventes du jour</div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: beneficeAujourdhui >= 0 ? 'var(--g700)' : 'var(--r600)', letterSpacing: -1 }}>
            {beneficeAujourdhui >= 0 ? '+' : ''}{Math.round(beneficeAujourdhui).toLocaleString('fr-FR')} FCFA
          </div>
        </div>
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--r600)', fontWeight: 700 }}>
            Doit : {(c.solde_du || 0).toLocaleString('fr-FR')} FCFA
          </span>
          {c.date_echeance_proche && (
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              · avant le {new Date(c.date_echeance_proche).getDate()} {['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'][new Date(c.date_echeance_proche).getMonth()]}
            </span>
          )}
          {c.jours_restants !== null && c.jours_restants !== undefined && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--rad-f)',
              background: c.jours_restants < 0 ? 'var(--r50)' : 'var(--a50)',
              color: c.jours_restants < 0 ? 'var(--r600)' : '#92400E',
            }}>
              {c.jours_restants < 0 ? `${Math.abs(c.jours_restants)}j de retard` : `Dans ${c.jours_restants}j`}
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

function EmptyRow({ text }) {
  return <div style={{ padding: 14, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>{text}</div>;
}

