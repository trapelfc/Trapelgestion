
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Edit3, Trash2, Copy, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
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
import { useToast } from '@/hooks/use-toast';
import { AddCommandeModal } from '@/components/commande/add-commande-modal';
import type { CommandeType, CommandeTypeArticle } from '@/app/commande/nourriture-boissons/types/page';
import { getStoredCommandeTypes } from '@/app/commande/nourriture-boissons/types/page';
import type { NourritureBoissonListItem } from '@/app/administration/gestion-listes/listes-nourriture-boissons/page';
import { getStoredNourritureBoissonListItems, NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY } from '@/app/administration/gestion-listes/listes-nourriture-boissons/page';
import type { PendingEmail } from '@/app/inscription/paiement/page';
import { getPendingEmailsFromStorage, savePendingEmailsToStorage } from '@/app/inscription/paiement/page';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FormItem } from '@/components/ui/form';

export interface CommandeArticleDetail {
  nomArticle: string;
  quantite: number;
  prixUnitaire?: number;
  prixTotalArticle?: number;
}
export interface NouvelleCommandeEnPreparation {
  id: string;
  nom: string;
  type: 'modele' | 'ponctuelle';
  articles: CommandeArticleDetail[];
  montantTotalCommande: number;
  modelType?: 'annexe' | 'match';
}

export interface ArchivedCommande {
  nom: string;
  articles: CommandeArticleDetail[];
  montantTotalCommande: number;
}

// Nouvelle interface pour les commandes agrégées par fournisseur dans l'archive
export interface AggregatedSupplierOrderForArchive {
  supplierName: string;
  supplierEmail?: string;
  articles: { nomArticle: string; quantiteCommandee: number; prixUnitaire?: number }[];
  montantTotalFournisseur: number;
}

export interface ArchivedCommandSession {
  id: string;
  weekLabel: string;
  weekStartDate: string; // YYYY-MM-DD
  totalSessionAmount: number;
  commands: ArchivedCommande[];
  archivedAt: string; // ISO date
  supplierOrdersGeneratedAt?: string; // ISO date, quand les commandes fournisseurs ont été finalisées
  supplierAggregatedOrders?: AggregatedSupplierOrderForArchive[]; // Commandes agrégées par fournisseur
}

export const ARCHIVED_FOOD_COMMAND_SESSIONS_STORAGE_KEY = 'TRAPEL_FC_ARCHIVED_FOOD_COMMAND_SESSIONS_DATA';
export const CURRENT_SESSION_FOR_SUPPLIER_RECAP_STORAGE_KEY = 'TRAPEL_FC_CURRENT_SESSION_FOR_SUPPLIER_RECAP_DATA';
export const LAST_ARCHIVED_SESSION_ID_FOR_SUPPLIER_RECAP_STORAGE_KEY = 'TRAPEL_FC_LAST_ARCHIVED_SESSION_ID_FOR_SUPPLIER_RECAP_DATA';


const NOUVELLES_COMMANDES_EN_PREPARATION_STORAGE_KEY = 'TRAPEL_FC_NOUVELLES_COMMANDES_EN_PREP_DATA';

const EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_SUBJECT';
const EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_BODY';


const getStoredNouvellesCommandes = (): NouvelleCommandeEnPreparation[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(NOUVELLES_COMMANDES_EN_PREPARATION_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveStoredNouvellesCommandes = (commandes: NouvelleCommandeEnPreparation[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOUVELLES_COMMANDES_EN_PREPARATION_STORAGE_KEY, JSON.stringify(commandes));
  window.dispatchEvent(new StorageEvent('storage', { key: NOUVELLES_COMMANDES_EN_PREPARATION_STORAGE_KEY }));
};

export const getArchivedCommandSessions = (): ArchivedCommandSession[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(ARCHIVED_FOOD_COMMAND_SESSIONS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as ArchivedCommandSession[];
    } catch (e) {
      console.error("Error parsing archived command sessions:", e);
      return [];
    }
  }
  return [];
};

export const saveArchivedCommandSessions = (sessions: ArchivedCommandSession[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ARCHIVED_FOOD_COMMAND_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new StorageEvent('storage', { key: ARCHIVED_FOOD_COMMAND_SESSIONS_STORAGE_KEY }));
};


const formatPrice = (price?: number) => {
  if (price === undefined || price === null) return '-';
  return `${price.toFixed(2)} €`;
};

type MatchModelSelection = 'domicile' | 'exterieur';

export default function NouvelleCommandePage() {
  const router = useRouter(); // Initialize useRouter
  const [nouvellesCommandes, setNouvellesCommandes] = useState<NouvelleCommandeEnPreparation[]>([]);
  const [isAddCommandeModalOpen, setIsAddCommandeModalOpen] = useState(false);
  const [commandeToEdit, setCommandeToEdit] = useState<NouvelleCommandeEnPreparation | null>(null);

  const [allCommandeTypes, setAllCommandeTypes] = useState<CommandeType[]>([]);
  const [matchCommandeTypes, setMatchCommandeTypes] = useState<CommandeType[]>([]);
  const [annexeCommandeTypes, setAnnexeCommandeTypes] = useState<CommandeType[]>([]);
  const [matchModelSelections, setMatchModelSelections] = useState<Record<string, MatchModelSelection>>({});

  const [availableFoodItems, setAvailableFoodItems] = useState<NourritureBoissonListItem[]>([]);

  const [itemToDelete, setItemToDelete] = useState<NouvelleCommandeEnPreparation | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isConfirmGenerateRecapEmailDialogOpen, setIsConfirmGenerateRecapEmailDialogOpen] = useState(false);
  const { toast } = useToast();

  const [currentWeekViewStart, setCurrentWeekViewStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const loadInitialData = useCallback(() => {
    setNouvellesCommandes(getStoredNouvellesCommandes());
    const storedTypes = getStoredCommandeTypes();
    setAllCommandeTypes(storedTypes);
    setMatchCommandeTypes(storedTypes.filter(ct => ct.modelType === 'match'));
    setAnnexeCommandeTypes(storedTypes.filter(ct => ct.modelType === 'annexe'));

    const initialSelections: Record<string, MatchModelSelection> = {};
    storedTypes.filter(ct => ct.modelType === 'match').forEach(ct => initialSelections[ct.id] = 'domicile');
    setMatchModelSelections(initialSelections);

    setAvailableFoodItems(getStoredNourritureBoissonListItems());
  }, []);

  useEffect(() => {
    loadInitialData();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === NOUVELLES_COMMANDES_EN_PREPARATION_STORAGE_KEY) {
        setNouvellesCommandes(getStoredNouvellesCommandes());
      }
      if (event.key === 'TRAPEL_FC_COMMANDE_TYPES_NOURRITURE_DATA') {
        const storedTypes = getStoredCommandeTypes();
        setAllCommandeTypes(storedTypes);
        setMatchCommandeTypes(storedTypes.filter(ct => ct.modelType === 'match'));
        setAnnexeCommandeTypes(storedTypes.filter(ct => ct.modelType === 'annexe'));
      }
      if (event.key === NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY) {
        setAvailableFoodItems(getStoredNourritureBoissonListItems());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadInitialData]);

  const handlePreviousWeek = () => {
    setCurrentWeekViewStart(prev => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekViewStart(prev => addWeeks(prev, 1));
  };

  const currentWeekViewEnd = endOfWeek(currentWeekViewStart, { weekStartsOn: 1 });
  const currentWeekLabel = `Semaine du ${format(currentWeekViewStart, 'dd/MM', { locale: fr })} au ${format(currentWeekViewEnd, 'dd/MM/yyyy', { locale: fr })}`;
  const currentWeekLabelForEmail = `la semaine du ${format(currentWeekViewStart, "dd/MM/yyyy", { locale: fr })} au ${format(currentWeekViewEnd, "dd/MM/yyyy", { locale: fr })}`;


  const handleAddPonctuelleCommandeClick = () => {
    setCommandeToEdit(null);
    setIsAddCommandeModalOpen(true);
  };

  const handleEditCommandeClick = (commande: NouvelleCommandeEnPreparation) => {
    setCommandeToEdit(commande);
    setIsAddCommandeModalOpen(true);
  };

  const handleSavePreparedCommande = (commandeData: Omit<NouvelleCommandeEnPreparation, 'id'>) => {
    let updatedCommandes;
    if (commandeToEdit) {
      updatedCommandes = nouvellesCommandes.map(cmd =>
        cmd.id === commandeToEdit.id ? { ...commandeData, id: cmd.id } : cmd
      );
      toast({ title: "Succès", description: `Commande "${commandeData.nom}" modifiée.` });
    } else {
      const newCommande: NouvelleCommandeEnPreparation = {
        ...commandeData,
        id: crypto.randomUUID(),
      };
      updatedCommandes = [...nouvellesCommandes, newCommande];
      toast({ title: "Succès", description: `Commande "${newCommande.nom}" ajoutée à la liste.` });
    }
    setNouvellesCommandes(updatedCommandes.sort((a,b) => a.nom.localeCompare(b.nom)));
    saveStoredNouvellesCommandes(updatedCommandes);
    setIsAddCommandeModalOpen(false);
    setCommandeToEdit(null);
  };

  const requestDeleteCommande = (commande: NouvelleCommandeEnPreparation) => {
    setItemToDelete(commande);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteCommande = () => {
    if (itemToDelete) {
      const updatedCommandes = nouvellesCommandes.filter(cmd => cmd.id !== itemToDelete.id);
      setNouvellesCommandes(updatedCommandes);
      saveStoredNouvellesCommandes(updatedCommandes);
      toast({ title: "Succès", description: `Commande "${itemToDelete.nom}" supprimée de la liste.` });
    }
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleDuplicateCommande = (commandeId: string) => {
    const commandeToDuplicate = nouvellesCommandes.find(cmd => cmd.id === commandeId);
    if (!commandeToDuplicate) {
      toast({ title: "Erreur", description: "Commande à dupliquer non trouvée.", variant: "destructive" });
      return;
    }
    const duplicatedCommande: NouvelleCommandeEnPreparation = {
      ...JSON.parse(JSON.stringify(commandeToDuplicate)),
      id: crypto.randomUUID(),
      nom: `${commandeToDuplicate.nom} (Copie)`,
    };
    const updatedCommandes = [...nouvellesCommandes, duplicatedCommande].sort((a,b) => a.nom.localeCompare(b.nom));
    setNouvellesCommandes(updatedCommandes);
    saveStoredNouvellesCommandes(updatedCommandes);
    toast({ title: "Succès", description: `Commande "${commandeToDuplicate.nom}" dupliquée.` });
  };

  const handleAddMatchModelToPreparation = (modelId: string) => {
    const model = matchCommandeTypes.find(m => m.id === modelId);
    if (!model) return;

    const selection = matchModelSelections[modelId] || 'domicile';
    let articlesSource: CommandeTypeArticle[] = [];
    let suffix = "";

    if (selection === 'domicile' && model.articlesDomicile) {
      articlesSource = model.articlesDomicile;
      suffix = " (Domicile)";
    } else if (selection === 'exterieur' && model.articlesExterieur) {
      articlesSource = model.articlesExterieur;
      suffix = " (Extérieur)";
    }

    const articlesAvecPrix: CommandeArticleDetail[] = articlesSource.map(art => {
        const itemDef = availableFoodItems.find(nbli => nbli.nom === art.nomArticle);
        return {
            nomArticle: art.nomArticle,
            quantite: art.quantite,
            prixUnitaire: itemDef?.prix,
            prixTotalArticle: (itemDef?.prix ?? 0) * art.quantite,
        };
    });

    const montantTotal = articlesAvecPrix.reduce((total, art) => total + (art.prixTotalArticle || 0), 0);

    const newCommande: NouvelleCommandeEnPreparation = {
      id: crypto.randomUUID(),
      nom: model.nom + suffix,
      type: 'modele',
      articles: articlesAvecPrix,
      montantTotalCommande: montantTotal,
      modelType: 'match',
    };

    const updatedNouvellesCommandes = [...nouvellesCommandes, newCommande].sort((a,b) => a.nom.localeCompare(b.nom));
    setNouvellesCommandes(updatedNouvellesCommandes);
    saveStoredNouvellesCommandes(updatedNouvellesCommandes);
    toast({ title: "Succès", description: `Commande "${newCommande.nom}" ajoutée.` });
  };

  const handleAddAnnexeModelToPreparation = (modelId: string) => {
    const model = annexeCommandeTypes.find(m => m.id === modelId);
    if (!model || !model.articles) return;

    const articlesAvecPrix: CommandeArticleDetail[] = model.articles.map(art => {
      const itemDef = availableFoodItems.find(nbli => nbli.nom === art.nomArticle);
      return {
        nomArticle: art.nomArticle,
        quantite: art.quantite,
        prixUnitaire: itemDef?.prix,
        prixTotalArticle: (itemDef?.prix ?? 0) * art.quantite,
      };
    });

    const montantTotal = articlesAvecPrix.reduce((total, art) => total + (art.prixTotalArticle || 0), 0);

    const newCommande: NouvelleCommandeEnPreparation = {
      id: crypto.randomUUID(),
      nom: model.nom,
      type: 'modele',
      articles: articlesAvecPrix,
      montantTotalCommande: montantTotal,
      modelType: 'annexe',
    };

    const updatedNouvellesCommandes = [...nouvellesCommandes, newCommande].sort((a,b) => a.nom.localeCompare(b.nom));
    setNouvellesCommandes(updatedNouvellesCommandes);
    saveStoredNouvellesCommandes(updatedNouvellesCommandes);
    toast({ title: "Succès", description: `Commande "${newCommande.nom}" ajoutée.` });
  };


  const handleMatchModelSelectionChange = (modelId: string, value: MatchModelSelection) => {
    setMatchModelSelections(prev => ({ ...prev, [modelId]: value }));
  };

  const requestGenerateRecapEmail = () => {
    if (nouvellesCommandes.length === 0) {
      toast({ title: "Aucune commande", description: "Veuillez ajouter des commandes à préparer.", variant: "default" });
      return;
    }
    setIsConfirmGenerateRecapEmailDialogOpen(true);
  };

  const confirmGenerateRecapEmail = () => {
    const dateOperation = new Date();
    const pendingEmails = getPendingEmailsFromStorage();

    const periodePlanningLabel = currentWeekLabelForEmail;

    const listeCommandesDetailTexte = nouvellesCommandes.map(cmd => {
        const articlesText = cmd.articles.map(art =>
          `  - ${art.nomArticle} x${art.quantite}`
        ).join('\n');
        return `${cmd.nom}\n${articlesText}`;
      }).join('\n\n');

    let recapSubjectTemplate = "Récapitulatif de la Session de Commande pour {{PERIODE_PLANNING}}";
    let recapBodyTemplate = "Bonjour,\n\nVoici le récapitulatif détaillé de la session de commande pour {{PERIODE_PLANNING}}:\n\n{{LISTE_COMMANDES_DETAIL_SESSION}}\n\nCordialement,\nLe Trapel FC.";

    if (typeof window !== 'undefined') {
        recapSubjectTemplate = localStorage.getItem(EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_SUBJECT_KEY) || recapSubjectTemplate;
        recapBodyTemplate = localStorage.getItem(EMAIL_TEMPLATE_RECAP_SESSION_COMMANDE_BODY_KEY) || recapBodyTemplate;
    }

    let recapSubject = recapSubjectTemplate.replace('{{PERIODE_PLANNING}}', periodePlanningLabel);
    let recapBody = recapBodyTemplate.replace('{{PERIODE_PLANNING}}', periodePlanningLabel);
    recapBody = recapBody.replace('{{LISTE_COMMANDES_DETAIL_SESSION}}', listeCommandesDetailTexte);

    const recapPendingEmail: PendingEmail = {
      id: crypto.randomUUID(),
      licencieId: `recap_session_commande_${dateOperation.getTime()}`,
      licencieNom: 'Récapitulatif Détaillé',
      licenciePrenom: 'Session Commande',
      licencieEmail: '',
      packChoisi: '',
      montantTotalDu: 0,
      montantPaye: 0,
      methodePaiement: undefined,
      datePreparation: dateOperation.toISOString(),
      status: 'en_attente',
      sujet: recapSubject,
      corps: recapBody,
      source: `Récap Commande - ${periodePlanningLabel}`,
    };
    pendingEmails.push(recapPendingEmail);
    savePendingEmailsToStorage(pendingEmails);

    const totalSessionAmount = nouvellesCommandes.reduce((sum, cmd) => sum + cmd.montantTotalCommande, 0);
    const archivedSession: ArchivedCommandSession = {
      id: crypto.randomUUID(),
      weekLabel: currentWeekLabelForEmail,
      weekStartDate: format(currentWeekViewStart, 'yyyy-MM-dd'),
      totalSessionAmount: totalSessionAmount,
      commands: nouvellesCommandes.map(cmd => ({
        nom: cmd.nom,
        articles: cmd.articles,
        montantTotalCommande: cmd.montantTotalCommande,
      })),
      archivedAt: dateOperation.toISOString(),
      // supplierAggregatedOrders et supplierOrdersGeneratedAt seront ajoutés plus tard
    };
    const currentArchives = getArchivedCommandSessions();
    saveArchivedCommandSessions([...currentArchives, archivedSession]);

    // Save current session for supplier recap and redirect
    if (typeof window !== 'undefined') {
        localStorage.setItem(CURRENT_SESSION_FOR_SUPPLIER_RECAP_STORAGE_KEY, JSON.stringify(nouvellesCommandes));
        localStorage.setItem(LAST_ARCHIVED_SESSION_ID_FOR_SUPPLIER_RECAP_STORAGE_KEY, archivedSession.id); // Store ID for update
    }

    toast({ title: "Mail Récap. Préparé et Session Archivée", description: `L'e-mail récap. pour ${periodePlanningLabel} est prêt. Redirection vers le récapitulatif fournisseurs...` });

    setNouvellesCommandes([]);
    saveStoredNouvellesCommandes([]);

    setIsConfirmGenerateRecapEmailDialogOpen(false);
    router.push('/commande/nourriture-boissons/recapitulatif-fournisseurs');
  };


  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
            <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/commande/nourriture-boissons">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Retour aux Commandes de Nourriture & Boissons</span>
            </Link>
            </Button>
            <h1 className="text-2xl font-bold">Nouvelle Commande - Préparation</h1>
        </div>
        <div className="flex items-center space-x-2">
            <Button onClick={requestGenerateRecapEmail} variant="default" disabled={nouvellesCommandes.length === 0}>
                <Mail className="mr-2 h-4 w-4" />
                Générer Mail Récapitulatif
            </Button>
            <Button onClick={handleAddPonctuelleCommandeClick} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter Commande (Ponctuelle)
            </Button>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between p-3 bg-muted rounded-md">
        <Button variant="outline" onClick={handlePreviousWeek} size="icon">
          <ChevronLeft className="h-5 w-5" /> <span className="sr-only">Semaine précédente</span>
        </Button>
        <div className="text-center">
            <h2 className="text-xl font-semibold">
            {currentWeekLabel}
            </h2>
        </div>
        <Button variant="outline" onClick={handleNextWeek} size="icon">
          <ChevronRight className="h-5 w-5" /> <span className="sr-only">Semaine suivante</span>
        </Button>
      </div>

      {matchCommandeTypes.length > 0 && (
        <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Ajouter rapidement depuis un Modèle "Match"</h2>
            <div className="flex flex-wrap gap-4">
            {matchCommandeTypes.map(model => (
                <div key={model.id} className="flex items-center space-x-3 p-3 border rounded-md shadow-sm bg-card flex-grow sm:flex-grow-0">
                    <span className="font-medium text-sm whitespace-nowrap">{model.nom.replace(/ - (Domicile|Extérieur)$/, '')}</span>
                    <RadioGroup
                        value={matchModelSelections[model.id] || 'domicile'}
                        onValueChange={(value) => handleMatchModelSelectionChange(model.id, value as MatchModelSelection)}
                        className="flex items-center space-x-2"
                    >
                        <FormItem className="flex items-center space-x-1">
                            <RadioGroupItem value="domicile" id={`${model.id}-domicile`} className="h-3.5 w-3.5"/>
                            <Label htmlFor={`${model.id}-domicile`} className="text-xs font-normal">Dom.</Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-1">
                            <RadioGroupItem value="exterieur" id={`${model.id}-exterieur`} className="h-3.5 w-3.5"/>
                            <Label htmlFor={`${model.id}-exterieur`} className="text-xs font-normal">Ext.</Label>
                        </FormItem>
                    </RadioGroup>
                    <Button
                        onClick={() => handleAddMatchModelToPreparation(model.id)}
                        size="sm"
                        variant="outline"
                        className="px-2 py-1 h-auto text-xs"
                    >
                        <PlusCircle className="mr-1.5 h-3 w-3" />
                        Ajouter
                    </Button>
                </div>
            ))}
            </div>
        </div>
      )}

      {annexeCommandeTypes.length > 0 && (
        <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Ajouter rapidement depuis un Modèle "Annexe"</h2>
            <div className="flex flex-wrap gap-4">
            {annexeCommandeTypes.map(model => (
                <div key={model.id} className="flex items-center space-x-3 p-3 border rounded-md shadow-sm bg-card flex-grow sm:flex-grow-0">
                    <span className="font-medium text-sm whitespace-nowrap">{model.nom}</span>
                    <Button
                        onClick={() => handleAddAnnexeModelToPreparation(model.id)}
                        size="sm"
                        variant="outline"
                        className="px-2 py-1 h-auto text-xs"
                    >
                        <PlusCircle className="mr-1.5 h-3 w-3" />
                        Ajouter
                    </Button>
                </div>
            ))}
            </div>
        </div>
      )}

      {nouvellesCommandes.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Nom/Description</TableHead>
                <TableHead className="py-2 px-4 text-center">Nb Articles</TableHead>
                <TableHead className="py-2 px-4 text-right">Montant Total</TableHead>
                <TableHead className="text-right py-2 px-4 w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nouvellesCommandes.map((cmd) => (
                <TableRow key={cmd.id}>
                  <TableCell className="py-2 px-4 font-medium">{cmd.nom}</TableCell>
                  <TableCell className="py-2 px-4 text-center">{cmd.articles.length}</TableCell>
                  <TableCell className="py-2 px-4 text-right">{formatPrice(cmd.montantTotalCommande)}</TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicateCommande(cmd.id)}
                      aria-label={`Dupliquer ${cmd.nom}`}
                      className="mr-2"
                      title="Dupliquer"
                    >
                      <Copy className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditCommandeClick(cmd)}
                      aria-label={`Modifier ${cmd.nom}`}
                      className="mr-2"
                      title="Modifier"
                    >
                      <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteCommande(cmd)}
                      aria-label={`Supprimer ${cmd.nom}`}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8 border rounded-md">
          <p>Aucune commande en cours de préparation pour {currentWeekLabel}.</p>
          <p className="mt-1 text-sm">Utilisez les modèles ci-dessus ou le bouton "Ajouter une Commande (Ponctuelle)" pour commencer.</p>
        </div>
      )}

      {itemToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer la commande "{itemToDelete.nom}" de la liste de préparation ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteCommande} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <AlertDialog open={isConfirmGenerateRecapEmailDialogOpen} onOpenChange={setIsConfirmGenerateRecapEmailDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la Génération du Mail Récapitulatif</AlertDialogTitle>
            <AlertDialogDescription>
                Voulez-vous générer un e-mail récapitulatif détaillé pour les {nouvellesCommandes.length} commande(s) de {currentWeekLabelForEmail}, archiver cette session, vider la liste de préparation et passer au récapitulatif fournisseurs ?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmGenerateRecapEmailDialogOpen(false)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerateRecapEmail} className="bg-primary hover:bg-primary/90">
                Oui, Continuer
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isAddCommandeModalOpen && (
        <AddCommandeModal
          isOpen={isAddCommandeModalOpen}
          onClose={() => {
            setIsAddCommandeModalOpen(false);
            setCommandeToEdit(null);
          }}
          onSavePreparedCommande={handleSavePreparedCommande}
          initialData={commandeToEdit}
          articlesNourritureDisponibles={availableFoodItems}
        />
      )}
    </div>
  );
}

