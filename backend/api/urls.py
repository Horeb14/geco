from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProduitViewSet, FournisseurViewSet, ConfigMarcheViewSet,
    LotAchatViewSet, ClientViewSet, VenteViewSet,
    RemboursementViewSet, PaiementFournisseurViewSet,
    RegisterView, MeView, VerifyPinView, ChangePinView,
    RequestOTPView, VerifyOTPView, ResetPasswordView,
)

router = DefaultRouter()
router.register('produits', ProduitViewSet, basename='produit')
router.register('fournisseurs', FournisseurViewSet, basename='fournisseur')
router.register('configs-marche', ConfigMarcheViewSet, basename='configmarche')
router.register('lots', LotAchatViewSet, basename='lot')
router.register('clients', ClientViewSet, basename='client')
router.register('ventes', VenteViewSet, basename='vente')
router.register('remboursements', RemboursementViewSet, basename='remboursement')
router.register('paiements-fournisseur', PaiementFournisseurViewSet, basename='paiement-fournisseur')

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', MeView.as_view(), name='me'),
    path('me/verify-pin/', VerifyPinView.as_view(), name='verify-pin'),
    path('me/change-pin/', ChangePinView.as_view(), name='change-pin'),
    path('otp/request/', RequestOTPView.as_view(), name='otp-request'),
    path('otp/verify/', VerifyOTPView.as_view(), name='otp-verify'),
    path('otp/reset-password/', ResetPasswordView.as_view(), name='otp-reset'),
]
