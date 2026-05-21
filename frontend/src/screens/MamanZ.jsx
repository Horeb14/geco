import { useState, useEffect, useCallback } from 'react';
import { getLots, getFournisseurs, createLot, createPaiementFournisseur, getPaiementsFournisseur, getProduits, createProduit } from '../api';
import { useToast } from '../components/Toast';

const PRODUITS = [
  { label: '🌽 Maïs', key: 'mais' },
  { label: '🫘 Soja', key: 'soja' },
  { label: '🌾 Mil', key: 'mil' },
];

export default function MamanZ() {
  const showToast = useToast();
  const [lots, setLots] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [paiements, setPaiements] = useState([]);
  const [selProd, setSelProd] = useState('mais');
  const [mzSacs, setMzSacs] = useState('');
  const [mzPrixAchat, setMzPrixAchat] = useState('');
  const [mzPrixVente, setMzPrixVente] = useState('');
  const [mzRemb, setMzRemb] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [l, f, p] = await Promise.all([getLots(), getFournisseurs(), getPaiementsFournisseur()]);
      setLots(l.data);
      setFournisseurs(f.data);
      setPaiements(p.data);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const fournisseur = fournisseurs[0];

  // Dette = total achat crédit - paiements
  const detteMZ = lots
    .filter(l => l.mode_paiement === 'credit')
    .reduce((s, l) => s + l.prix_achat_sac * l.quantite_sacs, 0)
    - paiements.reduce((s, p) => s + p.montant, 0);

  const payerMZ = async () => {
    const m = parseInt(mzRemb) || 0;
    if (!m) { showToast('Entre le montant à rembourser'); return; }
    if (m > Math.max(0, detteMZ)) { showToast('Ce montant dépasse ta dette !'); return; }
    if (!fournisseur) { showToast('Aucun fournisseur configuré'); return; }
    setSaving(true);
    try {
      await createPaiementFournisseur({ fournisseur: fournisseur.id, montant: m });
      setMzRemb('');
      await load();
      showToast('Paiement enregistré ✓');
    } catch { showToast('Erreur'); }
    setSaving(false);
  };

  const prendreStock = async () => {
    const sacs = parseInt(mzSacs) || 0;
    const prixAchat = parseInt(mzPrixAchat) || 0;
    const prixVente = parseInt(mzPrixVente) || 0;
    if (!sacs || !prixAchat || !prixVente) { showToast('Remplis tous les champs'); return; }
    if (!fournisseur) { showToast('Aucun fournisseur configuré'); return; }

    // Find or note: we need a produit ID. For now we'll create if missing.
    setSaving(true);
    try {
      const prodsResp = await getProduits();
      let prod = prodsResp.data.find(p => p.nom === selProd);
      if (!prod) {
        const { data } = await createProduit({ nom: selProd });
        prod = data;
      }
      await createLot({
        produit: prod.id,
        fournisseur: fournisseur.id,
        quantite_sacs: sacs,
        prix_achat_sac: prixAchat,
        prix_vente_sac: prixVente,
        mode_paiement: 'credit',
      });
      setMzSacs(''); setMzPrixAchat(''); setMzPrixVente('');
      await load();
      showToast(`Stock enregistré · +${(sacs * prixAchat).toLocaleString('fr-FR')} FCFA de dette`);
    } catch (e) {
      showToast('Erreur lors de l\'enregistrement');
    }
    setSaving(false);
  };

  const MOIS = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>Maman Z</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 15px 88px' }}>
        {/* Hero */}
        <div style={{
          background: 'var(--g800)', borderRadius: 'var(--rad-xl)', padding: 22, marginBottom: 12, textAlign: 'center',
        }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 6 }}>
            Ce que tu dois à Maman Z
          </p>
          <h2 style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: -2 }}>
            {Math.max(0, detteMZ).toLocaleString('fr-FR')} FCFA
          </h2>
          <span style={{ fontSize: 13, color: 'var(--a400)', display: 'block', marginTop: 4 }}>
            Prochain paiement : Sam. 24 mai · dans 4 jours
          </span>
          {fournisseur?.telephone && (
            <a href={`tel:+229${fournisseur.telephone}`} style={{
              margin: '14px auto 0', background: 'rgba(255,255,255,.12)', borderColor: 'rgba(255,255,255,.2)',
              color: '#fff', padding: '10px 18px', borderRadius: 'var(--rad-f)', gap: 7,
              fontSize: 14, fontWeight: 600, display: 'inline-flex', alignItems: 'center',
              border: '1.5px solid rgba(255,255,255,.2)', textDecoration: 'none',
            }}>
              <i className="ti ti-phone" /> Appeler {fournisseur.nom}
            </a>
          )}
        </div>

        {/* Rembourser */}
        <Section head={<><i className="ti ti-cash" style={{ color: 'var(--r500)' }} /> Rembourser Maman Z</>} headColor="var(--r600)">
          <Lbl>Combien tu lui rends ?</Lbl>
          <div style={{ position: 'relative' }}>
            <Inp type="number" inputMode="numeric" placeholder="Ex : 25 000"
              value={mzRemb} onChange={e => setMzRemb(e.target.value)}
              style={{ paddingRight: 56, marginBottom: 10 }} />
            <span style={{ position: 'absolute', right: 13, top: 14, color: 'var(--muted)', fontSize: 13 }}>FCFA</span>
          </div>
          <button onClick={payerMZ} disabled={saving} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px 14px', borderRadius: 'var(--rad)', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', border: 'none',
            background: 'var(--r500)', color: '#fff', opacity: saving ? .7 : 1,
          }}>
            <i className="ti ti-check" /> Enregistrer le paiement
          </button>
        </Section>

        {/* Prendre du stock */}
        <Section head={<><i className="ti ti-package" style={{ color: 'var(--g600)' }} /> Prendre du stock</>} headColor="var(--g700)">
          <Lbl>Produit</Lbl>
          <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
            {PRODUITS.map(p => (
              <button key={p.key} onClick={() => setSelProd(p.key)} style={{
                padding: '10px 16px', borderRadius: 'var(--rad-f)', border: '1.5px solid',
                fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                borderColor: selProd === p.key ? 'var(--g700)' : 'var(--border)',
                background: selProd === p.key ? 'var(--g700)' : 'var(--surface)',
                color: selProd === p.key ? '#fff' : 'var(--text)',
              }}>{p.label}</button>
            ))}
          </div>
          <Lbl>Nombre de sacs</Lbl>
          <Inp type="number" inputMode="numeric" placeholder="Ex : 5" value={mzSacs} onChange={e => setMzSacs(e.target.value)} style={{ marginBottom: 14 }} />
          <Lbl>Prix d'achat par sac</Lbl>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Inp type="number" inputMode="numeric" placeholder="Ex : 5 500"
              value={mzPrixAchat} onChange={e => setMzPrixAchat(e.target.value)}
              style={{ paddingRight: 56, marginBottom: 0 }} />
            <span style={{ position: 'absolute', right: 13, top: 14, color: 'var(--muted)', fontSize: 13 }}>FCFA</span>
          </div>
          <Lbl style={{ marginTop: 10 }}>Prix de vente par sac</Lbl>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Inp type="number" inputMode="numeric" placeholder="Ex : 6 250"
              value={mzPrixVente} onChange={e => setMzPrixVente(e.target.value)}
              style={{ paddingRight: 56, marginBottom: 0 }} />
            <span style={{ position: 'absolute', right: 13, top: 14, color: 'var(--muted)', fontSize: 13 }}>FCFA</span>
          </div>
          <button onClick={prendreStock} disabled={saving} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '10px 14px', borderRadius: 'var(--rad)', fontSize: 13, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', border: 'none', marginTop: 10,
            background: 'var(--g700)', color: '#fff', opacity: saving ? .7 : 1,
          }}>
            <i className="ti ti-check" /> Enregistrer le stock
          </button>
        </Section>

        {/* Historique */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6, marginTop: 4, marginBottom: 10 }}>
          Derniers paiements
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--rad-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {paiements.length === 0
            ? <div style={{ padding: 14, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Aucun paiement enregistré</div>
            : paiements.slice(0, 8).map((p, i) => {
              const d = new Date(p.date);
              const ds = `${d.getDate()} ${MOIS[d.getMonth()]}`;
              const hm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: 'var(--r50)', color: 'var(--r500)', flexShrink: 0 }}>
                    <i className="ti ti-cash" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>Paiement à {p.fournisseur_nom}</p>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{ds} · {hm}</span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--r600)' }}>
                    -{p.montant.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function Section({ head, headColor, children }) {
  return (
    <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--rad-lg)', overflow: 'hidden', marginBottom: 12 }}>
      <div style={{
        padding: '13px 15px', background: 'var(--bg)', fontSize: 14, fontWeight: 700,
        display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)',
        color: headColor,
      }}>
        {head}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

function Lbl({ children, style }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
      letterSpacing: .5, display: 'block', marginBottom: 6, ...style,
    }}>{children}</span>
  );
}

function Inp({ style, ...props }) {
  return (
    <input style={{
      width: '100%', padding: '13px 14px', border: '1.5px solid var(--border)',
      borderRadius: 'var(--rad)', fontSize: 15, color: 'var(--text)', outline: 'none',
      background: 'var(--surface)', ...style,
    }}
      onFocus={e => e.target.style.borderColor = 'var(--g700)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
      {...props} />
  );
}
