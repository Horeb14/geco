import logging
import random
import africastalking
from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (
    Commercant, Produit, Fournisseur, ConfigMarche,
    LotAchat, Client, Vente, Remboursement, PaiementFournisseur, OTPCode
)

logger = logging.getLogger(__name__)


def envoyer_sms(telephone, message):
    """Envoie un SMS via Africa's Talking (couvre Moov et MTN Bénin)."""
    try:
        africastalking.initialize(settings.AT_USERNAME, settings.AT_API_KEY)
        sms = africastalking.SMS
        numero = f'+229{telephone}' if not telephone.startswith('+') else telephone
        response = sms.send(message, [numero])
        logger.info(f'[SMS AT] Envoyé à {numero} — {response}')
        return True
    except Exception as e:
        logger.error(f'[SMS AT] Échec envoi à {telephone}: {e}')
        return False
from .serializers import (
    CommercantRegisterSerializer, CommercantSerializer,
    ProduitSerializer, FournisseurSerializer, ConfigMarcheSerializer,
    LotAchatSerializer, ClientSerializer, VenteSerializer,
    RemboursementSerializer, PaiementFournisseurSerializer
)


class GecoPairSerializer(TokenObtainPairSerializer):
    username_field = 'telephone'

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['nom'] = user.nom
        token['telephone'] = user.telephone
        return token


class GecoTokenView(TokenObtainPairView):
    serializer_class = GecoPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = Commercant.objects.all()
    serializer_class = CommercantRegisterSerializer
    permission_classes = [AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = CommercantSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class VerifyPinView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pin = request.data.get('pin', '')
        ok = check_password(pin, request.user.pin_hash)
        return Response({'valid': ok})


class ChangePinView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_pin = request.data.get('pin', '')
        if len(new_pin) != 4 or not new_pin.isdigit():
            return Response({'detail': 'PIN doit avoir 4 chiffres'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.pin_hash = make_password(new_pin)
        request.user.save()
        return Response({'detail': 'PIN modifié'})


class RequestOTPView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        telephone = request.data.get('telephone', '').strip()
        if not telephone:
            return Response({'detail': 'Numéro obligatoire'}, status=status.HTTP_400_BAD_REQUEST)

        if not Commercant.objects.filter(telephone=telephone).exists():
            return Response({'detail': 'Aucun compte trouvé avec ce numéro'}, status=status.HTTP_404_NOT_FOUND)

        # Invalider les anciens codes
        OTPCode.objects.filter(telephone=telephone, used=False).update(used=True)

        code = str(random.randint(100000, 999999))
        OTPCode.objects.create(telephone=telephone, code=code)

        message = f'Géco - Ton code de réinitialisation : {code}\nValable 10 minutes. Ne le partage pas.'
        envoye = envoyer_sms(telephone, message)

        if envoye:
            return Response({'detail': 'Code envoyé'})
        else:
            # Clés AT pas encore configurées → renvoie le code dans la réponse (mode dev)
            logger.warning(f'[GÉCO OTP] +229{telephone} — Code: {code}')
            return Response({'detail': 'Code envoyé', 'code_dev': code})


class VerifyOTPView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        telephone = request.data.get('telephone', '').strip()
        code = request.data.get('code', '').strip()

        otp = OTPCode.objects.filter(telephone=telephone, code=code, used=False).order_by('-created_at').first()
        if not otp or not otp.is_valid():
            return Response({'detail': 'Code incorrect ou expiré'}, status=status.HTTP_400_BAD_REQUEST)

        otp.used = True
        otp.save()
        return Response({'detail': 'Code valide', 'verified': True})


class ResetPasswordView(generics.GenericAPIView):
    permission_classes = [AllowAny]

    def post(self, request):
        telephone = request.data.get('telephone', '').strip()
        code = request.data.get('code', '').strip()
        new_password = request.data.get('password', '')

        if len(new_password) < 6:
            return Response({'detail': 'Mot de passe trop court'}, status=status.HTTP_400_BAD_REQUEST)

        # Re-vérifier que le code a bien été validé (utilisé = validé côté client)
        otp = OTPCode.objects.filter(telephone=telephone, code=code).order_by('-created_at').first()
        if not otp:
            return Response({'detail': 'Session expirée, recommence'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = Commercant.objects.get(telephone=telephone)
            user.set_password(new_password)
            user.save()
            return Response({'detail': 'Mot de passe modifié ✓'})
        except Commercant.DoesNotExist:
            return Response({'detail': 'Compte introuvable'}, status=status.HTTP_404_NOT_FOUND)


class ProduitViewSet(viewsets.ModelViewSet):
    serializer_class = ProduitSerializer

    def get_queryset(self):
        return Produit.objects.filter(commercant=self.request.user)

    def perform_create(self, serializer):
        serializer.save(commercant=self.request.user)


class FournisseurViewSet(viewsets.ModelViewSet):
    serializer_class = FournisseurSerializer

    def get_queryset(self):
        return Fournisseur.objects.filter(commercant=self.request.user)

    def perform_create(self, serializer):
        serializer.save(commercant=self.request.user)


class ConfigMarcheViewSet(viewsets.ModelViewSet):
    serializer_class = ConfigMarcheSerializer

    def get_queryset(self):
        return ConfigMarche.objects.filter(fournisseur__commercant=self.request.user)


class LotAchatViewSet(viewsets.ModelViewSet):
    serializer_class = LotAchatSerializer

    def get_queryset(self):
        return LotAchat.objects.filter(commercant=self.request.user).select_related('produit', 'fournisseur')

    def perform_create(self, serializer):
        serializer.save(commercant=self.request.user)


class ClientViewSet(viewsets.ModelViewSet):
    serializer_class = ClientSerializer

    def get_queryset(self):
        return Client.objects.filter(commercant=self.request.user).prefetch_related(
            'ventes', 'remboursements'
        )

    def perform_create(self, serializer):
        serializer.save(commercant=self.request.user)


class VenteViewSet(viewsets.ModelViewSet):
    serializer_class = VenteSerializer

    def get_queryset(self):
        qs = Vente.objects.filter(commercant=self.request.user).select_related('lot__produit', 'client')
        date = self.request.query_params.get('date')
        if date:
            qs = qs.filter(date_vente__date=date)
        return qs.order_by('-date_vente')

    def perform_create(self, serializer):
        serializer.save(commercant=self.request.user)


class RemboursementViewSet(viewsets.ModelViewSet):
    serializer_class = RemboursementSerializer

    def get_queryset(self):
        return Remboursement.objects.filter(commercant=self.request.user).select_related('client')

    def perform_create(self, serializer):
        serializer.save(commercant=self.request.user)


class PaiementFournisseurViewSet(viewsets.ModelViewSet):
    serializer_class = PaiementFournisseurSerializer

    def get_queryset(self):
        return PaiementFournisseur.objects.filter(commercant=self.request.user).select_related('fournisseur')

    def perform_create(self, serializer):
        serializer.save(commercant=self.request.user)
