
'use client';

import Link from 'next/link';
import { useState, useEffect, type Key } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LicencieFormModal, type NewLicencieData } from '@/components/inscription/add-licencie-modal';
import { PaiementModal, type PaiementFormData } from '@/components/inscription/paiement-modal';
import { ArrowLeft, PlusCircle, Trash2, Edit3, ArrowRightCircle } from 'lucide-react';
import { format, isValid, parseISO, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { LicencieItem, PaiementDetails } from '@/app/inscription/nouveau-licencie/page';
import { useToast } from '@/hooks/use-toast';

// Types pour localStorage
type StoredLicencieItem = Omit<LicencieItem, 'dateNaissance' | 'responsableLegal' | 'paiement' | 'equipementAttribué' | 'statutEquipement'> & {
  dateNaissance: string;
  responsableLegal?: Omit<NonNullable<LicencieItem['responsableLegal']>, 'dateNaissance'> & {
    dateNaissance: string;
  };
  paiement?: Omit<PaiementDetails, 'datePaiement'> & {
    datePaiement?: string;
  };
  equipementAttribué?: LicencieItem['equipementAttribué'];
  statutEquipement?: LicencieItem['statutEquipement'];
};

// Interface pour les e-mails en attente
export interface PendingEmail {
  id: string;
  licencieId: string;
  licencieNom: string;
  licenciePrenom: string;
  licencieEmail?: string; // Destinataire principal
  packChoisi: string;
  montantTotalDu: number; 
  montantPaye: number; 
  methodePaiement?: string;
  datePreparation: string; // ISO string
  status: 'en_attente' | 'envoye';
  sujet: string;
  corps: string;
  source: string; 
}

type StoredPendingEmail = Omit<PendingEmail, 'datePreparation'> & {
  datePreparation: string;
};


const LICENCIES_STORAGE_KEY = 'TRAPEL_FC_LICENCIES_DATA';
const LICENCIES_PRETS_POUR_EQUIPEMENT_STORAGE_KEY = 'TRAPEL_FC_LICENCIES_PRETS_POUR_EQUIPEMENT_DATA';
const DATA_PAIEMENTS_COMPLETS_STORAGE_KEY = 'TRAPEL_FC_DATA_PAIEMENTS_COMPLETS_DATA';
const PENDING_EMAILS_STORAGE_KEY = 'TRAPEL_FC_PENDING_EMAILS_DATA';

const EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_SUBJECT';
const EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_BODY';

const DEFAULT_EMAIL_SUBJECT = "Confirmation d'inscription et de paiement - {{PRENOM_LICENCIE}} {{NOM_LICENCIE}}";
const DEFAULT_EMAIL_BODY = `
Bonjour {{PRENOM_LICENCIE}} {{NOM_LICENCIE}},

Nous vous confirmons votre inscription au Trapel Football Club pour la saison.
Votre pack "{{PACK_CHOISI}}" d'un montant de {{MONTANT_DU}}€ a été réglé.

Méthode de paiement : {{METHODE_PAIEMENT}}
Date de paiement : {{DATE_PAIEMENT}}

Vous allez être contacté prochainement pour la remise de votre équipement.

Sportivement,
Le Trapel FC.
`.trim();


// Fonctions pour gérer localStorage (TRAPEL_FC_LICENCIES_DATA)
const getLicenciesFromStorage = (): LicencieItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(LICENCIES_STORAGE_KEY);
  if (storedData) {
    try {
      const items = JSON.parse(storedData) as StoredLicencieItem[];
      return items.map(item => ({
        ...item,
        dateNaissance: parseISO(item.dateNaissance),
        responsableLegal: item.responsableLegal ? {
          ...item.responsableLegal,
          dateNaissance: parseISO(item.responsableLegal.dateNaissance),
        } : undefined,
        paiement: item.paiement ? {
          ...item.paiement,
          datePaiement: item.paiement.datePaiement ? parseISO(item.paiement.datePaiement) : undefined,
        } : undefined,
        statutEquipement: item.statutEquipement || 'En attente',
        equipementAttribué: item.equipementAttribué || [],
      }));
    } catch (error) {
      console.error("Error parsing licencies data from localStorage:", error);
      return [];
    }
  }
  return [];
};

const saveLicenciesToStorage = (licencies: LicencieItem[]) => {
  if (typeof window === 'undefined') return;
  const licenciesToStore: StoredLicencieItem[] = licencies.map(licencie => ({
    ...licencie,
    dateNaissance: licencie.dateNaissance.toISOString(),
    responsableLegal: licencie.responsableLegal ? {
      ...licencie.responsableLegal,
      dateNaissance: licencie.responsableLegal.dateNaissance.toISOString(),
    } : undefined,
    paiement: licencie.paiement ? {
      ...licencie.paiement,
      datePaiement: licencie.paiement.datePaiement ? licencie.paiement.datePaiement.toISOString() : undefined,
    } : undefined,
    statutEquipement: licencie.statutEquipement,
    equipementAttribué: licencie.equipementAttribué,
  }));
  localStorage.setItem(LICENCIES_STORAGE_KEY, JSON.stringify(licenciesToStore));
};

// Fonctions pour gérer localStorage (TRAPEL_FC_LICENCIES_PRETS_POUR_EQUIPEMENT_DATA)
const getLicenciesPretsPourEquipementFromStorage = (): LicencieItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(LICENCIES_PRETS_POUR_EQUIPEMENT_STORAGE_KEY);
  if (storedData) {
    try {
      const items = JSON.parse(storedData) as StoredLicencieItem[];
      return items.map(item => ({
        ...item,
        dateNaissance: parseISO(item.dateNaissance),
        responsableLegal: item.responsableLegal ? {
          ...item.responsableLegal,
          dateNaissance: parseISO(item.responsableLegal.dateNaissance),
        } : undefined,
        paiement: item.paiement ? {
          ...item.paiement,
          datePaiement: item.paiement.datePaiement ? parseISO(item.paiement.datePaiement) : undefined,
        } : undefined,
        statutEquipement: item.statutEquipement || 'En attente',
        equipementAttribué: item.equipementAttribué || [],
      }));
    } catch (error) {
      console.error("Error parsing licencies prets pour equipement data from localStorage:", error);
      return [];
    }
  }
  return [];
};

const saveLicenciesPretsPourEquipementToStorage = (licencies: LicencieItem[]) => {
  if (typeof window === 'undefined') return;
  const licenciesToStore: StoredLicencieItem[] = licencies.map(licencie => ({
    ...licencie,
    dateNaissance: licencie.dateNaissance.toISOString(),
    responsableLegal: licencie.responsableLegal ? {
      ...licencie.responsableLegal,
      dateNaissance: licencie.responsableLegal.dateNaissance.toISOString(),
    } : undefined,
    paiement: licencie.paiement ? {
      ...licencie.paiement,
      datePaiement: licencie.paiement.datePaiement ? licencie.paiement.datePaiement.toISOString() : undefined,
    } : undefined,
    statutEquipement: licencie.statutEquipement,
    equipementAttribué: licencie.equipementAttribué,
  }));
  localStorage.setItem(LICENCIES_PRETS_POUR_EQUIPEMENT_STORAGE_KEY, JSON.stringify(licenciesToStore));
};

// Fonctions pour gérer localStorage (TRAPEL_FC_DATA_PAIEMENTS_COMPLETS_DATA)
const getLicenciesDataPaiementsCompletsFromStorage = (): LicencieItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(DATA_PAIEMENTS_COMPLETS_STORAGE_KEY);
  if (storedData) {
    try {
      const items = JSON.parse(storedData) as StoredLicencieItem[];
      return items.map(item => ({
        ...item,
        dateNaissance: parseISO(item.dateNaissance),
        responsableLegal: item.responsableLegal ? {
          ...item.responsableLegal,
          dateNaissance: parseISO(item.responsableLegal.dateNaissance),
        } : undefined,
        paiement: item.paiement ? {
          ...item.paiement,
          datePaiement: item.paiement.datePaiement ? parseISO(item.paiement.datePaiement) : undefined,
        } : undefined,
        statutEquipement: item.statutEquipement,
        equipementAttribué: item.equipementAttribué || [],
      }));
    } catch (error) {
      console.error("Error parsing data paiements complets from localStorage:", error);
      return [];
    }
  }
  return [];
};

const saveLicenciesDataPaiementsCompletsToStorage = (licencies: LicencieItem[]) => {
  if (typeof window === 'undefined') return;
  const licenciesToStore: StoredLicencieItem[] = licencies.map(licencie => ({
    ...licencie,
    dateNaissance: licencie.dateNaissance.toISOString(),
    responsableLegal: licencie.responsableLegal ? {
      ...licencie.responsableLegal,
      dateNaissance: licencie.responsableLegal.dateNaissance.toISOString(),
    } : undefined,
    paiement: licencie.paiement ? {
      ...licencie.paiement,
      datePaiement: licencie.paiement.datePaiement ? licencie.paiement.datePaiement.toISOString() : undefined,
    } : undefined,
    statutEquipement: licencie.statutEquipement,
    equipementAttribué: licencie.equipementAttribué,
  }));
  localStorage.setItem(DATA_PAIEMENTS_COMPLETS_STORAGE_KEY, JSON.stringify(licenciesToStore));
};

// Fonctions pour gérer localStorage (TRAPEL_FC_PENDING_EMAILS_DATA) - EXPORTED
export const getPendingEmailsFromStorage = (): PendingEmail[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(PENDING_EMAILS_STORAGE_KEY);
  if (storedData) {
    try {
      const items = JSON.parse(storedData) as StoredPendingEmail[];
      return items.map(item => ({
        ...item,
        datePreparation: item.datePreparation, 
      }));
    } catch (error) {
      console.error("Error parsing pending emails from localStorage:", error);
      return [];
    }
  }
  return [];
};

export const savePendingEmailsToStorage = (emails: PendingEmail[]) => {
  if (typeof window === 'undefined') return;
  const emailsToStore: StoredPendingEmail[] = emails.map(email => ({
    ...email,
    datePreparation: email.datePreparation, 
  }));
  localStorage.setItem(PENDING_EMAILS_STORAGE_KEY, JSON.stringify(emailsToStore));
};


const estLicencieComplet = (licencie: Omit<LicencieItem, 'id' | 'packValide' | 'paiement' | 'equipementAttribué' | 'statutEquipement'>): boolean => {
  if (!licencie.nom || !licencie.prenom || !licencie.sexe || !licencie.dateNaissance || !licencie.categorie || !licencie.packChoisi) {
    return false;
  }
  if (!licencie.lieuNaissance || !licencie.telephone || !licencie.email) {
    return false;
  }
  const isMinor = differenceInYears(new Date(), licencie.dateNaissance) < 18;
  if (isMinor) {
    if (!licencie.responsableLegal) return false;
    const rl = licencie.responsableLegal;
    if (!rl.nom || !rl.prenom || !rl.dateNaissance || !rl.email) {
      return false;
    }
    if (!rl.telPere && !rl.telMere) {
      return false;
    }
  }
  return true;
};

const calculateRestantDu = (licencie: LicencieItem): number => {
  if (!licencie.packChoisi) return 0;

  if (licencie.paiement) {
    const baseDue = licencie.paiement.montantTotalDu;
    if (licencie.paiement.statutPaiement === 'Payé') {
      return 0;
    }
    if (licencie.paiement.statutPaiement === 'Partiel' && typeof licencie.paiement.montantPayePartiel === 'number') {
      return Math.max(0, baseDue - licencie.paiement.montantPayePartiel);
    }
    if (typeof licencie.paiement.montantPayePartiel === 'number' && licencie.paiement.montantPayePartiel > 0) {
         return Math.max(0, baseDue - licencie.paiement.montantPayePartiel);
    }
    return baseDue;
  }

  const packAmountMatch = licencie.packChoisi.match(/(\d+)€/);
  if (!packAmountMatch) return 0;
  return parseFloat(packAmountMatch[1]);
};

const formatPackForDisplay = (packChoisi?: string): string => {
  if (!packChoisi) return 'N/A';
  return packChoisi.split(' - ')[0];
};


export default function PaiementPage() {
  const [licencies, setLicencies] = useState<LicencieItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [licencieToDelete, setLicencieToDelete] = useState<LicencieItem | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isLicencieFormModalOpen, setIsLicencieFormModalOpen] = useState(false);
  const [licencieEnEdition, setLicencieEnEdition] = useState<LicencieItem | null>(null);
  const [isPaiementModalOpen, setIsPaiementModalOpen] = useState(false);
  const [selectedLicencieForPaiement, setSelectedLicencieForPaiement] = useState<LicencieItem | null>(null);
  const { toast } = useToast();

  const sortLicenciesForPaiement = (licenciesList: LicencieItem[]): LicencieItem[] => {
    return licenciesList.sort((a, b) => {
      if (a.packValide && !b.packValide) return -1; 
      if (!a.packValide && b.packValide) return 1;  
      const nomCompare = a.nom.localeCompare(b.nom);
      if (nomCompare !== 0) return nomCompare;
      return a.prenom.localeCompare(b.prenom);
    });
  };

  useEffect(() => {
    setIsLoading(true);
    const storedLicencies = getLicenciesFromStorage();
    setLicencies(sortLicenciesForPaiement(storedLicencies));
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LICENCIES_STORAGE_KEY) {
        setLicencies(sortLicenciesForPaiement(getLicenciesFromStorage()));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleAddLicencieClick = () => {
    setLicencieEnEdition(null);
    setIsLicencieFormModalOpen(true);
  };

  const handleEditLicencieClick = (licencie: LicencieItem) => {
    setLicencieEnEdition(licencie);
    setIsLicencieFormModalOpen(true);
  };

  const handleContinueInscriptionClick = (licencie: LicencieItem) => {
    setSelectedLicencieForPaiement(licencie);
    setIsPaiementModalOpen(true);
  };

  const handleSavePaiement = (licencieId: string, paiementData: PaiementFormData, montantTotalCalcule: number) => {
    let licencieADeplacer: LicencieItem | null = null;
    let licenciesApresPaiement = licencies.map(l => {
      if (l.id === licencieId) {
        const updatedPaiementDetails: PaiementDetails = {
          packOriginal: l.packChoisi,
          montantPackOriginal: parseFloat(l.packChoisi.match(/(\d+)€/)?.[1] || '0'),
          licenceAvecDon: paiementData.licenceAvecDon,
          enfantEducateur: paiementData.enfantEducateur,
          reductionFratrie: paiementData.reductionFratrie,
          nombreEnfantsFratrie: paiementData.nombreEnfantsFratrie,
          passSport: paiementData.passSport,
          codePassSport: paiementData.codePassSport,
          carteVillemoustoussou: paiementData.carteVillemoustoussou,
          codeCarteVillemoustoussou: paiementData.codeCarteVillemoustoussou,
          statutPaiement: paiementData.statutPaiement,
          montantPayePartiel: paiementData.montantPayePartiel,
          methodePaiement: paiementData.methodePaiement,
          autreMethodePaiement: paiementData.autreMethodePaiement,
          datePaiement: paiementData.datePaiement,
          commentaires: paiementData.commentaires,
          montantTotalDu: montantTotalCalcule,
        };
        const updatedLicencie: LicencieItem = {
          ...l,
          paiement: updatedPaiementDetails
        };

        const estComplet = estLicencieComplet(updatedLicencie as Omit<LicencieItem, 'id' | 'packValide' | 'paiement' | 'equipementAttribué' | 'statutEquipement'>);
        const updatedLicencieAvecCompletude = {...updatedLicencie, packValide: estComplet };

        if (updatedLicencieAvecCompletude.packValide && calculateRestantDu(updatedLicencieAvecCompletude) === 0) {
          licencieADeplacer = { 
            ...updatedLicencieAvecCompletude, 
            statutEquipement: 'En attente', // Initialisation pour la section équipement
            equipementAttribué: l.equipementAttribué || [] 
          };
        }
        return updatedLicencieAvecCompletude;
      }
      return l;
    });

    if (licencieADeplacer) {
      const licencieConcerne = licencieADeplacer;

      const licenciesPourEquipement = getLicenciesPretsPourEquipementFromStorage();
      saveLicenciesPretsPourEquipementToStorage([...licenciesPourEquipement, licencieConcerne]);
      
      const dataPaiementsComplets = getLicenciesDataPaiementsCompletsFromStorage();
      saveLicenciesDataPaiementsCompletsToStorage([...dataPaiementsComplets, licencieConcerne]);
      
      let emailSubjectTemplate = DEFAULT_EMAIL_SUBJECT;
      let emailBodyTemplate = DEFAULT_EMAIL_BODY;
      if (typeof window !== 'undefined') {
        emailSubjectTemplate = localStorage.getItem(EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_SUBJECT_KEY) || DEFAULT_EMAIL_SUBJECT;
        emailBodyTemplate = localStorage.getItem(EMAIL_TEMPLATE_PAYMENT_CONFIRMATION_BODY_KEY) || DEFAULT_EMAIL_BODY;
      }
      

      const isMinor = differenceInYears(new Date(), licencieConcerne.dateNaissance) < 18;
      let destinataireEmail = licencieConcerne.email;
      if (isMinor && licencieConcerne.responsableLegal?.email) {
        destinataireEmail = licencieConcerne.responsableLegal.email;
      }

      const replacements: Record<string, string> = {
        '{{PRENOM_LICENCIE}}': licencieConcerne.prenom,
        '{{NOM_LICENCIE}}': licencieConcerne.nom,
        '{{EMAIL_LICENCIE}}': licencieConcerne.email || '',
        '{{CATEGORIE_LICENCIE}}': licencieConcerne.categorie || '',
        '{{PACK_CHOISI}}': formatPackForDisplay(licencieConcerne.packChoisi),
        '{{MONTANT_DU}}': (licencieConcerne.paiement?.montantTotalDu || 0).toFixed(2),
        '{{METHODE_PAIEMENT}}': licencieConcerne.paiement?.methodePaiement === 'Autre' ? licencieConcerne.paiement?.autreMethodePaiement || 'Autre' : licencieConcerne.paiement?.methodePaiement || '',
        '{{DATE_PAIEMENT}}': licencieConcerne.paiement?.datePaiement ? format(licencieConcerne.paiement.datePaiement, 'dd/MM/yyyy', { locale: fr }) : '',
        '{{NOM_RESPONSABLE}}': licencieConcerne.responsableLegal?.nom || '',
        '{{PRENOM_RESPONSABLE}}': licencieConcerne.responsableLegal?.prenom || '',
        '{{EMAIL_RESPONSABLE}}': licencieConcerne.responsableLegal?.email || '',
      };

      for (const [placeholder, value] of Object.entries(replacements)) {
        emailSubjectTemplate = emailSubjectTemplate.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value || '');
        emailBodyTemplate = emailBodyTemplate.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value || '');
      }

      const newPendingEmail: PendingEmail = {
        id: crypto.randomUUID(),
        licencieId: licencieConcerne.id,
        licencieNom: licencieConcerne.nom,
        licenciePrenom: licencieConcerne.prenom,
        licencieEmail: destinataireEmail, 
        packChoisi: licencieConcerne.packChoisi,
        montantTotalDu: licencieConcerne.paiement?.montantTotalDu || 0,
        montantPaye: licencieConcerne.paiement?.montantPayePartiel && licencieConcerne.paiement?.statutPaiement === 'Partiel' ? licencieConcerne.paiement?.montantPayePartiel : licencieConcerne.paiement?.montantTotalDu || 0,
        methodePaiement: licencieConcerne.paiement?.methodePaiement === 'Autre' ? licencieConcerne.paiement?.autreMethodePaiement : licencieConcerne.paiement?.methodePaiement,
        datePreparation: new Date().toISOString(),
        status: 'en_attente',
        sujet: emailSubjectTemplate,
        corps: emailBodyTemplate,
        source: 'Confirmation de Paiement', 
      };
      const pendingEmails = getPendingEmailsFromStorage();
      savePendingEmailsToStorage([...pendingEmails, newPendingEmail]);
      toast({
        title: "E-mail Préparé",
        description: `Un e-mail de confirmation pour ${licencieConcerne.prenom} ${licencieConcerne.nom} est prêt dans la section "Mails". Destinataire: ${destinataireEmail || 'Non fourni'}`,
      });
      
      licenciesApresPaiement = licenciesApresPaiement.filter(l => l.id !== licencieConcerne.id);
    }

    setLicencies(sortLicenciesForPaiement(licenciesApresPaiement));
    saveLicenciesToStorage(licenciesApresPaiement);
    setIsPaiementModalOpen(false);
    setSelectedLicencieForPaiement(null);
  };

  const handleSaveLicencieData = (data: NewLicencieData) => {
    const isMinor = data.dateNaissance ? differenceInYears(new Date(), data.dateNaissance) < 18 : false;

    const licencieDataItem: Omit<LicencieItem, 'id' | 'packValide' | 'paiement' | 'equipementAttribué' | 'statutEquipement'> = {
      nom: data.nom,
      prenom: data.prenom,
      sexe: data.sexe,
      dateNaissance: data.dateNaissance,
      lieuNaissance: data.lieuNaissance,
      lieuNaissanceEtranger: data.lieuNaissanceEtranger,
      categorie: data.categorie,
      packChoisi: data.packChoisi,
      telephone: data.telephone,
      email: data.email,
      responsableLegal: isMinor && data.responsableLegalNom && data.responsableLegalPrenom && data.responsableLegalDateNaissance && data.responsableLegalEmail && (data.responsableLegalTelPere || data.responsableLegalTelMere) ? {
        nom: data.responsableLegalNom,
        prenom: data.responsableLegalPrenom,
        dateNaissance: data.responsableLegalDateNaissance,
        lieuNaissance: data.responsableLegalLieuNaissance || '',
        lieuNaissanceEtranger: data.responsableLegalLieuNaissanceEtranger,
        email: data.responsableLegalEmail,
        telPere: data.responsableLegalTelPere!,
        telMere: data.responsableLegalTelMere!,
      } : undefined,
    };

    const estComplet = estLicencieComplet(licencieDataItem);

    let updatedLicencies;
    if (licencieEnEdition) {
      updatedLicencies = licencies.map(l =>
        l.id === licencieEnEdition.id ? { 
            ...licencieEnEdition, 
            ...licencieDataItem, 
            packValide: estComplet, 
            statutEquipement: l.statutEquipement || 'En attente', 
            equipementAttribué: l.equipementAttribué || [] 
        } : l
      );
    } else {
      const newLicencie: LicencieItem = {
        ...licencieDataItem,
        id: crypto.randomUUID(),
        packValide: estComplet,
        paiement: undefined,
        statutEquipement: 'En attente',
        equipementAttribué: [],
      };
      updatedLicencies = [...licencies, newLicencie];
    }

    const sortedLicencies = sortLicenciesForPaiement(updatedLicencies);
    setLicencies(sortedLicencies);
    saveLicenciesToStorage(sortedLicencies);
    setIsLicencieFormModalOpen(false);
    setLicencieEnEdition(null);
  };

  const requestDeleteLicencie = (licencie: LicencieItem) => {
    setLicencieToDelete(licencie);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteLicencie = () => {
    if (licencieToDelete) {
      const updatedLicencies = licencies.filter(l => l.id !== licencieToDelete.id);
      setLicencies(sortLicenciesForPaiement(updatedLicencies));
      saveLicenciesToStorage(updatedLicencies);
    }
    setIsConfirmDeleteDialogOpen(false);
    setLicencieToDelete(null);
  };

  const cancelDeleteLicencie = () => {
    setIsConfirmDeleteDialogOpen(false);
    setLicencieToDelete(null);
  };


  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement des licenciés...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/inscription">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour aux Inscriptions</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Gestion des Paiements</h1>
        </div>
        <Button onClick={handleAddLicencieClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un licencié
        </Button>
      </div>

      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2 px-4 text-center">Continuer</TableHead>
              <TableHead className="py-2 px-4">Nom</TableHead>
              <TableHead className="py-2 px-4">Prénom</TableHead>
              <TableHead className="py-2 px-4 text-center">Sexe</TableHead>
              <TableHead className="py-2 px-4 text-center">Catégorie</TableHead>
              <TableHead className="py-2 px-4 text-center">Pack</TableHead>
              <TableHead className="py-2 px-4 text-center">Restant Dû</TableHead>
              <TableHead className="py-2 px-4 text-center">État</TableHead>
              <TableHead className="text-right py-2 px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licencies.map((licencie) => (
              <TableRow key={licencie.id}>
                <TableCell className="py-2 px-4 text-center">
                  {licencie.packValide && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleContinueInscriptionClick(licencie)}
                      aria-label={`Continuer l'inscription pour ${licencie.prenom} ${licencie.nom}`}
                    >
                      <ArrowRightCircle className="h-5 w-5 text-green-600" />
                    </Button>
                  )}
                </TableCell>
                <TableCell className="py-2 px-4 font-medium">{licencie.nom}</TableCell>
                <TableCell className="py-2 px-4">{licencie.prenom}</TableCell>
                <TableCell className="py-2 px-4 text-center">{licencie.sexe}</TableCell>
                <TableCell className="py-2 px-4 text-center">{licencie.categorie}</TableCell>
                <TableCell className="py-2 px-4 text-center">{formatPackForDisplay(licencie.packChoisi)}</TableCell>
                <TableCell className={cn(
                  "py-2 px-4 text-center",
                  (licencie.paiement && licencie.paiement.statutPaiement !== 'Payé' && calculateRestantDu(licencie) > 0 && licencie.paiement.montantPayePartiel && licencie.paiement.montantPayePartiel > 0)
                  ? "text-orange-600 font-semibold"
                  : ""
                )}>
                  {calculateRestantDu(licencie).toFixed(2)}€
                </TableCell>
                <TableCell className={cn(
                    "py-2 px-4 text-center",
                    licencie.packValide ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                  )}
                >
                  <span className="px-2 py-1 text-xs font-semibold rounded-full">
                    {licencie.packValide ? 'Complet' : 'Incomplet'}
                  </span>
                </TableCell>
                <TableCell className="py-2 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditLicencieClick(licencie)}
                    aria-label={`Modifier ${licencie.prenom} ${licencie.nom}`}
                    className="mr-2"
                  >
                    <Edit3 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => requestDeleteLicencie(licencie)}
                    aria-label={`Supprimer ${licencie.prenom} ${licencie.nom}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {licencies.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Aucun licencié à afficher. Cliquez sur "Ajouter un licencié" pour commencer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {licencieToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer le licencié "{licencieToDelete.prenom} {licencieToDelete.nom}" ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDeleteLicencie}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteLicencie} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <LicencieFormModal
        isOpen={isLicencieFormModalOpen}
        onClose={() => {
            setIsLicencieFormModalOpen(false);
            setLicencieEnEdition(null);
        }}
        onSave={handleSaveLicencieData}
        initialData={licencieEnEdition}
      />

      {selectedLicencieForPaiement && (
        <PaiementModal
          isOpen={isPaiementModalOpen}
          onClose={() => {
            setIsPaiementModalOpen(false);
            setSelectedLicencieForPaiement(null);
          }}
          licencie={selectedLicencieForPaiement}
          onSave={handleSavePaiement}
        />
      )}

    </div>
  );
}

