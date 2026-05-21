from datetime import date
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone


class CommercantManager(BaseUserManager):
    def create_user(self, telephone, password=None, **extra_fields):
        if not telephone:
            raise ValueError('Le numéro de téléphone est obligatoire')
        user = self.model(telephone=telephone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, telephone, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(telephone, password, **extra_fields)


class Commercant(AbstractBaseUser, PermissionsMixin):
    """Commerçante utilisant l'application"""
    nom = models.CharField(max_length=100)
    telephone = models.CharField(max_length=20, unique=True)
    ville = models.CharField(max_length=100, default='Comé')
    pin_hash = models.CharField(max_length=128, blank=True)
    date_inscription = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = CommercantManager()

    USERNAME_FIELD = 'telephone'
    REQUIRED_FIELDS = ['nom']

    class Meta:
        verbose_name = 'Commerçante'
        verbose_name_plural = 'Commerçantes'

    def __str__(self):
        return f'{self.nom} ({self.telephone})'


class Produit(models.Model):
    """Produit vendu par la commerçante"""
    CHOIX_PRODUIT = [
        ('mais', 'Maïs'),
        ('soja', 'Soja'),
        ('mil', 'Mil'),
    ]
    nom = models.CharField(max_length=10, choices=CHOIX_PRODUIT)
    commercant = models.ForeignKey(Commercant, on_delete=models.CASCADE, related_name='produits')

    class Meta:
        unique_together = ('nom', 'commercant')

    def __str__(self):
        return f'{self.get_nom_display()} — {self.commercant.nom}'


class Fournisseur(models.Model):
    """Fournisseur (ex: Maman Z)"""
    nom = models.CharField(max_length=100)
    telephone = models.CharField(max_length=20, blank=True)
    commercant = models.ForeignKey(Commercant, on_delete=models.CASCADE, related_name='fournisseurs')

    def __str__(self):
        return f'{self.nom}'


class ConfigMarche(models.Model):
    """Configuration du cycle de marché"""
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.CASCADE, related_name='configs_marche')
    cycle_jours = models.PositiveIntegerField(default=5)
    date_reference = models.DateField()

    def __str__(self):
        return f'Marché tous les {self.cycle_jours}j — {self.fournisseur.nom}'


class LotAchat(models.Model):
    """Lot de sacs achetés chez le fournisseur"""
    MODE_PAIEMENT = [
        ('comptant', 'Comptant'),
        ('credit', 'Crédit'),
    ]
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT, related_name='lots')
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.PROTECT, related_name='lots')
    quantite_sacs = models.PositiveIntegerField()
    prix_achat_sac = models.PositiveIntegerField()
    prix_vente_sac = models.PositiveIntegerField()
    duree_ecoulement_jours = models.PositiveIntegerField(default=5)
    date_achat = models.DateField(default=date.today)
    mode_paiement = models.CharField(max_length=10, choices=MODE_PAIEMENT, default='credit')
    quantite_restante = models.PositiveIntegerField()
    commercant = models.ForeignKey(Commercant, on_delete=models.CASCADE, related_name='lots')

    def save(self, *args, **kwargs):
        if not self.pk:
            self.quantite_restante = self.quantite_sacs
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.quantite_sacs} sacs {self.produit.get_nom_display()} du {self.date_achat}'


class Client(models.Model):
    """Cliente de la commerçante"""
    nom = models.CharField(max_length=100)
    telephone = models.CharField(max_length=20, blank=True)
    limite_credit = models.PositiveIntegerField(default=50000)
    commercant = models.ForeignKey(Commercant, on_delete=models.CASCADE, related_name='clients')

    def __str__(self):
        return self.nom

    @property
    def solde_du(self):
        """Total dû par la cliente (dette non remboursée)"""
        from django.db.models import Sum
        ventes_credit = self.ventes.filter(mode_paiement__in=['credit', 'mixte']).aggregate(
            total=Sum('montant_total')
        )['total'] or 0
        remboursements = self.remboursements.aggregate(
            total=Sum('montant')
        )['total'] or 0
        return max(0, ventes_credit - remboursements)


class Vente(models.Model):
    """Vente d'un produit à une cliente"""
    UNITE_CHOICES = [
        ('sac', '1 sac'),
        ('demi_sac', '½ sac'),
        ('quart_sac', '¼ sac'),
        ('sachet_bleu', 'Sachet bleu'),
        ('sachet_jaune', 'Sachet jaune'),
        ('bols', 'Bols (kg)'),
    ]
    MODE_PAIEMENT = [
        ('comptant', 'Comptant'),
        ('credit', 'Crédit'),
        ('mixte', 'Mixte'),
    ]
    lot = models.ForeignKey(LotAchat, on_delete=models.PROTECT, related_name='ventes')
    client = models.ForeignKey(Client, on_delete=models.SET_NULL, null=True, blank=True, related_name='ventes')
    unite = models.CharField(max_length=15, choices=UNITE_CHOICES)
    quantite = models.DecimalField(max_digits=6, decimal_places=2)
    prix_unitaire = models.PositiveIntegerField()
    montant_total = models.PositiveIntegerField()
    mode_paiement = models.CharField(max_length=10, choices=MODE_PAIEMENT, default='comptant')
    montant_rembourse = models.PositiveIntegerField(default=0)
    date_vente = models.DateTimeField(default=timezone.now)
    commercant = models.ForeignKey(Commercant, on_delete=models.CASCADE, related_name='ventes')

    def __str__(self):
        return f'Vente {self.unite} — {self.lot.produit.get_nom_display()} — {self.date_vente.date()}'


class Remboursement(models.Model):
    """Remboursement d'une dette par une cliente"""
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='remboursements')
    vente = models.ForeignKey(Vente, on_delete=models.SET_NULL, null=True, blank=True, related_name='remboursements')
    montant = models.PositiveIntegerField()
    date = models.DateTimeField(default=timezone.now)
    commercant = models.ForeignKey(Commercant, on_delete=models.CASCADE, related_name='remboursements')

    def __str__(self):
        return f'Remb. {self.montant} FCFA — {self.client.nom}'


class PaiementFournisseur(models.Model):
    """Paiement effectué au fournisseur"""
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.CASCADE, related_name='paiements')
    montant = models.PositiveIntegerField()
    date = models.DateTimeField(default=timezone.now)
    commercant = models.ForeignKey(Commercant, on_delete=models.CASCADE, related_name='paiements_fournisseur')

    def __str__(self):
        return f'Paiement {self.montant} FCFA à {self.fournisseur.nom}'


class OTPCode(models.Model):
    """Code OTP pour réinitialiser le mot de passe"""
    telephone = models.CharField(max_length=20)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    def is_valid(self):
        from datetime import timedelta
        return not self.used and timezone.now() < self.created_at + timedelta(minutes=10)

    def __str__(self):
        return f'OTP {self.telephone} — {self.code}'
