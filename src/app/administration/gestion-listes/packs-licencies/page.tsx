
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, PlusCircle, Trash2, Edit3, Settings2 } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { INITIAL_PACK_OPTIONS } from '@/config/licencies-constants'; // Corrected import
import { PACK_COMPOSITIONS, PACK_COMPOSITIONS_STORAGE_KEY, type PackItemDetail, INITIAL_STOCK_EQUIPEMENTS } from '@/config/stock-constants';
import { useToast } from '@/hooks/use-toast';
import type { LicencieItem } from '@/app/inscription/nouveau-licencie/page';
import { PackCompositionModal } from '@/components/administration/pack-composition-modal';
import type { EquipementItem as StockItem } from '@/app/stock/equipement/page';


const PACK_OPTIONS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_LICENSEE_PACKS';
const LICENCIES_STORAGE_KEY = 'TRAPEL_FC_LICENCIES_DATA';
// GLOBAL_STOCK_STORAGE_KEY est utilisé pour vérifier si un fournisseur/lieu est utilisé,
// mais la liste des articles pour la composition vient de INITIAL_STOCK_EQUIPEMENTS.

const addPackFormSchema = z.object({
  newPackName: z.string().min(3, "Le nom du pack est requis (ex: Pack 1 - 140€).").max(50, "Le nom ne doit pas dépasser 50 caractères."),
});
type AddPackFormData = z.infer<typeof addPackFormSchema>;

const editPackFormSchema = z.object({
  editedPackNameInput: z.string().min(3, "Le nom du pack est requis.").max(50, "Le nom ne doit pas dépasser 50 caractères."),
});
type EditPackFormData = z.infer<typeof editPackFormSchema>;

const getStoredPacks = (): string[] => {
  if (typeof window === 'undefined') return [...INITIAL_PACK_OPTIONS];
  const stored = localStorage.getItem(PACK_OPTIONS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse pack options from localStorage", e);
    }
  }
  const initialPacks = [...INITIAL_PACK_OPTIONS];
  localStorage.setItem(PACK_OPTIONS_STORAGE_KEY, JSON.stringify(initialPacks));
  return initialPacks;
};

const saveStoredPacks = (packs: string[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PACK_OPTIONS_STORAGE_KEY, JSON.stringify(packs));
  window.dispatchEvent(new StorageEvent('storage', { key: PACK_OPTIONS_STORAGE_KEY }));
};

export const getStoredPackCompositions = (): Record<string, PackItemDetail[]> => {
  if (typeof window === 'undefined') return { ...PACK_COMPOSITIONS };
  const stored = localStorage.getItem(PACK_COMPOSITIONS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed !== null) {
        // Assurer que toutes les compositions de pack initiales sont présentes si elles manquent
        const compositions = { ...PACK_COMPOSITIONS, ...parsed };
        return compositions;
      }
    } catch (e) {
      console.error("Failed to parse pack compositions from localStorage", e);
    }
  }
  const initialCompositions = { ...PACK_COMPOSITIONS };
  localStorage.setItem(PACK_COMPOSITIONS_STORAGE_KEY, JSON.stringify(initialCompositions));
  return initialCompositions;
};

export const saveStoredPackCompositions = (compositions: Record<string, PackItemDetail[]>) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PACK_COMPOSITIONS_STORAGE_KEY, JSON.stringify(compositions));
  window.dispatchEvent(new StorageEvent('storage', { key: PACK_COMPOSITIONS_STORAGE_KEY }));
};

type StoredLicencieItem = Omit<LicencieItem, 'dateNaissance' | 'responsableLegal' | 'paiement' | 'equipementAttribué' | 'statutEquipement'> & {
  dateNaissance: string;
  responsableLegal?: Omit<NonNullable<LicencieItem['responsableLegal']>, 'dateNaissance'> & {
    dateNaissance: string;
  };
  paiement?: any;
  equipementAttribué?: any[];
  statutEquipement?: string;
};

const getLicenciesFromStorage = (): LicencieItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(LICENCIES_STORAGE_KEY);
  if (storedData) {
    try {
      const items = JSON.parse(storedData) as StoredLicencieItem[];
      return items.map(item => ({
        ...item,
        // @ts-ignore
        dateNaissance: new Date(item.dateNaissance), 
        // @ts-ignore
        responsableLegal: item.responsableLegal ? { ...item.responsableLegal, dateNaissance: new Date(item.responsableLegal.dateNaissance) } : undefined,
      })) as LicencieItem[];
    } catch (error) {
      console.error("Error parsing licencies data from localStorage:", error);
      return [];
    }
  }
  return [];
};

const definedStockItems: StockItem[] = INITIAL_STOCK_EQUIPEMENTS.map(item => ({
  ...item,
  lastUpdated: item.lastUpdated instanceof Date ? item.lastUpdated : new Date(item.lastUpdated),
}));


export default function PacksLicenciesPage() {
  const [packs, setPacks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const [packToEdit, setPackToEdit] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [isCompositionModalOpen, setIsCompositionModalOpen] = useState(false);
  const [selectedPackForComposition, setSelectedPackForComposition] = useState<string | null>(null);
  const [currentPackComposition, setCurrentPackComposition] = useState<PackItemDetail[]>([]);
  // Utiliser INITIAL_STOCK_EQUIPEMENTS pour la composition des packs
  const [allStockItemsForComposition] = useState<StockItem[]>(definedStockItems);


  const addForm = useForm<AddPackFormData>({
    resolver: zodResolver(addPackFormSchema),
  });

  const editForm = useForm<EditPackFormData>({
    resolver: zodResolver(editPackFormSchema),
  });

  useEffect(() => {
    setPacks(getStoredPacks());
    getStoredPackCompositions(); // Ensure initialized
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === PACK_OPTIONS_STORAGE_KEY) {
        setPacks(getStoredPacks());
      }
      // Pas besoin d'écouter GLOBAL_STOCK_STORAGE_KEY pour la composition
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleAddPack: SubmitHandler<AddPackFormData> = (data) => {
    const newName = data.newPackName.trim();
    if (packs.some(p => p.toLowerCase() === newName.toLowerCase())) {
      toast({
        title: "Erreur",
        description: "Ce pack existe déjà.",
        variant: "destructive",
      });
      return;
    }
    const updatedPacks = [...packs, newName].sort((a,b) => a.localeCompare(b));
    setPacks(updatedPacks);
    saveStoredPacks(updatedPacks);
    
    // Initialiser la composition pour le nouveau pack avec un tableau vide
    const compositions = getStoredPackCompositions();
    compositions[newName] = [];
    saveStoredPackCompositions(compositions);
    
    addForm.reset();
    toast({
      title: "Succès",
      description: `Pack "${newName}" ajouté. N'oubliez pas de configurer sa composition.`,
    });
  };

  const requestDeletePack = (packName: string) => {
    const licencies = getLicenciesFromStorage();
    const isPackUsed = licencies.some(licencie => licencie.packChoisi === packName);

    if (isPackUsed) {
      toast({
        title: "Suppression impossible",
        description: `Le pack "${packName}" est actuellement utilisé par un ou plusieurs licenciés et ne peut pas être supprimé.`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    setItemToDelete(packName);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeletePack = () => {
    if (itemToDelete) {
      const updatedPacks = packs.filter(p => p !== itemToDelete);
      setPacks(updatedPacks);
      saveStoredPacks(updatedPacks);
      
      const compositions = getStoredPackCompositions();
      delete compositions[itemToDelete];
      saveStoredPackCompositions(compositions);

      toast({
        title: "Succès",
        description: `Pack "${itemToDelete}" et sa composition supprimés.`,
      });
    }
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const openEditDialog = (packName: string) => {
    setPackToEdit(packName);
    editForm.setValue("editedPackNameInput", packName);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedPack: SubmitHandler<EditPackFormData> = (data) => {
    if (!packToEdit) return;

    const oldName = packToEdit;
    const newName = data.editedPackNameInput.trim();

    if (newName.toLowerCase() !== oldName.toLowerCase() && packs.some(p => p.toLowerCase() === newName.toLowerCase())) {
      toast({
        title: "Erreur",
        description: "Un autre pack avec ce nom existe déjà.",
        variant: "destructive",
      });
      return;
    }

    if (oldName === newName) {
      setIsEditDialogOpen(false);
      setPackToEdit(null);
      return;
    }

    const updatedPacks = packs.map(p => (p === oldName ? newName : p)).sort((a, b) => a.localeCompare(b));
    setPacks(updatedPacks);
    saveStoredPacks(updatedPacks);

    const compositions = getStoredPackCompositions();
    if (compositions[oldName]) {
      compositions[newName] = compositions[oldName];
      delete compositions[oldName];
      saveStoredPackCompositions(compositions);
    }
    
    window.dispatchEvent(new StorageEvent('storage', { key: PACK_OPTIONS_STORAGE_KEY }));
    window.dispatchEvent(new StorageEvent('storage', { key: PACK_COMPOSITIONS_STORAGE_KEY }));

    toast({
      title: "Succès",
      description: `Pack "${oldName}" modifié en "${newName}". La liste des packs disponibles a été mise à jour.`,
    });
    setIsEditDialogOpen(false);
    setPackToEdit(null);
  };

  const openCompositionModal = (packName: string) => {
    const compositions = getStoredPackCompositions();
    setSelectedPackForComposition(packName);
    setCurrentPackComposition(compositions[packName] || []);
    setIsCompositionModalOpen(true);
  };

  const handleSavePackComposition = (packName: string, newComposition: PackItemDetail[]) => {
    const compositions = getStoredPackCompositions();
    compositions[packName] = newComposition;
    saveStoredPackCompositions(compositions);
    toast({
      title: "Succès",
      description: `Composition du pack "${packName}" mise à jour.`,
    });
    setIsCompositionModalOpen(false);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/administration/gestion-listes">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour à la Gestion des Listes</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Gestion des Packs des Licenciés</h1>
      </div>

      <form onSubmit={addForm.handleSubmit(handleAddPack)} className="mb-6 flex items-start gap-2">
        <div className="flex-grow">
          <Input
            {...addForm.register("newPackName")}
            placeholder="Nom du nouveau pack (ex: Pack Senior - 250€)"
            className={addForm.formState.errors.newPackName ? "border-destructive" : ""}
          />
          {addForm.formState.errors.newPackName && (
            <p className="text-sm text-destructive mt-1">{addForm.formState.errors.newPackName.message}</p>
          )}
        </div>
        <Button type="submit">
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter
        </Button>
      </form>

      {packs.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Nom du Pack</TableHead>
                <TableHead className="text-right py-2 px-4 w-[200px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs.map((pack) => (
                <TableRow key={pack}>
                  <TableCell className="py-2 px-4 font-medium">{pack}</TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCompositionModal(pack)}
                      aria-label={`Gérer composition de ${pack}`}
                      className="mr-2"
                    >
                      <Settings2 className="h-3 w-3 mr-1" /> Composition
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(pack)}
                      aria-label={`Modifier ${pack}`}
                      className="mr-1"
                    >
                      <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeletePack(pack)}
                      aria-label={`Supprimer ${pack}`}
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
        <p className="text-center text-muted-foreground">Aucun pack à afficher.</p>
      )}
      <div className="mt-4 p-3 border rounded-md bg-muted text-muted-foreground text-xs">
        <p><strong>Note :</strong> La modification du nom d'un pack ici met à jour la liste des options. La composition (articles inclus) et le prix sont désormais gérables dynamiquement.</p>
      </div>

      {itemToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer le pack "{itemToDelete}" ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeletePack} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {packToEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le pack</DialogTitle>
              <DialogDescription>
                Modifier le nom du pack "{packToEdit}".
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(handleSaveEditedPack)} className="space-y-4">
              <Input
                {...editForm.register("editedPackNameInput")}
                defaultValue={packToEdit}
                className={editForm.formState.errors.editedPackNameInput ? "border-destructive" : ""}
              />
              {editForm.formState.errors.editedPackNameInput && (
                <p className="text-sm text-destructive mt-1">{editForm.formState.errors.editedPackNameInput.message}</p>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
                </DialogClose>
                <Button type="submit">Enregistrer les modifications</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {selectedPackForComposition && (
        <PackCompositionModal
          isOpen={isCompositionModalOpen}
          onClose={() => setIsCompositionModalOpen(false)}
          packName={selectedPackForComposition}
          initialComposition={currentPackComposition}
          allStockItems={allStockItemsForComposition} 
          onSaveComposition={handleSavePackComposition}
        />
      )}
    </div>
  );
}

