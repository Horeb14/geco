import api from './axios';

export const login = (telephone, password) =>
  api.post('/token/', { telephone, password });

export const register = (data) =>
  api.post('/register/', data);

export const getMe = () => api.get('/me/');
export const updateMe = (data) => api.patch('/me/', data);

export const requestOTP = (telephone) => api.post('/otp/request/', { telephone });
export const verifyOTP = (telephone, code) => api.post('/otp/verify/', { telephone, code });
export const resetPassword = (telephone, code, password) =>
  api.post('/otp/reset-password/', { telephone, code, password });
export const verifyPin = (pin) => api.post('/me/verify-pin/', { pin });
export const changePin = (pin) => api.post('/me/change-pin/', { pin });

export const getProduits = () => api.get('/produits/');
export const createProduit = (data) => api.post('/produits/', data);
export const deleteProduit = (id) => api.delete(`/produits/${id}/`);

export const getFournisseurs = () => api.get('/fournisseurs/');
export const createFournisseur = (data) => api.post('/fournisseurs/', data);
export const updateFournisseur = (id, data) => api.patch(`/fournisseurs/${id}/`, data);

export const getConfigs = () => api.get('/configs-marche/');
export const createConfig = (data) => api.post('/configs-marche/', data);
export const updateConfig = (id, data) => api.patch(`/configs-marche/${id}/`, data);

export const getLots = () => api.get('/lots/');
export const createLot = (data) => api.post('/lots/', data);
export const updateLot = (id, data) => api.patch(`/lots/${id}/`, data);

export const getClients = () => api.get('/clients/');
export const createClient = (data) => api.post('/clients/', data);
export const updateClient = (id, data) => api.patch(`/clients/${id}/`, data);

export const getVentes = (date) => api.get('/ventes/', { params: date ? { date } : {} });
export const createVente = (data) => api.post('/ventes/', data);

export const getRemboursements = () => api.get('/remboursements/');
export const createRemboursement = (data) => api.post('/remboursements/', data);

export const getPaiementsFournisseur = () => api.get('/paiements-fournisseur/');
export const createPaiementFournisseur = (data) => api.post('/paiements-fournisseur/', data);
