import { useState, useEffect, useCallback } from 'react';
import { getLots, createVente, getClients, createClient, getVentes } from '../api';
import { useToast } from '../components/Toast';

const UNITES = [
  { label: '1 sac', key: 'sac', mult: 1, delai: 30 },
  { label: '½ sac', key: 'demi_sac', mult: 0.5, delai: 15 },
  { label: '¼ sac', key: 'quart_sac', mult: 0.25, delai: 7 },
  { label: 'Sachet bleu', key: 'sachet_bleu', mult: 0.125, delai: 4 },
  { label: 'Sachet jaune', key: 'sachet_jaune', mult: 0.0625, delai: 2 },
  { label: 'Bols (kg)', key: 'bols', mult: 0, delai: 7 },
];

const MOIS_COURT = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

function dateEcheance(unite) {
  const d = new Date();
  d.setDate(d.getDate() + (unite.delai || 30));
  return `${d.getDate()} ${MOIS_COURT[d.getMonth()]} ${d.getFullYear()}`;
}

export default function Ventes() {
  const showToast = useToast();
  const [lots, setLots] = useState([]);
  const [clients, setClients] = useState([]);
  const [ventesToday, setVentesToday] = useState([]);

  const [selLot, setSelLot] = useState(null);
  const [unite, setUnite] = useState(UNITES[0]);
  const [qty, setQty] = useState(1);
  const [bols, setBols] = useState(10);
  const [prix, setPrix] = useState(0);
  const [mode, setMode] = useState('comptant');
  const [cNom, setCNom] = useState('');
  const [cTel, setCTel] = useState('');
  const [remb, setRemb] = useState('');
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    try {
      const [l, c, v] = await Promise.all([getLots(), getClients(), getVentes(today)]);
      setLots(l.data);
      setClients(c.data);
      setVentesToday(v.data);
      if (l.data.length > 0) {
        setSelLot(l.data[0]);
        setPrix(l.data[0].prix_vente_sac);
      }
    } catch {}
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const selectLot = (lot) => {
    setSelLot(lot);
    setPrix(lot.prix_vente_sac);
  };

  const total = () => {
    if (unite.key === 'bols') return Math.round(prix / 100 * bols);
    return Math.round(prix * unite.mult * qty);
  };

  const save = async () => {
    if (!selLot) { showToast('Sélectionne un produit'); return; }
    if (!prix) { showToast('Entre le prix par sac'); return; }
    if (mode !== 'comptant') {
      if (!cNom.trim()) { showToast('Entre le nom de la cliente'); return; }
    }
    setSaving(true);
    try {
      let clientId = null;
      if (mode !== 'comptant') {
        let c = clients.find(x => x.nom.toLowerCase() === cNom.trim().toLowerCase());
        if (!c) {
          const { data } = await createClient({ nom: cNom.trim(), telephone: cTel });
          c = data;
          setClients(prev => [...prev, c]);
        }
        clientId = c.id;
      }

      const montant_total = total();
      await createVente({
        lot: selLot.id,
        client: clientId,
        unite: unite.key,
        quantite: unite.key === 'bols' ? bols : qty,
        prix_unitaire: prix,
        montant_total,
        mode_paiement: mode,
        montant_rembourse: mode === 'mixte' ? (parseInt(remb) || 0) : 0,
      });

      const { data: v } = await getVentes(today);
      setVentesToday(v);
      setCNom(''); setCTel(''); setRemb('');
      setQty(1); setBols(10);
      showToast('Vente enregistrée ✓');
    } catch (e) {
      showToast('Erreur lors de l\'enregistrement');
    }
    setSaving(false);
  };

  // Group lots by product
  const produits = [...new Map(lots.map(l => [l.produit_nom, l])).values()];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <h2 style={{ fontSize: 19, fontWeight: 700 }}>Nouvelle vente</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 15px 88px' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--rad-lg)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: 16 }}>
            {/* Produit */}
            <Lbl>Produit</Lbl>
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 14 }}>
              {produits.map(l => (
                <Pill key={l.produit} sel={selLot?.produit === l.produit} onClick={() => selectLot(l)}>
                  {emojiProd(l.produit_nom)} {l.produit_nom}
                </Pill>
              ))}
              {produits.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>Aucun stock disponible. Va chez Maman Z d'abord !</p>
              )}
            </div>

            {/* Unité */}
            <Lbl>Unité</Lbl>
            <div style={{ display: 'flex', gap: 7, overflowX: 'auto', marginBottom: 14 }}>
              {UNITES.map(u => (
                <Pill key={u.key} sel={unite.key === u.key} onClick={() => { setUnite(u); setQty(1); }}>
                  {u.label}
                </Pill>
              ))}
            </div>

            {/* Quantité / Bols */}
            {unite.key !== 'bols' ? (
              <>
                <Lbl>Quantité {unite.key === 'sac' && <span style={{ fontWeight: 400, color: 'var(--faint)', textTransform: 'none', letterSpacing: 0 }}>(max 10 sacs)</span>}</Lbl>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <StepBtn onClick={() => setQty(q => Math.max(1, q - 1))}>−</StepBtn>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: 26, fontWeight: 800 }}>{qty}</div>
                  <StepBtn onClick={() => {
                    const max = unite.key === 'sac' ? 10 : 99;
                    if (qty < max) setQty(q => q + 1);
                    else if (unite.key === 'sac') showToast('Maximum 10 sacs par vente');
                  }}>+</StepBtn>
                </div>
              </>
            ) : (
              <>
                <Lbl>Nombre de bols (1 bol = 1 kg)</Lbl>
                <Inp type="number" value={bols} onChange={e => setBols(parseInt(e.target.value) || 1)} min={1} style={{ marginBottom: 14 }} />
              </>
            )}

            {/* Prix */}
            <Lbl>Prix par sac (FCFA)</Lbl>
            <Inp type="number" value={prix} onChange={e => setPrix(parseInt(e.target.value) || 0)} inputMode="numeric" style={{ marginBottom: 14 }} />

            {/* Mode paiement */}
            <Lbl>Paiement</Lbl>
            <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 'var(--rad)', padding: 3, gap: 3, marginBottom: 14 }}>
              {[['comptant','Paie maintenant'],['credit','Paiera après'],['mixte','Paie + rembourse']].map(([m, l]) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '11px 6px', border: 'none', borderRadius: 9, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', background: mode === m ? 'var(--surface)' : 'transparent',
                  color: mode === m ? 'var(--text)' : 'var(--muted)',
                  boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                }}>{l}</button>
              ))}
            </div>

            {/* Cliente */}
            {(mode === 'credit' || mode === 'mixte') && (
              <>
                <Lbl>Nom de la cliente</Lbl>
                <Inp placeholder="Ex : Fatoumata Diallo" value={cNom} onChange={e => setCNom(e.target.value)} style={{ marginBottom: 14 }} />
                <Lbl>Son numéro (optionnel)</Lbl>
                <div style={{ display: 'flex', border: '1.5px solid var(--border)', borderRadius: 'var(--rad)', overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ padding: '13px 11px', background: 'var(--bg)', fontSize: 13, fontWeight: 700, color: 'var(--g700)', whiteSpace: 'nowrap', borderRight: '1.5px solid var(--border)' }}>
                    🇧🇯 +229
                  </div>
                  <input type="tel" maxLength={10} placeholder="01 23 45 67 89" value={cTel} onChange={e => setCTel(e.target.value.replace(/[^0-9]/g, ''))}
                    style={{ flex: 1, border: 'none', padding: '13px 12px', fontSize: 15, outline: 'none', background: 'transparent' }} />
                </div>
              </>
            )}

            {mode === 'mixte' && (
              <>
                <Lbl>Elle rembourse aussi (FCFA)</Lbl>
                <Inp placeholder="Ex : 5 000" type="number" inputMode="numeric" value={remb} onChange={e => setRemb(e.target.value)} style={{ marginBottom: 14 }} />
              </>
            )}

            {/* Date d'échéance automatique */}
            {(mode === 'credit' || mode === 'mixte') && (
              <div style={{
                background: 'var(--a50)', border: '1.5px solid var(--a100)',
                borderRadius: 'var(--rad)', padding: '12px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 14,
              }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>Date limite de paiement</p>
                  <p style={{ fontSize: 11, color: 'var(--a500)', marginTop: 2 }}>
                    {unite.delai} jours · basé sur {unite.label}
                  </p>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#92400E' }}>
                  {dateEcheance(unite)}
                </span>
              </div>
            )}

            {/* Total */}
            <div style={{
              background: 'var(--g50)', border: '1.5px solid var(--g100)', borderRadius: 'var(--rad)',
              padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
            }}>
              <p style={{ fontSize: 13, color: 'var(--g700)', fontWeight: 600 }}>Total vente</p>
              <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--g700)', letterSpacing: -1 }}>
                {total().toLocaleString('fr-FR')} FCFA
              </span>
            </div>

            <button onClick={save} disabled={saving} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '14px 18px', borderRadius: 'var(--rad)', fontSize: 15, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', border: 'none', width: '100%',
              background: 'var(--g700)', color: '#fff', opacity: saving ? .7 : 1,
            }}>
              <i className="ti ti-check" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* Ventes du jour */}
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .6, marginBottom: 10, marginTop: 8 }}>
          Ventes d'aujourd'hui
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--rad-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          {ventesToday.length === 0
            ? <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Aucune vente pour l'instant</div>
            : ventesToday.map((v, i) => (
              <div key={v.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, background: 'var(--a50)', flexShrink: 0,
                }}>{emojiProd(v.produit_nom)}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{v.produit_nom} · {v.unite_display}</p>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {new Date(v.date_vente).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {v.client_nom ? ` · ${v.client_nom}` : ''}
                  </span>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 800,
                  color: v.mode_paiement === 'credit' ? 'var(--muted)' : 'var(--g700)',
                }}>
                  {v.montant_total.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function emojiProd(nom) {
  if (!nom) return '🌽';
  const n = nom.toLowerCase();
  if (n.includes('soja')) return '🫘';
  if (n.includes('mil')) return '🌾';
  return '🌽';
}

function Lbl({ children }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase',
      letterSpacing: .5, display: 'block', marginBottom: 6,
    }}>{children}</span>
  );
}

function Pill({ sel, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 16px', borderRadius: 'var(--rad-f)', border: '1.5px solid',
      fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
      borderColor: sel ? 'var(--g700)' : 'var(--border)',
      background: sel ? 'var(--g700)' : 'var(--surface)',
      color: sel ? '#fff' : 'var(--text)',
    }}>{children}</button>
  );
}

function StepBtn({ onClick, children }) {
  return (
    <button onClick={onClick} style={{
      width: 44, height: 44, borderRadius: 10, border: '1.5px solid var(--border)',
      background: 'var(--surface)', fontSize: 22, fontWeight: 700, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
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
