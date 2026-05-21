from django.contrib.auth.hashers import make_password
from rest_framework import serializers
from .models import (
    Commercant, Produit, Fournisseur, ConfigMarche,
    LotAchat, Client, Vente, Remboursement, PaiementFournisseur
)


class CommercantRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    pin = serializers.CharField(write_only=True, max_length=4, min_length=4)

    class Meta:
        model = Commercant
        fields = ['id', 'nom', 'telephone', 'ville', 'password', 'pin']

    def create(self, validated_data):
        pin = validated_data.pop('pin')
        password = validated_data.pop('password')
        user = Commercant(**validated_data)
        user.set_password(password)
        user.pin_hash = make_password(pin)
        user.save()
        return user


class CommercantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Commercant
        fields = ['id', 'nom', 'telephone', 'ville', 'date_inscription']
        read_only_fields = ['id', 'date_inscription']


class ProduitSerializer(serializers.ModelSerializer):
    nom_display = serializers.CharField(source='get_nom_display', read_only=True)

    class Meta:
        model = Produit
        fields = ['id', 'nom', 'nom_display']


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = ['id', 'nom', 'telephone']


class ConfigMarcheSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfigMarche
        fields = ['id', 'fournisseur', 'cycle_jours', 'date_reference']


class LotAchatSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.get_nom_display', read_only=True)
    fournisseur_nom = serializers.CharField(source='fournisseur.nom', read_only=True)
    benefice_prevu = serializers.SerializerMethodField()

    class Meta:
        model = LotAchat
        fields = [
            'id', 'produit', 'produit_nom', 'fournisseur', 'fournisseur_nom',
            'quantite_sacs', 'prix_achat_sac', 'prix_vente_sac',
            'duree_ecoulement_jours', 'date_achat', 'mode_paiement',
            'quantite_restante', 'benefice_prevu',
        ]
        read_only_fields = ['quantite_restante']

    def get_benefice_prevu(self, obj):
        marge = obj.prix_vente_sac - obj.prix_achat_sac
        return marge * obj.quantite_sacs


class ClientSerializer(serializers.ModelSerializer):
    solde_du = serializers.ReadOnlyField()

    class Meta:
        model = Client
        fields = ['id', 'nom', 'telephone', 'limite_credit', 'solde_du']


class VenteSerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source='client.nom', read_only=True)
    produit_nom = serializers.SerializerMethodField()
    unite_display = serializers.CharField(source='get_unite_display', read_only=True)

    class Meta:
        model = Vente
        fields = [
            'id', 'lot', 'client', 'client_nom', 'produit_nom',
            'unite', 'unite_display', 'quantite', 'prix_unitaire',
            'montant_total', 'mode_paiement', 'montant_rembourse', 'date_vente',
        ]

    def get_produit_nom(self, obj):
        return obj.lot.produit.get_nom_display()


class RemboursementSerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source='client.nom', read_only=True)

    class Meta:
        model = Remboursement
        fields = ['id', 'client', 'client_nom', 'vente', 'montant', 'date']


class PaiementFournisseurSerializer(serializers.ModelSerializer):
    fournisseur_nom = serializers.CharField(source='fournisseur.nom', read_only=True)

    class Meta:
        model = PaiementFournisseur
        fields = ['id', 'fournisseur', 'fournisseur_nom', 'montant', 'date']
