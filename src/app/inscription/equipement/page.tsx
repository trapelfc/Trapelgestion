
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { ArrowLeft, ArrowRightCircle } from 'lucide-react';
import type { LicencieItem, PaiementDetails } from '@/app/inscription/nouveau-licencie/page';
import { parseISO, format, isValid, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AttributionEquipementModal } from '@/components/inscription/attribution-equipement-modal';
import { getStockEquipementFromStorage, saveStockEquipementToStorage, type EquipementItem as StockEquipementItem } from '@/app/stock/equipement/page';
import { type AttributedEquipement, PACK_COMPOSITIONS_STORAGE_KEY, type PackItemDetail } from '@/config/stock-constants';
import { getPendingEmailsFromStorage, savePendingEmailsToStorage, type PendingEmail } from '@/app/inscription/paiement/page';
import { cn } from '@/lib/utils';
import { getStoredPackCompositions } from '@/app/administration/gestion-listes/packs-licencies/page';
import { useToast } from '@/hooks/use-toast';

// Type for storing in localStorage (dates as strings)
type StoredLicencieItem = Omit<LicencieItem, 'dateNaissance' | 'responsableLegal' | 'paiement' | 'equipementAttribué' | 'statutEquipement'> & {
  dateNaissance: string; // ISO string
  responsableLegal?: Omit<NonNullable<LicencieItem['responsableLegal']>, 'dateNaissance'> & {
    dateNaissance: string; // ISO string
  };
  paiement?: Omit<PaiementDetails, 'datePaiement'> & {
    datePaiement?: string; // ISO string
  };
  equipementAttribué?: AttributedEquipement[];
  statutEquipement?: 'En attente' | 'Incomplet' | 'Complet';
};

const LICENCIES_PRETS_POUR_EQUIPEMENT_STORAGE_KEY = 'TRAPEL_FC_LICENCIES_PRETS_POUR_EQUIPEMENT_DATA';
const DATA_EQUIPEMENT_ATTRIBUE_STORAGE_KEY = 'TRAPEL_FC_DATA_EQUIPEMENT_ATTRIBUE_DATA';

const EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_SUBJECT';
const EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_BODY';
const EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_SUBJECT';
const EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_BODY';

const DEFAULT_EQUIPMENT_SUBJECT = "Confirmation de remise d'équipement - {{PRENOM_LICENCIE}} {{NOM_LICENCIE}}";
const DEFAULT_EQUIPMENT_BODY = `
Bonjour {{PRENOM_LICENCIE}} {{NOM_LICENCIE}},

Nous vous confirmons la remise de votre équipement pour le pack "{{PACK_CHOISI}}" :

{{LISTE_EQUIPEMENTS}}

Nous vous souhaitons une excellente saison !

Sportivement,
Le Trapel FC.
`.trim();

const DEFAULT_EQUIPMENT_INCOMPLETE_SUBJECT = "Information sur votre équipement - {{PRENOM_LICENCIE}} {{NOM_LICENCIE}}";
const DEFAULT_EQUIPMENT_INCOMPLETE_BODY = `
Bonjour {{PRENOM_LICENCIE}} {{NOM_LICENCIE}},

Suite à votre inscription et au choix de votre pack "{{PACK_CHOISI}}", voici le détail de votre équipement :

{{LISTE_EQUIPEMENTS}}

Certains articles sont actuellement en attente en raison d'une rupture de stock. Nous vous contacterons dès qu'ils seront disponibles.

Merci de votre compréhension.

Sportivement,
Le Trapel FC.
`.trim();

// Définitions pour les besoins d'équipement
export const EQUIPMENT_NEEDS_STORAGE_KEY = 'TRAPEL_FC_EQUIPMENT_NEEDS_DATA';

export interface AggregatedEquipmentNeed {
  id: string; // Composite key: articleName-size (ou articleName-no-size)
  articleName: string;
  size?: string;
  totalQuantityNeeded: number;
  lastUpdate: string; // ISO date string
}

export const getEquipmentNeedsFromStorage = (): AggregatedEquipmentNeed[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(EQUIPMENT_NEEDS_STORAGE_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error parsing equipment needs from storage", e);
    return [];
  }
};

export const saveEquipmentNeedsToStorage = (needs: AggregatedEquipmentNeed[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EQUIPMENT_NEEDS_STORAGE_KEY, JSON.stringify(needs));
  // Optionnel: Dispatch un événement pour que d'autres onglets/composants puissent réagir
  window.dispatchEvent(new StorageEvent('storage', { key: EQUIPMENT_NEEDS_STORAGE_KEY }));
};


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
        equipementAttribué: item.equipementAttribué || [],
        statutEquipement: item.statutEquipement || 'En attente',
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
    equipementAttribué: licencie.equipementAttribué || [],
    statutEquipement: licencie.statutEquipement,
  }));
  localStorage.setItem(LICENCIES_PRETS_POUR_EQUIPEMENT_STORAGE_KEY, JSON.stringify(licenciesToStore));
};

const getDataEquipementAttribueFromStorage = (): LicencieItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(DATA_EQUIPEMENT_ATTRIBUE_STORAGE_KEY);
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
        equipementAttribué: item.equipementAttribué || [],
        statutEquipement: item.statutEquipement || 'Complet', // Default to Complet for this list
      }));
    } catch (error) {
      console.error("Error parsing data equipement attribue from localStorage:", error);
      return [];
    }
  }
  return [];
};

const saveDataEquipementAttribueToStorage = (licencies: LicencieItem[]) => {
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
    equipementAttribué: licencie.equipementAttribué || [],
    statutEquipement: licencie.statutEquipement,
  }));
  localStorage.setItem(DATA_EQUIPEMENT_ATTRIBUE_STORAGE_KEY, JSON.stringify(licenciesToStore));
};

const formatPackForDisplay = (packChoisi?: string): string => {
  if (!packChoisi) return 'N/A';
  return packChoisi.split(' - ')[0];
};

const isAttributionComplete = (
  licencie: LicencieItem,
  attributionDetails: AttributedEquipement[],
  packCompositions: Record<string, PackItemDetail[]>,
  currentStockLevels: StockEquipementItem[]
): boolean => {
  const packDefinition = packCompositions[licencie.packChoisi as keyof typeof packCompositions];
  if (!packDefinition || packDefinition.length === 0) {
    return attributionDetails.length === 0;
  }

  for (const packItemDef of packDefinition) {
    const attributedItem = attributionDetails.find(ad =>
      ad.packArticleName === (packItemDef.isChoice && packItemDef.options?.length ? packItemDef.options.join(' OU ') : packItemDef.articleName)
    );

    if (!attributedItem || !attributedItem.selectedArticleName) {
      return false; 
    }

    if (attributedItem.isOutOfStockOverride) {
      continue; 
    }
    
    const stockItemInfo = currentStockLevels.find(e => e.name === attributedItem.selectedArticleName);
    if (!stockItemInfo) {
      return false; 
    }

    if (stockItemInfo.hasSizeVariants) {
      if (!attributedItem.size) {
        return false; 
      }
      if ((stockItemInfo.sizeBreakdown?.[attributedItem.size] ?? 0) < attributedItem.quantity) {
        return false; 
      }
    } else {
      if (stockItemInfo.quantity < attributedItem.quantity) {
        return false; 
      }
    }
  }
  
  if (attributionDetails.some(ad => ad.isOutOfStockOverride)) {
    const isAnOverriddenItemRequired = packDefinition.some(packItemDef => {
        const attributedItem = attributionDetails.find(ad =>
            ad.packArticleName === (packItemDef.isChoice && packItemDef.options?.length ? packItemDef.options.join(' OU ') : packItemDef.articleName)
        );
        return attributedItem?.isOutOfStockOverride;
    });
    if(isAnOverriddenItemRequired) return false;
  }

  return true;
};

export default function EquipementInscriptionPage() {
  const [licenciesPrets, setLicenciesPrets] = useState<LicencieItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAttributionModalOpen, setIsAttributionModalOpen] = useState(false);
  const [selectedLicencie, setSelectedLicencie] = useState<LicencieItem | null>(null);
  const [equipementsEnStock, setEquipementsEnStock] = useState<StockEquipementItem[]>([]);
  const [dynamicPackCompositions, setDynamicPackCompositions] = useState<Record<string, PackItemDetail[]>>({});
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const storedLicencies = getLicenciesPretsPourEquipementFromStorage();
    const sortedLicencies = storedLicencies.sort((a, b) => {
        const nomCompare = a.nom.localeCompare(b.nom);
        if (nomCompare !== 0) return nomCompare;
        return a.prenom.localeCompare(b.prenom);
    });
    setLicenciesPrets(sortedLicencies);
    setEquipementsEnStock(getStockEquipementFromStorage());
    setDynamicPackCompositions(getStoredPackCompositions());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === LICENCIES_PRETS_POUR_EQUIPEMENT_STORAGE_KEY) {
        const storedLicencies = getLicenciesPretsPourEquipementFromStorage();
        const sortedLicencies = storedLicencies.sort((a, b) => {
            const nomCompare = a.nom.localeCompare(b.nom);
            if (nomCompare !== 0) return nomCompare;
            return a.prenom.localeCompare(b.prenom);
        });
        setLicenciesPrets(sortedLicencies);
      }
      if (event.key === 'TRAPEL_FC_STOCK_DATA') { 
        setEquipementsEnStock(getStockEquipementFromStorage());
      }
      if (event.key === PACK_COMPOSITIONS_STORAGE_KEY) { 
        setDynamicPackCompositions(getStoredPackCompositions());
      }
      if (event.key === EQUIPMENT_NEEDS_STORAGE_KEY) {
        // Optionnel: si on veut que cette page réagisse aux changements de besoins
        // console.log("Equipment needs updated by another tab/component.");
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleContinueClick = (licencie: LicencieItem) => {
    setSelectedLicencie(licencie);
    setEquipementsEnStock(getStockEquipementFromStorage()); 
    setIsAttributionModalOpen(true);
  };

  const handleSaveAttribution = (licencieId: string, attributionDetails: AttributedEquipement[]) => {
    const licencieCible = licenciesPrets.find(l => l.id === licencieId);
    if (!licencieCible) {
      toast({ title: "Erreur", description: "Licencié non trouvé.", variant: "destructive" });
      return;
    }

    const currentStockLevels = getStockEquipementFromStorage(); 
    
    const estPhysiquementComplet = isAttributionComplete(
      licencieCible,
      attributionDetails,
      dynamicPackCompositions,
      currentStockLevels 
    );
    
    const nouveauStatutEquipement = estPhysiquementComplet ? 'Complet' : 'Incomplet';

    let stockActuallyModified = false;
    let stockAfterDeduction = currentStockLevels.map(item => ({
      ...item,
      sizeBreakdown: item.sizeBreakdown ? { ...item.sizeBreakdown } : undefined,
    }));

    if (estPhysiquementComplet) { 
      attributionDetails.forEach(attribué => {
        const stockItemIndex = stockAfterDeduction.findIndex(sItem => sItem.name === attribué.selectedArticleName);
        if (stockItemIndex > -1) {
          const stockItem = stockAfterDeduction[stockItemIndex];
          let stockAvailableForDeduction = false;

          if (stockItem.hasSizeVariants && attribué.size && stockItem.sizeBreakdown && stockItem.availableSizes?.includes(attribué.size)) {
            const currentSizeQuantity = stockItem.sizeBreakdown[attribué.size] || 0;
            if (currentSizeQuantity >= attribué.quantity) {
              stockItem.sizeBreakdown[attribué.size] = currentSizeQuantity - attribué.quantity;
              stockAvailableForDeduction = true;
            }
          } else if (!stockItem.hasSizeVariants) {
            if (stockItem.quantity >= attribué.quantity) {
              stockItem.quantity -= attribué.quantity;
              stockAvailableForDeduction = true;
            }
          }
          
          if (stockAvailableForDeduction) {
            if (stockItem.hasSizeVariants && stockItem.sizeBreakdown) {
                 stockItem.quantity = Object.values(stockItem.sizeBreakdown).reduce((sum, qty) => sum + (qty || 0), 0);
            }
            stockItem.lastUpdated = new Date();
            stockAfterDeduction[stockItemIndex] = stockItem;
            stockActuallyModified = true;
          } else {
            console.warn(`Stock became insufficient for ${attribué.selectedArticleName} during attribution process.`);
          }
        }
      });
    } 
    
    if (stockActuallyModified) {
        saveStockEquipementToStorage(stockAfterDeduction);
        setEquipementsEnStock(stockAfterDeduction); 
    }

    let updatedLicenciesPrets = licenciesPrets.map(l => {
      if (l.id === licencieId) {
        return {
          ...l,
          equipementAttribué: attributionDetails, 
          statutEquipement: nouveauStatutEquipement,
        };
      }
      return l;
    });

    const licenciePourDataOuEmail = updatedLicenciesPrets.find(l => l.id === licencieId);
    
    if (licenciePourDataOuEmail) {
      let emailTemplateKeySubject = '';
      let emailTemplateKeyBody = '';
      let emailDefaultSubject = '';
      let emailDefaultBody = '';
      let emailSource = '';
      let listeEquipementsTexte = '';

      const fournis: string[] = [];
      const enAttente: string[] = [];

      attributionDetails.forEach(eq => {
        let itemText = `- ${eq.selectedArticleName}`;
        if (eq.size) itemText += ` (Taille: ${eq.size})`;
        itemText += ` x${eq.quantity}`;

        if (eq.isOutOfStockOverride) {
          enAttente.push(itemText);
        } else {
          fournis.push(itemText);
        }
      });
      
      if (nouveauStatutEquipement === 'Complet') {
        emailTemplateKeySubject = EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_SUBJECT_KEY;
        emailTemplateKeyBody = EMAIL_TEMPLATE_EQUIPMENT_CONFIRMATION_BODY_KEY;
        emailDefaultSubject = DEFAULT_EQUIPMENT_SUBJECT;
        emailDefaultBody = DEFAULT_EQUIPMENT_BODY;
        emailSource = "Confirmation d'Équipement";

        if (fournis.length > 0) {
          listeEquipementsTexte = "Équipements fournis :\\n" + fournis.join('\\n');
        } else {
           listeEquipementsTexte = "Aucun équipement spécifiquement marqué comme 'fourni'.";
        }
        if (enAttente.length > 0) { 
            listeEquipementsTexte += "\\n\\nÉquipements initialement en rupture mais finalement trouvés/forcés :\\n" + enAttente.join('\\n');
        }

      } else if (nouveauStatutEquipement === 'Incomplet') { // Modification ici pour inclure tous les cas d'incomplet
        emailTemplateKeySubject = EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_SUBJECT_KEY;
        emailTemplateKeyBody = EMAIL_TEMPLATE_EQUIPMENT_INCOMPLETE_BODY_KEY;
        emailDefaultSubject = DEFAULT_EQUIPMENT_INCOMPLETE_SUBJECT;
        emailDefaultBody = DEFAULT_EQUIPMENT_INCOMPLETE_BODY;
        emailSource = "Équipement Incomplet";
        
        if (fournis.length > 0) {
          listeEquipementsTexte += "Équipements fournis :\\n" + fournis.join('\\n');
        }
        if (enAttente.length > 0) {
          if (fournis.length > 0) listeEquipementsTexte += "\\n\\n";
          listeEquipementsTexte += "Équipements en attente (seront fournis ultérieurement en raison de rupture de stock) :\\n" + enAttente.join('\\n');
        }
        if (listeEquipementsTexte === '' || (fournis.length === 0 && enAttente.length === 0)) {
           // Cas où la logique de isAttributionComplete a déterminé 'Incomplet' sans override,
           // ou si tous les articles sont en rupture.
           listeEquipementsTexte = "Certains articles de votre pack ne sont pas disponibles immédiatement ou sont en attente. Nous vous contacterons pour la suite.";
        }

        // Logique pour ajouter les besoins à la liste de commande équipement
        const itemsManquantsPourCommande: { articleName: string; size?: string; quantity: number }[] = [];
        attributionDetails.forEach(eq => {
            if (eq.isOutOfStockOverride) { // Uniquement ceux marqués comme "forcés"
                itemsManquantsPourCommande.push({
                    articleName: eq.selectedArticleName,
                    size: eq.size,
                    quantity: eq.quantity,
                });
            }
        });

        if (itemsManquantsPourCommande.length > 0) {
            const currentNeeds = getEquipmentNeedsFromStorage();
            const updatedNeeds: AggregatedEquipmentNeed[] = [...currentNeeds];

            itemsManquantsPourCommande.forEach(manquant => {
                const needId = `${manquant.articleName}-${manquant.size || 'no-size'}`;
                const existingNeedIndex = updatedNeeds.findIndex(n => n.id === needId);

                if (existingNeedIndex > -1) {
                    updatedNeeds[existingNeedIndex].totalQuantityNeeded += manquant.quantity;
                    updatedNeeds[existingNeedIndex].lastUpdate = new Date().toISOString();
                } else {
                    updatedNeeds.push({
                        id: needId,
                        articleName: manquant.articleName,
                        size: manquant.size,
                        totalQuantityNeeded: manquant.quantity,
                        lastUpdate: new Date().toISOString(),
                    });
                }
            });
            saveEquipmentNeedsToStorage(updatedNeeds);
            toast({
                title: "Besoins d'équipement mis à jour",
                description: `${itemsManquantsPourCommande.length} type(s) d'article(s) en rupture ont été ajouté(s) à la liste des besoins pour commande.`,
                duration: 7000,
            });
        }
      }


      if (emailSource) { 
        let emailSubjectTemplate = emailDefaultSubject;
        let emailBodyTemplate = emailDefaultBody;
        if (typeof window !== 'undefined') {
          emailSubjectTemplate = localStorage.getItem(emailTemplateKeySubject) || emailDefaultSubject;
          emailBodyTemplate = localStorage.getItem(emailTemplateKeyBody) || emailDefaultBody;
        }

        const isMinor = differenceInYears(new Date(), licenciePourDataOuEmail.dateNaissance) < 18;
        let destinataireEmail = licenciePourDataOuEmail.email;
        if (isMinor && licenciePourDataOuEmail.responsableLegal?.email) {
          destinataireEmail = licenciePourDataOuEmail.responsableLegal.email;
        }

        const replacements: Record<string, string> = {
          '{{PRENOM_LICENCIE}}': licenciePourDataOuEmail.prenom,
          '{{NOM_LICENCIE}}': licenciePourDataOuEmail.nom,
          '{{EMAIL_LICENCIE}}': licenciePourDataOuEmail.email || '',
          '{{CATEGORIE_LICENCIE}}': licenciePourDataOuEmail.categorie || '',
          '{{PACK_CHOISI}}': formatPackForDisplay(licenciePourDataOuEmail.packChoisi),
          '{{NOM_RESPONSABLE}}': licenciePourDataOuEmail.responsableLegal?.nom || '',
          '{{PRENOM_RESPONSABLE}}': licenciePourDataOuEmail.responsableLegal?.prenom || '',
          '{{EMAIL_RESPONSABLE}}': licenciePourDataOuEmail.responsableLegal?.email || '',
          '{{LISTE_EQUIPEMENTS}}': listeEquipementsTexte,
        };

        for (const [placeholder, value] of Object.entries(replacements)) {
          emailSubjectTemplate = emailSubjectTemplate.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value || '');
          emailBodyTemplate = emailBodyTemplate.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value || '');
        }

        const newPendingEmail: PendingEmail = {
          id: crypto.randomUUID(),
          licencieId: licenciePourDataOuEmail.id,
          licencieNom: licenciePourDataOuEmail.nom,
          licenciePrenom: licenciePourDataOuEmail.prenom,
          licencieEmail: destinataireEmail,
          packChoisi: licenciePourDataOuEmail.packChoisi || '',
          montantTotalDu: 0, 
          montantPaye: 0,    
          methodePaiement: undefined, 
          datePreparation: new Date().toISOString(),
          status: 'en_attente',
          sujet: emailSubjectTemplate,
          corps: emailBodyTemplate,
          source: emailSource,
        };
        const pendingEmails = getPendingEmailsFromStorage();
        savePendingEmailsToStorage([...pendingEmails, newPendingEmail]);
      }

      if (nouveauStatutEquipement === 'Complet') {
        const dataEquipement = getDataEquipementAttribueFromStorage();
        saveDataEquipementAttribueToStorage([...dataEquipement, licenciePourDataOuEmail]);
        updatedLicenciesPrets = updatedLicenciesPrets.filter(l => l.id !== licencieId);
        toast({ title: "Équipement Complet", description: `${licenciePourDataOuEmail.prenom} ${licenciePourDataOuEmail.nom} a reçu tout son équipement et a été déplacé.` });
      } else {
         toast({ title: "Équipement Enregistré", description: `L'équipement pour ${licenciePourDataOuEmail.prenom} ${licenciePourDataOuEmail.nom} a été enregistré comme ${nouveauStatutEquipement.toLowerCase()}.` });
      }
    }

    setLicenciesPrets(updatedLicenciesPrets.sort((a, b) => {
        const nomCompare = a.nom.localeCompare(b.nom);
        if (nomCompare !== 0) return nomCompare;
        return a.prenom.localeCompare(b.prenom);
    }));
    saveLicenciesPretsPourEquipementToStorage(updatedLicenciesPrets);
    setIsAttributionModalOpen(false); 
    setSelectedLicencie(null); 
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement des licenciés prêts pour équipement...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
         <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/inscription">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour aux Inscriptions</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Gestion Équipement des Licenciés</h1>
      </div>

      {licenciesPrets.length > 0 ? (
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
                <TableHead className="py-2 px-4 text-center">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {licenciesPrets.map((licencie) => (
                <TableRow
                  key={licencie.id}
                  className={cn(
                    licencie.statutEquipement === 'Incomplet' ? 'bg-orange-100 dark:bg-orange-900/30' : '',
                    licencie.statutEquipement === 'Complet' ? 'bg-green-100 dark:bg-green-900/30' : '' 
                  )}
                >
                  <TableCell className="py-2 px-4 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleContinueClick(licencie)}
                      aria-label={`Continuer équipement pour ${licencie.prenom} ${licencie.nom}`}
                    >
                      <ArrowRightCircle className="h-5 w-5 text-green-600" />
                    </Button>
                  </TableCell>
                  <TableCell className="py-2 px-4 font-medium">{licencie.nom}</TableCell>
                  <TableCell className="py-2 px-4">{licencie.prenom}</TableCell>
                  <TableCell className="py-2 px-4 text-center">{licencie.sexe}</TableCell>
                  <TableCell className="py-2 px-4 text-center">{licencie.categorie}</TableCell>
                  <TableCell className="py-2 px-4 text-center">{formatPackForDisplay(licencie.packChoisi)}</TableCell>
                  <TableCell className={cn(
                      "py-2 px-4 text-center",
                      licencie.statutEquipement === 'Incomplet' ? 'text-orange-800 dark:text-orange-300 font-semibold' : '',
                      licencie.statutEquipement === 'Complet' ? 'text-green-800 dark:text-green-300 font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    {licencie.statutEquipement || 'En attente'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          Aucun licencié n'est actuellement prêt pour l'attribution d'équipement.
          <p className="mt-2 text-sm">Les licenciés dont le dossier est complet et le paiement soldé apparaîtront ici.</p>
        </div>
      )}

      {selectedLicencie && (
        <AttributionEquipementModal
          isOpen={isAttributionModalOpen}
          onClose={() => {
            setIsAttributionModalOpen(false);
            setSelectedLicencie(null);
          }}
          licencie={selectedLicencie}
          equipementsEnStock={equipementsEnStock}
          onSave={handleSaveAttribution}
        />
      )}
    </div>
  );
}
    

    

