
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Edit3, Trash2, Eye, Copy } from 'lucide-react'; // Added Copy icon
import { useState, useEffect, useCallback } from 'react';
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
import { CommandeTypeFormModal } from '@/components/commande/commande-type-form-modal';
import { CommandeTypeDetailModal } from '@/components/commande/commande-type-detail-modal';
import type { NourritureBoissonListItem } from '@/app/administration/gestion-listes/listes-nourriture-boissons/page';
import { getStoredNourritureBoissonListItems, NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY } from '@/app/administration/gestion-listes/listes-nourriture-boissons/page';

export interface CommandeTypeArticle {
  nomArticle: string;
  quantite: number;
}
export interface CommandeType {
  id: string;
  nom: string;
  modelType: 'annexe' | 'match'; 
  articles?: CommandeTypeArticle[]; // Pour 'annexe' ou fallback
  articlesDomicile?: CommandeTypeArticle[]; // Pour 'match'
  articlesExterieur?: CommandeTypeArticle[]; // Pour 'match'
}

const COMMANDE_TYPES_STORAGE_KEY = 'TRAPEL_FC_COMMANDE_TYPES_NOURRITURE_DATA';

export const getStoredCommandeTypes = (): CommandeType[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(COMMANDE_TYPES_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as CommandeType[];
      if (Array.isArray(parsed) && parsed.every(item => item.id && item.nom && item.modelType)) {
        return parsed.map(item => {
          const baseItem = {
            ...item,
            modelType: item.modelType || 'match', // Default to 'match' if undefined, or 'annexe' if preferred
          };
          if (baseItem.modelType === 'match') {
            return {
              ...baseItem,
              articles: undefined, // Clear general articles if it's a match type
              articlesDomicile: item.articlesDomicile || item.articles || [], // Migrate from articles if needed
              articlesExterieur: item.articlesExterieur || [],
            };
          } else { // annexe
            return {
              ...baseItem,
              articles: item.articles || item.articlesDomicile || [], // Migrate from articlesDomicile if it's annexe and only domicile exists
              articlesDomicile: undefined,
              articlesExterieur: undefined,
            };
          }
        }).sort((a, b) => a.nom.localeCompare(b.nom));
      }
    } catch (e) {
      console.error("Failed to parse commande types from localStorage", e);
    }
  }
  return [];
};

const saveStoredCommandeTypes = (types: CommandeType[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COMMANDE_TYPES_STORAGE_KEY, JSON.stringify(types));
  window.dispatchEvent(new StorageEvent('storage', { key: COMMANDE_TYPES_STORAGE_KEY }));
};

const formatPrice = (price?: number) => {
  if (price === undefined || price === null) return '-';
  return `${price.toFixed(2)} €`;
};

export default function CommandeTypesNourriturePage() {
  const [commandeTypes, setCommandeTypes] = useState<CommandeType[]>([]);
  const [allFoodItems, setAllFoodItems] = useState<NourritureBoissonListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [itemToDelete, setItemToDelete] = useState<CommandeType | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<CommandeType | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const [commandeTypeToView, setCommandeTypeToView] = useState<CommandeType | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setCommandeTypes(getStoredCommandeTypes());
    setAllFoodItems(getStoredNourritureBoissonListItems());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === COMMANDE_TYPES_STORAGE_KEY || event.key === NOURRITURE_BOISSONS_LIST_ITEMS_STORAGE_KEY) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);

  const handleOpenFormModal = (item: CommandeType | null = null) => {
    setEditingItem(item);
    setIsFormModalOpen(true);
  };

  const handleOpenDetailModal = (item: CommandeType) => {
    setCommandeTypeToView(item);
    setIsDetailModalOpen(true);
  };

  const handleSaveCommandeType = (data: { nom: string; articles?: CommandeTypeArticle[], articlesDomicile?: CommandeTypeArticle[], articlesExterieur?: CommandeTypeArticle[], modelType: 'annexe' | 'match' }) => {
    let updatedTypes;
    const finalName = data.nom.trim();

    if (editingItem) { 
      if (finalName.toLowerCase() !== editingItem.nom.toLowerCase() && 
          commandeTypes.some(ct => ct.id !== editingItem!.id && ct.nom.toLowerCase() === finalName.toLowerCase())) {
        toast({ title: "Erreur", description: "Un autre modèle avec ce nom existe déjà.", variant: "destructive" });
        return;
      }
      updatedTypes = commandeTypes.map(ct => {
        if (ct.id === editingItem!.id) {
          if (data.modelType === 'match') {
            return { ...ct, nom: finalName, modelType: data.modelType, articlesDomicile: data.articlesDomicile || [], articlesExterieur: data.articlesExterieur || [], articles: undefined };
          } else { // annexe
            return { ...ct, nom: finalName, modelType: data.modelType, articles: data.articles || [], articlesDomicile: undefined, articlesExterieur: undefined };
          }
        }
        return ct;
      }).sort((a, b) => a.nom.localeCompare(b.nom));
      toast({ title: "Succès", description: `Modèle "${finalName}" mis à jour.` });
    } else { 
      if (!finalName) {
        toast({ title: "Erreur", description: "Le nom du modèle ne peut pas être vide.", variant: "destructive" });
        return;
      }
      if (commandeTypes.some(ct => ct.nom.toLowerCase() === finalName.toLowerCase())) {
        toast({ title: "Erreur", description: "Un modèle avec ce nom existe déjà.", variant: "destructive" });
        return;
      }
      let newCommandeType: CommandeType;
      if (data.modelType === 'match') {
        newCommandeType = {
          id: crypto.randomUUID(),
          nom: finalName,
          modelType: data.modelType,
          articlesDomicile: data.articlesDomicile || [],
          articlesExterieur: data.articlesExterieur || [],
        };
      } else { // annexe
         newCommandeType = {
          id: crypto.randomUUID(),
          nom: finalName,
          modelType: data.modelType,
          articles: data.articles || [],
        };
      }
      updatedTypes = [...commandeTypes, newCommandeType].sort((a, b) => a.nom.localeCompare(b.nom));
      toast({ title: "Succès", description: `Modèle "${newCommandeType.nom}" ajouté.` });
    }
    setCommandeTypes(updatedTypes);
    saveStoredCommandeTypes(updatedTypes);
    setIsFormModalOpen(false);
    setEditingItem(null);
  };

  const requestDeleteItem = (type: CommandeType) => {
    setItemToDelete(type);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      const updatedTypes = commandeTypes.filter(ct => ct.id !== itemToDelete.id);
      setCommandeTypes(updatedTypes);
      saveStoredCommandeTypes(updatedTypes);
      toast({ title: "Succès", description: `Modèle "${itemToDelete.nom}" supprimé.` });
    }
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleDuplicateCommandeType = (id: string) => {
    const typeToDuplicate = commandeTypes.find(ct => ct.id === id);
    if (!typeToDuplicate) {
      toast({ title: "Erreur", description: "Modèle à dupliquer non trouvé.", variant: "destructive" });
      return;
    }

    let newName = `${typeToDuplicate.nom} (Copie)`;
    let counter = 2;
    while (commandeTypes.some(ct => ct.nom.toLowerCase() === newName.toLowerCase())) {
      newName = `${typeToDuplicate.nom} (Copie ${counter})`;
      counter++;
    }

    const duplicatedType: CommandeType = {
      ...JSON.parse(JSON.stringify(typeToDuplicate)), // Deep copy
      id: crypto.randomUUID(),
      nom: newName,
    };

    const updatedTypes = [...commandeTypes, duplicatedType].sort((a, b) => a.nom.localeCompare(b.nom));
    setCommandeTypes(updatedTypes);
    saveStoredCommandeTypes(updatedTypes);
    toast({ title: "Succès", description: `Modèle "${typeToDuplicate.nom}" dupliqué en "${newName}".` });
  };

  const getModelTypeLabel = (modelType: 'annexe' | 'match') => {
    if (modelType === 'annexe') return 'Annexe';
    if (modelType === 'match') return 'Match';
    return 'N/D';
  };

  const calculateCommandeTypeTotal = (commandeType: CommandeType): number => {
    let total = 0;
    const articlesList = commandeType.modelType === 'match' 
      ? [...(commandeType.articlesDomicile || []), ...(commandeType.articlesExterieur || [])]
      : commandeType.articles || [];

    for (const articleInCommande of articlesList) {
      const foodItem = allFoodItems.find(fi => fi.nom === articleInCommande.nomArticle);
      if (foodItem && typeof foodItem.prix === 'number') {
        total += foodItem.prix * articleInCommande.quantite;
      }
    }
    return total;
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement...</div>;
  }

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
          <h1 className="text-2xl font-bold">Gestion des Commandes Types (Nourriture & Boissons)</h1>
        </div>
        <Button onClick={() => handleOpenFormModal()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un Modèle
        </Button>
      </div>

      {commandeTypes.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Nom du Modèle</TableHead>
                <TableHead className="py-2 px-4">Type</TableHead>
                <TableHead className="py-2 px-4 text-right">Montant Total Estimé</TableHead>
                <TableHead className="text-right py-2 px-4 w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commandeTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="py-2 px-4 font-medium">
                    <Button variant="link" onClick={() => handleOpenDetailModal(type)} className="p-0 h-auto">
                      {type.nom}
                    </Button>
                  </TableCell>
                  <TableCell className="py-2 px-4">{getModelTypeLabel(type.modelType)}</TableCell>
                  <TableCell className="py-2 px-4 text-right">{formatPrice(calculateCommandeTypeTotal(type))}</TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDuplicateCommandeType(type.id)}
                      aria-label={`Dupliquer ${type.nom}`}
                      className="mr-2"
                      title="Dupliquer"
                    >
                      <Copy className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenFormModal(type)}
                      aria-label={`Modifier ${type.nom}`}
                      className="mr-2"
                    >
                      <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteItem(type)}
                      aria-label={`Supprimer ${type.nom}`}
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
        <p className="text-center text-muted-foreground">
          Aucun modèle de commande défini. Cliquez sur "Ajouter un Modèle" pour commencer.
        </p>
      )}

      {itemToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer le modèle "{itemToDelete.nom}" ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setIsConfirmDeleteDialogOpen(false); setItemToDelete(null);}}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isFormModalOpen && (
         <CommandeTypeFormModal
            isOpen={isFormModalOpen}
            onClose={() => {
                setIsFormModalOpen(false);
                setEditingItem(null);
            }}
            onSave={handleSaveCommandeType}
            initialData={editingItem}
         />
      )}

      {commandeTypeToView && (
        <CommandeTypeDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setCommandeTypeToView(null);
          }}
          commandeType={commandeTypeToView}
        />
      )}
    </div>
  );
}

