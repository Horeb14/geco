import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { createFournisseur, createProduit, requestOTP, verifyOTP, resetPassword } from '../api';

const PRODUITS = ['Maïs', 'Soja', 'Mil'];

export default function Auth() {
  const [tab, setTab] = useState('login');
  const [lPhone, setLPhone] = useState('');
  const [lPwd, setLPwd] = useState('');
  const [rNom, setRNom] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rVille, setRVille] = useState('Comé');
  const [rFourn, setRFourn] = useState('Maman Z');
  const [rProduits, setRProduits] = useState(['Maïs', 'Soja', 'Mil']);
  const [rPin, setRPin] = useState('');
  const [rPwd, setRPwd] = useState('');
  const [loading, setLoading] = useState(false);

  // Flux mot de passe oublié — 3 étapes
  const [otpModal, setOtpModal] = useState(false);
  const [otpStep, setOtpStep] = useState(1); // 1=numéro, 2=code, 3=nouveau mdp
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPwd, setOtpNewPwd] = useState('');

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();

  const toggleProd = (p) => setRProduits(prev =>
    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
  );

  const doLogin = async () => {
    if (!lPhone || !lPwd) { showToast('Remplis tous les champs'); return; }
    setLoading(true);
    try {
      await login(lPhone, lPwd);
      navigate('/accueil');
    } catch {
      showToast('Numéro ou mot de passe incorrect');
    }
    setLoading(false);
  };

  const doRegister = async () => {
    if (!rNom || !rPhone || !rPin || !rPwd) { showToast('Remplis tous les champs'); return; }
    if (rPin.length !== 4) { showToast('Le PIN doit avoir 4 chiffres'); return; }
    if (rPwd.length < 6) { showToast('Mot de passe: minimum 6 caractères'); return; }
    if (rProduits.length === 0) { showToast('Sélectionne au moins un produit'); return; }
    setLoading(true);
    try {
      // 1. Créer le compte (le login est fait automatiquement dans register())
      await register({
        nom: rNom,
        telephone: rPhone,
        ville: rVille,
        pin: rPin,
        password: rPwd,
      });

      // 2. Créer le fournisseur (token JWT dispo maintenant)
      if (rFourn.trim()) {
        await createFournisseur({ nom: rFourn.trim(), telephone: '' });
      }

      // 3. Créer les produits sélectionnés
      const nomToKey = { 'Maïs': 'mais', 'Soja': 'soja', 'Mil': 'mil' };
      await Promise.all(
        rProduits.map(p => createProduit({ nom: nomToKey[p] }))
      );

      navigate('/accueil');
    } catch (e) {
      const data = e.response?.data;
      const msg = data?.telephone?.[0] || data?.detail || 'Erreur lors de la création';
      showToast(msg);
    }
    setLoading(false);
  };

  const sendOTP = async () => {
    if (!otpPhone) { showToast('Entre ton numéro'); return; }
    setLoading(true);
    try {
      const { data } = await requestOTP(otpPhone);
      setOtpStep(2);
      if (data.code_dev) {
        // SMS pas encore configuré : on pré-remplit le code pour tester
        setOtpCode(data.code_dev);
        showToast(`SMS non actif — code : ${data.code_dev}`);
      } else {
        showToast('Code SMS envoyé ✓');
      }
    } catch (e) {
      showToast(e.response?.data?.detail || 'Numéro introuvable');
    }
    setLoading(false);
  };

  const confirmOTP = async () => {
    if (otpCode.length < 6) { showToast('Entre le code à 6 chiffres'); return; }
    setLoading(true);
    try {
      await verifyOTP(otpPhone, otpCode);
      setOtpStep(3);
    } catch (e) {
      showToast(e.response?.data?.detail || 'Code incorrect ou expiré');
    }
    setLoading(false);
  };

  const doResetPassword = async () => {
    if (otpNewPwd.length < 6) { showToast('Minimum 6 caractères'); return; }
    setLoading(true);
    try {
      await resetPassword(otpPhone, otpCode, otpNewPwd);
      showToast('Mot de passe modifié ✓');
      setOtpModal(false);
      setOtpStep(1);
      setOtpPhone(''); setOtpCode(''); setOtpNewPwd('');
    } catch (e) {
      showToast(e.response?.data?.detail || 'Erreur');
    }
    setLoading(false);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      flex: 1, padding: '28px 22px', overflowY: 'auto', background: 'var(--bg)',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 46, fontWeight: 800, color: 'var(--g700)', letterSpacing: -2 }}>
          Gé<span style={{ color: 'var(--a500)' }}>co</span>
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Gérez votre commerce, simplement.</p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', background: 'var(--border)', borderRadius: 'var(--rad)',
        padding: 3, gap: 3, marginBottom: 22,
      }}>
        {['login', 'register'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: 10, borderRadius: 10, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', border: 'none',
            background: tab === t ? 'var(--surface)' : 'transparent',
            color: tab === t ? 'var(--text)' : 'var(--muted)',
          }}>
            {t === 'login' ? 'Me connecter' : 'Créer un compte'}
          </button>
        ))}
      </div>

      {tab === 'login' ? (
        <div>
          <Label>Mon numéro</Label>
          <PhoneInput value={lPhone} onChange={setLPhone} />
          <Label>Mon mot de passe</Label>
          <Inp type="password" placeholder="••••••••" value={lPwd} onChange={e => setLPwd(e.target.value)} />
          <Btn onClick={doLogin} disabled={loading}>
            <i className="ti ti-arrow-right" /> {loading ? 'Connexion...' : 'Se connecter'}
          </Btn>
          <Btn variant="outline" style={{ marginTop: 9, fontSize: 13 }}
            onClick={() => { setOtpStep(1); setOtpModal(true); }}>
            Mot de passe oublié
          </Btn>
        </div>
      ) : (
        <div>
          <Label>Prénom et nom</Label>
          <Inp placeholder="Ex : Adjoua Koffi" value={rNom} onChange={e => setRNom(e.target.value)} />
          <Label>Mon numéro</Label>
          <PhoneInput value={rPhone} onChange={setRPhone} />
          <Label>Ma ville</Label>
          <Inp value={rVille} onChange={e => setRVille(e.target.value)} />
          <Label>Mon fournisseur</Label>
          <Inp placeholder="Ex : Maman Z" value={rFourn} onChange={e => setRFourn(e.target.value)} />
          <Label>Ce que je vends</Label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
            {PRODUITS.map(p => (
              <button key={p} onClick={() => toggleProd(p)} style={{
                padding: '10px 16px', borderRadius: 'var(--rad-f)', fontSize: 13.5, fontWeight: 600,
                cursor: 'pointer', border: '1.5px solid',
                borderColor: rProduits.includes(p) ? 'var(--g700)' : 'var(--border)',
                background: rProduits.includes(p) ? 'var(--g700)' : 'var(--surface)',
                color: rProduits.includes(p) ? '#fff' : 'var(--text)',
              }}>
                {p === 'Maïs' ? '🌽' : p === 'Soja' ? '🫘' : '🌾'} {p}
              </button>
            ))}
          </div>
          <Label>Code secret PIN (4 chiffres)</Label>
          <Inp type="password" maxLength={4} inputMode="numeric" placeholder="••••"
            value={rPin} onChange={e => setRPin(e.target.value.replace(/[^0-9]/g, ''))} />
          <Label>Mot de passe</Label>
          <Inp type="password" placeholder="Minimum 6 caractères" value={rPwd} onChange={e => setRPwd(e.target.value)} />
          <Btn onClick={doRegister} disabled={loading}>
            <i className="ti ti-check" /> {loading ? 'Création...' : 'Créer mon compte'}
          </Btn>
        </div>
      )}

      {/* Modal OTP — mot de passe oublié */}
      {otpModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setOtpModal(false); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.48)', zIndex: 300,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '24px 24px 0 0',
            padding: '20px 20px 36px', width: '100%', maxWidth: 390,
          }}>
            <div style={{ width: 34, height: 4, background: 'var(--border)', borderRadius: 999, margin: '0 auto 18px' }} />

            {/* Étape 1 — numéro */}
            {otpStep === 1 && (<>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Mot de passe oublié</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
                Entre ton numéro. Tu recevras un code à 6 chiffres.
              </p>
              <Label>Ton numéro</Label>
              <PhoneInput value={otpPhone} onChange={setOtpPhone} />
              <Btn onClick={sendOTP} disabled={loading}>
                <i className="ti ti-send" /> {loading ? 'Envoi...' : 'Envoyer le code'}
              </Btn>
              <Btn variant="outline" style={{ marginTop: 8 }} onClick={() => setOtpModal(false)}>Annuler</Btn>
            </>)}

            {/* Étape 2 — code OTP */}
            {otpStep === 2 && (<>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Entre le code reçu</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
                Code à 6 chiffres envoyé au +229{otpPhone}
              </p>
              <Label>Code OTP</Label>
              <Inp
                type="tel" maxLength={6} inputMode="numeric"
                placeholder="123456"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                style={{ letterSpacing: 8, fontSize: 22, textAlign: 'center' }}
              />
              <Btn onClick={confirmOTP} disabled={loading}>
                <i className="ti ti-check" /> {loading ? 'Vérification...' : 'Valider le code'}
              </Btn>
              <Btn variant="outline" style={{ marginTop: 8 }} onClick={() => setOtpStep(1)}>
                ← Changer de numéro
              </Btn>
            </>)}

            {/* Étape 3 — nouveau mot de passe */}
            {otpStep === 3 && (<>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Nouveau mot de passe</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
                Choisis un nouveau mot de passe pour ton compte.
              </p>
              <Label>Nouveau mot de passe</Label>
              <Inp
                type="password"
                placeholder="Minimum 6 caractères"
                value={otpNewPwd}
                onChange={e => setOtpNewPwd(e.target.value)}
              />
              <Btn onClick={doResetPassword} disabled={loading}>
                <i className="ti ti-lock" /> {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Btn>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: 'var(--muted)',
      textTransform: 'uppercase', letterSpacing: .5,
      display: 'block', marginBottom: 6,
    }}>{children}</span>
  );
}

function PhoneInput({ value, onChange }) {
  return (
    <div style={{
      display: 'flex', border: '1.5px solid var(--border)', borderRadius: 'var(--rad)',
      overflow: 'hidden', marginBottom: 14,
    }}>
      <div style={{
        padding: '13px 11px', background: 'var(--bg)', fontSize: 13, fontWeight: 700,
        color: 'var(--g700)', whiteSpace: 'nowrap', borderRight: '1.5px solid var(--border)',
      }}>🇧🇯 +229</div>
      <input type="tel" maxLength={10} placeholder="01 23 45 67 89"
        value={value} onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        style={{ flex: 1, border: 'none', padding: '13px 12px', fontSize: 15, outline: 'none', background: 'transparent' }} />
    </div>
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

function Btn({ children, variant, style, ...props }) {
  return (
    <button style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
      padding: '14px 18px', borderRadius: 'var(--rad)', fontSize: 15, fontWeight: 700,
      cursor: props.disabled ? 'not-allowed' : 'pointer', border: 'none', width: '100%',
      background: variant === 'outline' ? 'transparent' : 'var(--g700)',
      color: variant === 'outline' ? 'var(--text)' : '#fff',
      borderWidth: variant === 'outline' ? 1.5 : 0,
      borderStyle: 'solid',
      borderColor: variant === 'outline' ? 'var(--border)' : 'transparent',
      opacity: props.disabled ? .7 : 1,
      ...style,
    }} {...props}>
      {children}
    </button>
  );
}
