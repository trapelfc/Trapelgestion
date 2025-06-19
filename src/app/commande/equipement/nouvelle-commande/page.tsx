
'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, PlusCircle, Trash2, DownloadCloud, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { EquipementItem as ArticleDefinition } from '@/app/administration/gestion-listes/articles-stock/page';
import { getStoredArticleDefinitions } from '@/app/administration/gestion-listes/articles-stock/page';
import { APPAREL_SIZES, SOCK_SIZES, APPAREL_SIZES_STORAGE_KEY, SOCK_SIZES_STORAGE_KEY, type EquipmentOrderItemInProgress, EQUIPMENT_ORDERS_IN_PROGRESS_KEY } from '@/config/stock-constants';
import { getEquipmentNeedsFromStorage, type AggregatedEquipmentNeed } from '@/app/inscription/equipement/page';
import { getPendingEmailsFromStorage, savePendingEmailsToStorage, type PendingEmail } from '@/app/inscription/paiement/page';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const EMAIL_TEMPLATE_EQUIPMENT_ORDER_SUBJECT_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_ORDER_SUBJECT';
const EMAIL_TEMPLATE_EQUIPMENT_ORDER_BODY_KEY = 'TRAPEL_FC_EMAIL_TEMPLATE_EQUIPMENT_ORDER_BODY';
const DEFAULT_EQUIPMENT_ORDER_SUBJECT = "Nouvelle Commande d'Équipement - Trapel FC - {{DATE_COMMANDE}}";
const DEFAULT_EQUIPMENT_ORDER_BODY = `
Bonjour,

Veuillez trouver ci-dessous notre commande d'équipement pour le Trapel FC, datée du {{DATE_COMMANDE}}.

Articles commandés :
{{LISTE_ARTICLES_COMMANDE_EQUIPEMENT}}

Merci de nous tenir informés de la disponibilité et des délais.

Cordialement,
Le Trapel FC.
`.trim();


interface CommandeEquipementItem {
  id: string; // id de la définition de l'article
  articleName: string;
  taille?: string;
  quantite: number;
  hasSizeVariants?: boolean;
  availableSizes?: readonly string[];
}

// Helper pour lire/écrire les commandes en cours
const getEquipmentOrdersInProgressFromStorage = (): EquipmentOrderItemInProgress[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(EQUIPMENT_ORDERS_IN_PROGRESS_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveEquipmentOrdersInProgressToStorage = (orders: EquipmentOrderItemInProgress[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EQUIPMENT_ORDERS_IN_PROGRESS_KEY, JSON.stringify(orders));
  window.dispatchEvent(new StorageEvent('storage', { key: EQUIPMENT_ORDERS_IN_PROGRESS_KEY }));
};

const getDynamicSizesFromStorage = (key: string, fallback: readonly string[]): string[] => {
  if (typeof window === 'undefined') return [...fallback];
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }
    } catch (e) { console.error("Error parsing dynamic sizes:", e); }
  }
  return [...fallback];
};

export default function NouvelleCommandeEquipementPage() {
  const { toast } = useToast();
  const [availableEquipmentDefinitions, setAvailableEquipmentDefinitions] = useState<ArticleDefinition[]>([]);
  const [commandeEnPreparation, setCommandeEnPreparation] = useState<CommandeEquipementItem[]>([]);
  
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [selectedArticleInfo, setSelectedArticleInfo] = useState<ArticleDefinition | null>(null);
  const [selectedTaille, setSelectedTaille] = useState<string>('');
  const [quantiteInput, setQuantiteInput] = useState<number>(1);

  const [dynamicApparelSizes, setDynamicApparelSizes] = useState<string[]>([]);
  const [dynamicSockSizes, setDynamicSockSizes] = useState<string[]>([]);

  const loadDefinitions = useCallback(() => {
    const allDefs = getStoredArticleDefinitions();
    const equipmentDefs = allDefs.filter(def =>
      def.itemCategory === 'apparel' ||
      def.itemCategory === 'socks' ||
      (def.itemCategory === 'standard' && def.standardItemDesignatedSection === 'equipement')
    );
    setAvailableEquipmentDefinitions(equipmentDefs.sort((a, b) => a.name.localeCompare(b.name)));
    setDynamicApparelSizes(getDynamicSizesFromStorage(APPAREL_SIZES_STORAGE_KEY, APPAREL_SIZES));
    setDynamicSockSizes(getDynamicSizesFromStorage(SOCK_SIZES_STORAGE_KEY, SOCK_SIZES));
  }, []);

  useEffect(() => {
    loadDefinitions();
  }, [loadDefinitions]);

  useEffect(() => {
    if (selectedArticleId) {
      const article = availableEquipmentDefinitions.find(def => def.id === selectedArticleId);
      setSelectedArticleInfo(article || null);
      setSelectedTaille(''); 
      setQuantiteInput(1);
    } else {
      setSelectedArticleInfo(null);
    }
  }, [selectedArticleId, availableEquipmentDefinitions]);

  const handleAddToCommande = () => {
    if (!selectedArticleInfo || quantiteInput <= 0) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un article et une quantité valide.", variant: "destructive" });
      return;
    }
    if (selectedArticleInfo.hasSizeVariants && !selectedTaille) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une taille pour cet article.", variant: "destructive" });
      return;
    }

    setCommandeEnPreparation(prevCommande => {
        const existingItemIndex = prevCommande.findIndex(item =>
          item.id === selectedArticleInfo.id &&
          (selectedArticleInfo.hasSizeVariants ? item.taille === selectedTaille : true)
        );

        let updatedCommande;
        if (existingItemIndex > -1) {
          updatedCommande = [...prevCommande];
          updatedCommande[existingItemIndex].quantite += quantiteInput;
        } else {
          const newItem: CommandeEquipementItem = {
            id: selectedArticleInfo.id,
            articleName: selectedArticleInfo.name,
            taille: selectedArticleInfo.hasSizeVariants ? selectedTaille : undefined,
            quantite: quantiteInput,
            hasSizeVariants: selectedArticleInfo.hasSizeVariants,
            availableSizes: selectedArticleInfo.itemCategory === 'apparel' ? dynamicApparelSizes :
                            selectedArticleInfo.itemCategory === 'socks' ? dynamicSockSizes :
                            undefined,
          };
          updatedCommande = [...prevCommande, newItem];
        }
        return updatedCommande.sort((a,b) => a.articleName.localeCompare(b.articleName) || (a.taille || '').localeCompare(b.taille || ''));
    });

    toast({ title: "Article ajouté", description: `${selectedArticleInfo.name} ${selectedTaille ? `(${selectedTaille})` : ''} x${quantiteInput} ajouté(e) à la commande.` });
    setSelectedArticleId('');
    setSelectedTaille('');
    setQuantiteInput(1);
  };

  const handleRemoveFromCommande = (index: number) => {
    setCommandeEnPreparation(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChangeInCommande = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveFromCommande(index);
      return;
    }
    setCommandeEnPreparation(prev =>
      prev.map((item, i) => (i === index ? { ...item, quantite: newQuantity } : item))
    );
  };
  
  const handleValidateCommande = () => {
    if (commandeEnPreparation.length === 0) {
      toast({ title: "Commande Vide", description: "Veuillez ajouter des articles à la commande.", variant: "default" });
      return;
    }

    const dateCommande = new Date();
    const formattedDateCommande = format(dateCommande, 'dd/MM/yyyy', { locale: fr });

    const listeArticlesTexte = commandeEnPreparation.map(item => 
      `- ${item.articleName}${item.taille ? ` (Taille: ${item.taille})` : ''} x ${item.quantite}`
    ).join('\n');

    let subjectTemplate = DEFAULT_EQUIPMENT_ORDER_SUBJECT;
    let bodyTemplate = DEFAULT_EQUIPMENT_ORDER_BODY;

    if (typeof window !== 'undefined') {
      subjectTemplate = localStorage.getItem(EMAIL_TEMPLATE_EQUIPMENT_ORDER_SUBJECT_KEY) || DEFAULT_EQUIPMENT_ORDER_SUBJECT;
      bodyTemplate = localStorage.getItem(EMAIL_TEMPLATE_EQUIPMENT_ORDER_BODY_KEY) || DEFAULT_EQUIPMENT_ORDER_BODY;
    }

    const finalSubject = subjectTemplate.replace('{{DATE_COMMANDE}}', formattedDateCommande);
    let finalBody = bodyTemplate.replace('{{DATE_COMMANDE}}', formattedDateCommande);
    finalBody = finalBody.replace('{{LISTE_ARTICLES_COMMANDE_EQUIPEMENT}}', listeArticlesTexte);
    
    const newPendingEmail: PendingEmail = {
      id: crypto.randomUUID(),
      licencieId: `commande_equipement_${dateCommande.getTime()}`,
      licencieNom: "Commande Équipement Club",
      licenciePrenom: "",
      licencieEmail: "", 
      packChoisi: "",
      montantTotalDu: 0,
      montantPaye: 0,
      methodePaiement: undefined,
      datePreparation: dateCommande.toISOString(),
      status: 'en_attente',
      sujet: finalSubject,
      corps: finalBody,
      source: `Commande Équipement Club - ${formattedDateCommande}`,
    };

    const pendingEmails = getPendingEmailsFromStorage();
    savePendingEmailsToStorage([...pendingEmails, newPendingEmail]);

    const ordersInProgress = getEquipmentOrdersInProgressFromStorage();
    commandeEnPreparation.forEach(itemCmd => {
      const existingOrderIndex = ordersInProgress.findIndex(
        order => order.id === itemCmd.id && order.taille === itemCmd.taille
      );
      if (existingOrderIndex > -1) {
        ordersInProgress[existingOrderIndex].quantite += itemCmd.quantite;
        ordersInProgress[existingOrderIndex].dateCommande = dateCommande.toISOString();
      } else {
        ordersInProgress.push({
          id: itemCmd.id,
          articleName: itemCmd.articleName,
          taille: itemCmd.taille,
          quantite: itemCmd.quantite,
          dateCommande: dateCommande.toISOString(),
        });
      }
    });
    saveEquipmentOrdersInProgressToStorage(ordersInProgress);
    
    toast({ title: "Commande Validée", description: "L'e-mail de commande a été préparé et les articles ajoutés aux commandes en cours. La liste a été vidée." });
    setCommandeEnPreparation([]); // Vider la liste de préparation
  };

  const handleResetCommande = () => {
    setCommandeEnPreparation([]);
    setSelectedArticleId('');
    setSelectedTaille('');
    setQuantiteInput(1);
    toast({ title: "Commande réinitialisée" });
  };

  const getDisplayableSizesForSelectedArticle = () => {
    if (!selectedArticleInfo || !selectedArticleInfo.hasSizeVariants) return [];
    if (selectedArticleInfo.itemCategory === 'apparel') return dynamicApparelSizes;
    if (selectedArticleInfo.itemCategory === 'socks') return dynamicSockSizes;
    return selectedArticleInfo.availableSizes || [];
  };

  const handleAddRupturesToCommande = () => {
    const equipmentNeeds = getEquipmentNeedsFromStorage();
    if (equipmentNeeds.length === 0) {
      toast({ title: "Info", description: "Aucun article en rupture de stock à ajouter.", variant: "default" });
      return;
    }

    let itemsAddedCount = 0;
    let itemsUpdatedCount = 0;

    setCommandeEnPreparation(prevCommande => {
      let newCommande = [...prevCommande];

      equipmentNeeds.forEach(need => {
        const definition = availableEquipmentDefinitions.find(def => def.name === need.articleName);
        if (!definition) {
          console.warn(`Définition non trouvée pour l'article en rupture: ${need.articleName}`);
          return;
        }

        const existingItemIndex = newCommande.findIndex(item =>
          item.id === definition.id &&
          (definition.hasSizeVariants ? item.taille === need.size : true)
        );

        if (existingItemIndex > -1) {
          newCommande[existingItemIndex].quantite += need.totalQuantityNeeded;
          itemsUpdatedCount++;
        } else {
          let itemAvailableSizes: readonly string[] | undefined;
          if (definition.itemCategory === 'apparel') itemAvailableSizes = dynamicApparelSizes;
          else if (definition.itemCategory === 'socks') itemAvailableSizes = dynamicSockSizes;
          else itemAvailableSizes = definition.availableSizes;

          const newItem: CommandeEquipementItem = {
            id: definition.id,
            articleName: definition.name,
            taille: definition.hasSizeVariants ? need.size : undefined,
            quantite: need.totalQuantityNeeded,
            hasSizeVariants: definition.hasSizeVariants,
            availableSizes: itemAvailableSizes,
          };
          newCommande.push(newItem);
          itemsAddedCount++;
        }
      });
      return newCommande.sort((a,b) => a.articleName.localeCompare(b.articleName) || (a.taille || '').localeCompare(b.taille || ''));
    });
    
    toast({ title: "Articles en rupture ajoutés", description: `${itemsAddedCount} article(s) ajouté(s), ${itemsUpdatedCount} article(s) mis à jour dans la commande.` });
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/commande/equipement">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour Gestion Équipement</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Nouvelle Commande d'Équipement</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1 space-y-4 p-4 border rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold border-b pb-2">Sélectionner un article</h2>
          <div className="space-y-1">
            <label htmlFor="articleSelect" className="text-sm font-medium">Article</label>
            <Select value={selectedArticleId} onValueChange={setSelectedArticleId}>
              <SelectTrigger id="articleSelect">
                <SelectValue placeholder="Choisir un article" />
              </SelectTrigger>
              <SelectContent>
                {availableEquipmentDefinitions.map(def => (
                  <SelectItem key={def.id} value={def.id}>{def.name}</SelectItem>
                ))}
                {availableEquipmentDefinitions.length === 0 && <p className="p-2 text-xs text-muted-foreground">Aucun article d'équipement défini.</p>}
              </SelectContent>
            </Select>
          </div>

          {selectedArticleInfo?.hasSizeVariants && (
            <div className="space-y-1">
              <label htmlFor="tailleSelect" className="text-sm font-medium">Taille</label>
              <Select value={selectedTaille} onValueChange={setSelectedTaille} disabled={!selectedArticleId}>
                <SelectTrigger id="tailleSelect">
                  <SelectValue placeholder="Choisir une taille" />
                </SelectTrigger>
                <SelectContent>
                  {getDisplayableSizesForSelectedArticle().map(taille => (
                    <SelectItem key={taille} value={taille}>{taille}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="quantiteInput" className="text-sm font-medium">Quantité</label>
            <Input
              id="quantiteInput"
              type="number"
              min="1"
              value={quantiteInput}
              onChange={(e) => setQuantiteInput(Math.max(1, parseInt(e.target.value,10) || 1))}
              disabled={!selectedArticleId}
            />
          </div>
          <Button onClick={handleAddToCommande} disabled={!selectedArticleId || quantiteInput <= 0 || (selectedArticleInfo?.hasSizeVariants && !selectedTaille)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter à la commande
          </Button>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Articles à commander</h2>
          {commandeEnPreparation.length > 0 ? (
            <div className="rounded-md border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead className="w-[100px]">Taille</TableHead>
                    <TableHead className="w-[120px]">Quantité</TableHead>
                    <TableHead className="text-right w-[80px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commandeEnPreparation.map((item, index) => (
                    <TableRow key={`${item.id}-${item.taille || index}`}>
                      <TableCell className="font-medium">{item.articleName}</TableCell>
                      <TableCell>{item.taille || '-'}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantite}
                          onChange={(e) => handleQuantityChangeInCommande(index, Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="h-8 w-20"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveFromCommande(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">Aucun article dans la commande en préparation.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-8">
        <Button variant="outline" onClick={handleAddRupturesToCommande}>
          <DownloadCloud className="mr-2 h-4 w-4" />
          Ajouter Articles en Rupture
        </Button>
        <Button variant="outline" onClick={handleResetCommande}>Réinitialiser la commande</Button>
        <Button onClick={handleValidateCommande} disabled={commandeEnPreparation.length === 0}>
          <Send className="mr-2 h-4 w-4" />
          Valider la Commande
        </Button>
      </div>
    </div>
  );
}
