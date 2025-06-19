
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import type { NouvelleCommandeEnPreparation, CommandeArticleDetail, ArchivedCommandSession, AggregatedSupplierOrderForArchive } from '../nouvelle-commande/page';
import { 
    CURRENT_SESSION_FOR_SUPPLIER_RECAP_STORAGE_KEY, 
    LAST_ARCHIVED_SESSION_ID_FOR_SUPPLIER_RECAP_STORAGE_KEY,
    getArchivedCommandSessions,
    saveArchivedCommandSessions,
    ARCHIVED_FOOD_COMMAND_SESSIONS_STORAGE_KEY, 
} from '../nouvelle-commande/page';
import type { NourritureBoissonListItem } from '@/app/administration/gestion-listes/listes-nourriture-boissons/page';
import { getStoredNourritureBoissonListItems, NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY } from '@/app/administration/gestion-listes/listes-nourriture-boissons/page';
import type { FoodSupplierDetail } from '@/config/stock-constants';
import { GLOBAL_STOCK_STORAGE_KEY } from '@/config/stock-constants';
import { getStoredSuppliers as getFoodSuppliers, FOOD_SUPPLIERS_STORAGE_KEY } from '@/app/administration/gestion-listes/fournisseurs-nourriture/page';
import type { EquipementItem as StockItem } from '@/app/stock/equipement/page';
import { getStockEquipementFromStorage } from '@/app/stock/equipement/page';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getPendingEmailsFromStorage, savePendingEmailsToStorage, type PendingEmail } from '@/app/inscription/paiement/page';


const EMAIL_TEMPLATE_SUPPLIER_ORDER_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_SUPPLIER_ORDER_SUBJECT';
const EMAIL_TEMPLATE_SUPPLIER_ORDER_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_SUPPLIER_ORDER_BODY';


interface AggregatedSupplierOrder {
  supplierName: string;
  supplierDetails?: FoodSupplierDetail;
  articles: { nomArticle: string; quantiteTotale: number; prixUnitaire?: number }[];
  montantTotalFournisseur: number;
}

const LIEU_STOCK_DEDUCTION = "Villemoustoussou";

export default function RecapitulatifFournisseursPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionCommandes, setSessionCommandes] = useState<NouvelleCommandeEnPreparation[]>([]);
  const [aggregatedOrders, setAggregatedOrders] = useState<AggregatedSupplierOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmSendEmailsOpen, setIsConfirmSendEmailsOpen] = useState(false);

  const loadData = () => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem(CURRENT_SESSION_FOR_SUPPLIER_RECAP_STORAGE_KEY);
      if (storedSession) {
        setSessionCommandes(JSON.parse(storedSession));
      } else {
        setSessionCommandes([]);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData(); 

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === CURRENT_SESSION_FOR_SUPPLIER_RECAP_STORAGE_KEY) {
        const storedSession = localStorage.getItem(CURRENT_SESSION_FOR_SUPPLIER_RECAP_STORAGE_KEY);
        setSessionCommandes(storedSession ? JSON.parse(storedSession) : []);
      }
      if (event.key === NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY || 
          event.key === FOOD_SUPPLIERS_STORAGE_KEY ||
          event.key === GLOBAL_STOCK_STORAGE_KEY ||
          event.key === ARCHIVED_FOOD_COMMAND_SESSIONS_STORAGE_KEY) {
        // This will trigger the re-calculation in the next useEffect
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);


  useEffect(() => {
    const allFoodItems = getStoredNourritureBoissonListItems();
    const allSuppliers = getFoodSuppliers();
    const globalStock = getStockEquipementFromStorage();

    if (sessionCommandes.length > 0) {
      const supplierMap: Record<string, { 
          articlesMap: Record<string, { quantiteTotale: number; prixUnitaire?: number }>, 
          supplierDetails?: FoodSupplierDetail 
      }> = {};
      
      const aggregatedQuantitiesBySupplier: Record<string, {
        articles: Record<string, { foodItemId: string, totalQuantityNeeded: number, prixUnitaire?: number }>;
        supplierDetails?: FoodSupplierDetail;
      }> = {};
      
      sessionCommandes.forEach(commande => {
        commande.articles.forEach(articleCmd => {
          const foodItemRef = allFoodItems.find(fi => fi.nom.trim().toLowerCase() === articleCmd.nomArticle.trim().toLowerCase());
          if (!foodItemRef) {
            return;
          }
          const supplierName = foodItemRef.fournisseur || 'Non spécifié';

          if (!aggregatedQuantitiesBySupplier[supplierName]) {
            aggregatedQuantitiesBySupplier[supplierName] = {
              articles: {},
              supplierDetails: allSuppliers.find(s => s.name === supplierName),
            };
          }
          if (!aggregatedQuantitiesBySupplier[supplierName].articles[foodItemRef.id]) {
            aggregatedQuantitiesBySupplier[supplierName].articles[foodItemRef.id] = {
              foodItemId: foodItemRef.id,
              totalQuantityNeeded: 0,
              prixUnitaire: foodItemRef.prix,
            };
          }
          aggregatedQuantitiesBySupplier[supplierName].articles[foodItemRef.id].totalQuantityNeeded += articleCmd.quantite;
        });
      });

      for (const supplierName in aggregatedQuantitiesBySupplier) {
        for (const articleId in aggregatedQuantitiesBySupplier[supplierName].articles) {
          const aggData = aggregatedQuantitiesBySupplier[supplierName].articles[articleId];
          const foodItemRef = allFoodItems.find(fi => fi.id === articleId);

          if (!foodItemRef) {
            continue;
          }
          const cleanArticleName = foodItemRef.nom;
          const stockItem = globalStock.find(si => si.id === articleId);
          
          let quantiteVillemoustoussou = 0;
          if (stockItem && stockItem.itemCategory === 'food' && stockItem.sizeBreakdown) {
            quantiteVillemoustoussou = stockItem.sizeBreakdown[LIEU_STOCK_DEDUCTION] || 0;
          }
          
          let quantiteACommander = aggData.totalQuantityNeeded;

          if (quantiteVillemoustoussou >= aggData.totalQuantityNeeded) {
              quantiteACommander = 0;
          } else {
              quantiteACommander = aggData.totalQuantityNeeded - quantiteVillemoustoussou;
          }
          
          if (quantiteACommander > 0) {
            if (!supplierMap[supplierName]) {
              supplierMap[supplierName] = {
                articlesMap: {},
                supplierDetails: allSuppliers.find(s => s.name === supplierName),
              };
            }
            supplierMap[supplierName].articlesMap[cleanArticleName] = {
              quantiteTotale: quantiteACommander,
              prixUnitaire: foodItemRef.prix,
            };
          }
        }
      }
      

      const newAggregatedOrders = Object.entries(supplierMap)
        .map(([supplierName, data]) => {
            const articlesArray = Object.entries(data.articlesMap)
            .filter(([nomArt, details]) => details.quantiteTotale > 0) 
            .map(([nomArticle, details]) => ({
                nomArticle, 
                quantiteTotale: details.quantiteTotale,
                prixUnitaire: details.prixUnitaire,
            })).sort((a, b) => a.nomArticle.localeCompare(b.nomArticle));
            
            if (articlesArray.length === 0) {
                return null; 
            }

            const montantTotalFournisseur = articlesArray.reduce((total, article) => {
                return total + (article.prixUnitaire || 0) * article.quantiteTotale;
            }, 0);

            return {
              supplierName,
              supplierDetails: data.supplierDetails,
              articles: articlesArray,
              montantTotalFournisseur,
            };
      }).filter(Boolean) as AggregatedSupplierOrder[]; 

      setAggregatedOrders(newAggregatedOrders.sort((a, b) => a.supplierName.localeCompare(b.supplierName)));
    } else {
      setAggregatedOrders([]);
    }
  }, [sessionCommandes]);


  const handlePrepareSupplierEmails = () => {
    if (aggregatedOrders.length === 0) {
      toast({ title: "Aucune commande", description: "Aucune commande à préparer pour les fournisseurs après déduction du stock.", variant: "default" });
      return;
    }
    setIsConfirmSendEmailsOpen(true);
  };

  const confirmPrepareSupplierEmails = () => {
    const dateOperation = new Date();
    const pendingEmails = getPendingEmailsFromStorage();
    let emailsGeneratedCount = 0;

    const supplierOrdersForArchive: AggregatedSupplierOrderForArchive[] = aggregatedOrders.map(aggOrder => ({
      supplierName: aggOrder.supplierName,
      supplierEmail: aggOrder.supplierDetails?.email,
      articles: aggOrder.articles.map(art => ({
        nomArticle: art.nomArticle,
        quantiteCommandee: art.quantiteTotale,
        prixUnitaire: art.prixUnitaire,
      })),
      montantTotalFournisseur: aggOrder.montantTotalFournisseur,
    }));

    aggregatedOrders.forEach(aggOrder => {
      if (aggOrder.supplierName === 'Non spécifié' || !aggOrder.supplierDetails) {
        toast({
          title: "Fournisseur manquant",
          description: `Impossible de générer un e-mail pour les articles sans fournisseur spécifié ou pour le fournisseur "Non spécifié". Veuillez vérifier les définitions d'articles.`,
          variant: "destructive",
          duration: 7000,
        });
        return; 
      }

      const listeArticlesTexte = aggOrder.articles.map(art => 
        `  - ${art.nomArticle} x ${art.quantiteTotale}${art.prixUnitaire !== undefined ? ` (PU: ${art.prixUnitaire.toFixed(2)}€)` : ''}`
      ).join('\n');

      let subjectTemplate = localStorage.getItem(EMAIL_TEMPLATE_SUPPLIER_ORDER_SUBJECT_KEY) || "Commande du Trapel FC - {{NOM_FOURNISSEUR}} - {{DATE_COMMANDE}}";
      let bodyTemplate = localStorage.getItem(EMAIL_TEMPLATE_SUPPLIER_ORDER_BODY_KEY) || "Bonjour {{NOM_FOURNISSEUR}},\n\nVeuillez trouver ci-dessous notre commande pour le Trapel FC, datée du {{DATE_COMMANDE}}.\n\nArticles commandés :\n{{LISTE_ARTICLES_COMMANDE}}\n\nTotal estimé : {{MONTANT_TOTAL_FOURNISSEUR}}€\n\nMerci de nous confirmer la réception et la disponibilité.\n\nCordialement,\nLe Trapel FC.";

      const replacements = {
        '{{NOM_FOURNISSEUR}}': aggOrder.supplierName,
        '{{DATE_COMMANDE}}': format(dateOperation, 'dd/MM/yyyy', { locale: fr }),
        '{{LISTE_ARTICLES_COMMANDE}}': listeArticlesTexte,
        '{{MONTANT_TOTAL_FOURNISSEUR}}': aggOrder.montantTotalFournisseur.toFixed(2),
      };

      for (const [placeholder, value] of Object.entries(replacements)) {
        subjectTemplate = subjectTemplate.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value || '');
        bodyTemplate = bodyTemplate.replace(new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), value || '');
      }

      const supplierEmail: PendingEmail = {
        id: crypto.randomUUID(),
        licencieId: `commande_fournisseur_${aggOrder.supplierDetails.id}_${dateOperation.getTime()}`,
        licencieNom: aggOrder.supplierName,
        licenciePrenom: 'Commande Fournisseur',
        licencieEmail: aggOrder.supplierDetails.email || '', 
        packChoisi: '',
        montantTotalDu: aggOrder.montantTotalFournisseur,
        montantPaye: 0,
        methodePaiement: undefined,
        datePreparation: dateOperation.toISOString(),
        status: 'en_attente',
        sujet: subjectTemplate,
        corps: bodyTemplate,
        source: `Commande Fournisseur - ${aggOrder.supplierName}`,
      };
      pendingEmails.push(supplierEmail);
      emailsGeneratedCount++;
    });

    if (emailsGeneratedCount > 0) {
      savePendingEmailsToStorage(pendingEmails);
      toast({ title: `${emailsGeneratedCount} E-mail(s) Fournisseur Préparé(s)`, description: `Les e-mails de commande ont été ajoutés à la file d'attente.` });
    }
    
    if (typeof window !== 'undefined') {
        const lastArchivedSessionId = localStorage.getItem(LAST_ARCHIVED_SESSION_ID_FOR_SUPPLIER_RECAP_STORAGE_KEY);
        if (lastArchivedSessionId) {
            const allArchivedSessions = getArchivedCommandSessions();
            const sessionIndex = allArchivedSessions.findIndex(s => s.id === lastArchivedSessionId);
            if (sessionIndex > -1) {
                allArchivedSessions[sessionIndex].supplierAggregatedOrders = supplierOrdersForArchive;
                allArchivedSessions[sessionIndex].supplierOrdersGeneratedAt = new Date().toISOString();
                saveArchivedCommandSessions(allArchivedSessions);
            }
            localStorage.removeItem(LAST_ARCHIVED_SESSION_ID_FOR_SUPPLIER_RECAP_STORAGE_KEY);
        }
        localStorage.removeItem(CURRENT_SESSION_FOR_SUPPLIER_RECAP_STORAGE_KEY);
    }

    setSessionCommandes([]); 
    setAggregatedOrders([]); 

    setIsConfirmSendEmailsOpen(false);
    router.push('/commande/nourriture-boissons'); 
  };


  if (isLoading && sessionCommandes.length === 0) { 
    return <div className="container mx-auto p-4 text-center">Chargement du récapitulatif...</div>;
  }

  if (sessionCommandes.length === 0 && !isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <div className="mb-6 flex items-center">
            <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/commande/nourriture-boissons/nouvelle-commande">
                <ArrowLeft className="h-4 w-4" />
            </Link>
            </Button>
            <h1 className="text-2xl font-bold">Récapitulatif Fournisseurs</h1>
        </div>
        <p className="text-muted-foreground py-8">Aucune session de commande en cours de traitement pour le récapitulatif par fournisseur.</p>
        <Button asChild variant="link">
          <Link href="/commande/nourriture-boissons/nouvelle-commande">Préparer une nouvelle session de commande</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/commande/nourriture-boissons/nouvelle-commande">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Récapitulatif Fournisseurs</h1>
        </div>
        <Button onClick={handlePrepareSupplierEmails} disabled={aggregatedOrders.length === 0}>
          <Mail className="mr-2 h-4 w-4" />
          Préparer les E-mails Fournisseurs
        </Button>
      </div>
      
      <div className="mb-4 p-3 border rounded-md bg-amber-50 text-amber-800 text-sm">
        <p><strong>Note :</strong> Les quantités affichées ci-dessous sont ajustées en fonction du stock disponible à "{LIEU_STOCK_DEDUCTION}". Si un article n'apparaît pas, c'est qu'il est entièrement couvert par le stock de ce lieu ou que la quantité à commander après déduction est nulle.</p>
      </div>

      {aggregatedOrders.length > 0 ? (
        <ScrollArea className="h-[calc(100vh-240px)]">
          <div className="space-y-6">
            {aggregatedOrders.map(aggOrder => (
              <div key={aggOrder.supplierName} className="border rounded-lg shadow-sm">
                <div className="bg-muted p-3 rounded-t-lg">
                  <h2 className="text-lg font-semibold">
                    Fournisseur : {aggOrder.supplierName} 
                    {aggOrder.supplierDetails?.email && ` (${aggOrder.supplierDetails.email})`}
                  </h2>
                  <p className="text-sm text-muted-foreground">Montant total estimé : {aggOrder.montantTotalFournisseur.toFixed(2)}€</p>
                </div>
                <div className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2 px-4">Article</TableHead>
                        <TableHead className="py-2 px-4 text-right">Qté à Commander</TableHead>
                        <TableHead className="py-2 px-4 text-right">Prix Unitaire Est.</TableHead>
                        <TableHead className="py-2 px-4 text-right">Sous-Total Est.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aggOrder.articles.map(article => (
                        <TableRow key={article.nomArticle}>
                          <TableCell className="py-2 px-4 font-medium">{article.nomArticle}</TableCell>
                          <TableCell className="py-2 px-4 text-right">{article.quantiteTotale}</TableCell>
                          <TableCell className="py-2 px-4 text-right">
                            {article.prixUnitaire !== undefined ? `${article.prixUnitaire.toFixed(2)}€` : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-4 text-right">
                            {article.prixUnitaire !== undefined ? `${(article.prixUnitaire * article.quantiteTotale).toFixed(2)}€` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="text-center text-muted-foreground py-8 border rounded-md">
          <p>Aucun article à commander après déduction du stock de "{LIEU_STOCK_DEDUCTION}", ou tous les articles sont sans fournisseur spécifié.</p>
          <p className="text-xs mt-1">Vérifiez que les articles ont bien un fournisseur assigné dans "Administration &gt; Gestion des Listes &gt; Articles Spécifiques (Nourriture & Boissons)".</p>
        </div>
      )}
       <AlertDialog open={isConfirmSendEmailsOpen} onOpenChange={setIsConfirmSendEmailsOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la Préparation des E-mails Fournisseurs</AlertDialogTitle>
            <AlertDialogDescription>
                Voulez-vous générer les e-mails de commande pour chaque fournisseur listé, archiver ces commandes fournisseurs et effacer la session actuelle de cette page ?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmSendEmailsOpen(false)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPrepareSupplierEmails} className="bg-primary hover:bg-primary/90">
                Oui, Préparer et Archiver
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
    
