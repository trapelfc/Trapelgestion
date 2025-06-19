
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
import { ArrowLeft, PlusCircle, Trash2, Edit3 } from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FOOD_LOCATIONS as INITIAL_FOOD_LOCATIONS, GLOBAL_STOCK_STORAGE_KEY } from '@/config/stock-constants';
import { useToast } from '@/hooks/use-toast';
import type { EquipementItem as StockItem } from '@/app/stock/equipement/page';

const FOOD_LOCATIONS_STORAGE_KEY = 'TRAPEL_FC_ADMIN_LIST_FOOD_LOCATIONS';
// GLOBAL_STOCK_STORAGE_KEY importé depuis stock-constants

type StoredStockItem = Omit<StockItem, 'lastUpdated'> & {
  lastUpdated: string;
};

const addLocationFormSchema = z.object({
  newLocationName: z.string().min(1, "Le nom du lieu est requis.").max(50, "Le nom ne doit pas dépasser 50 caractères."),
});
type AddLocationFormData = z.infer<typeof addLocationFormSchema>;

const editLocationFormSchema = z.object({
  editedLocationNameInput: z.string().min(1, "Le nom du lieu est requis.").max(50, "Le nom ne doit pas dépasser 50 caractères."),
});
type EditLocationFormData = z.infer<typeof editLocationFormSchema>;


const getStoredLocations = (): string[] => {
  if (typeof window === 'undefined') return [...INITIAL_FOOD_LOCATIONS];
  const stored = localStorage.getItem(FOOD_LOCATIONS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse food locations from localStorage", e);
    }
  }
  const initialLocations = [...INITIAL_FOOD_LOCATIONS];
  localStorage.setItem(FOOD_LOCATIONS_STORAGE_KEY, JSON.stringify(initialLocations));
  return initialLocations;
};

const saveStoredLocations = (locations: string[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FOOD_LOCATIONS_STORAGE_KEY, JSON.stringify(locations));
  window.dispatchEvent(new StorageEvent('storage', { key: FOOD_LOCATIONS_STORAGE_KEY }));
};

const getGlobalStockItemsFromStorage = (): StockItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(GLOBAL_STOCK_STORAGE_KEY);
  if (storedData) {
    try {
      const items = JSON.parse(storedData) as StoredStockItem[];
      return items.map(item => ({
        ...item,
        lastUpdated: item.lastUpdated ? new Date(item.lastUpdated) : new Date(),
      }));
    } catch (error) {
      console.error("Error parsing global stock data from localStorage:", error);
      return [];
    }
  }
  return [];
};

const saveGlobalStockItemsToStorage = (items: StockItem[]) => {
  if (typeof window === 'undefined') return;
  const itemsToStore: StoredStockItem[] = items.map(item => ({
    ...item,
    lastUpdated: item.lastUpdated.toISOString(),
  }));
  localStorage.setItem(GLOBAL_STOCK_STORAGE_KEY, JSON.stringify(itemsToStore));
};


export default function LieuxStockNourriturePage() {
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const [locationToEdit, setLocationToEdit] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const addForm = useForm<AddLocationFormData>({
    resolver: zodResolver(addLocationFormSchema),
  });

  const editForm = useForm<EditLocationFormData>({
    resolver: zodResolver(editLocationFormSchema),
  });

  useEffect(() => {
    setLocations(getStoredLocations());
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === FOOD_LOCATIONS_STORAGE_KEY) {
        setLocations(getStoredLocations());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleAddLocation: SubmitHandler<AddLocationFormData> = (data) => {
    const newName = data.newLocationName.trim();
    if (locations.some(loc => loc.toLowerCase() === newName.toLowerCase())) {
      toast({
        title: "Erreur",
        description: "Ce lieu de stock existe déjà.",
        variant: "destructive",
      });
      return;
    }
    const updatedLocations = [...locations, newName].sort((a, b) => a.localeCompare(b));
    setLocations(updatedLocations);
    saveStoredLocations(updatedLocations);
    addForm.reset();
    toast({
      title: "Succès",
      description: `Lieu "${newName}" ajouté.`,
    });
  };

  const requestDeleteLocation = (locationName: string) => {
    const globalStockItems = getGlobalStockItemsFromStorage();
    const isLocationUsed = globalStockItems.some(
      (item) => item.itemCategory === 'food' && item.sizeBreakdown && typeof item.sizeBreakdown[locationName] === 'number'
    );

    if (isLocationUsed) {
      toast({
        title: "Suppression impossible",
        description: `Le lieu "${locationName}" est actuellement utilisé par un ou plusieurs articles de stock (nourriture) et ne peut pas être supprimé.`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setItemToDelete(locationName);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteLocation = () => {
    if (itemToDelete) {
      const updatedLocations = locations.filter(loc => loc !== itemToDelete);
      setLocations(updatedLocations);
      saveStoredLocations(updatedLocations);
      toast({
        title: "Succès",
        description: `Lieu "${itemToDelete}" supprimé.`,
      });
    }
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const openEditDialog = (locationName: string) => {
    setLocationToEdit(locationName);
    editForm.setValue("editedLocationNameInput", locationName);
    setIsEditDialogOpen(true);
  };

  const handleSaveEditedLocation: SubmitHandler<EditLocationFormData> = (data) => {
    if (!locationToEdit) return;

    const oldName = locationToEdit;
    const newName = data.editedLocationNameInput.trim();

    if (newName.toLowerCase() !== oldName.toLowerCase() && locations.some(loc => loc.toLowerCase() === newName.toLowerCase())) {
      toast({
        title: "Erreur",
        description: "Un autre lieu avec ce nom existe déjà.",
        variant: "destructive",
      });
      return;
    }

    if (oldName === newName) {
      setIsEditDialogOpen(false);
      setLocationToEdit(null);
      return;
    }

    // Update in locations list
    const updatedLocations = locations.map(loc => (loc === oldName ? newName : loc)).sort((a, b) => a.localeCompare(b));
    setLocations(updatedLocations);
    saveStoredLocations(updatedLocations);

    // Update in global stock items
    const globalStockItems = getGlobalStockItemsFromStorage();
    const updatedStockItems = globalStockItems.map(item => {
      if (item.itemCategory === 'food' && item.sizeBreakdown && item.sizeBreakdown.hasOwnProperty(oldName)) {
        const newSizeBreakdown = { ...item.sizeBreakdown };
        newSizeBreakdown[newName] = newSizeBreakdown[oldName];
        delete newSizeBreakdown[oldName];
        return { ...item, sizeBreakdown: newSizeBreakdown, lastUpdated: new Date() };
      }
      return item;
    });
    saveGlobalStockItemsToStorage(updatedStockItems);
    window.dispatchEvent(new StorageEvent('storage', { key: GLOBAL_STOCK_STORAGE_KEY }));

    toast({
      title: "Succès",
      description: `Lieu "${oldName}" modifié en "${newName}". Les articles de stock associés ont été mis à jour.`,
    });
    setIsEditDialogOpen(false);
    setLocationToEdit(null);
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
        <h1 className="text-2xl font-bold">Gestion des Lieux de Stock (Nourriture)</h1>
      </div>

      <form onSubmit={addForm.handleSubmit(handleAddLocation)} className="mb-6 flex items-start gap-2">
        <div className="flex-grow">
          <Input
            {...addForm.register("newLocationName")}
            placeholder="Nom du nouveau lieu"
            className={addForm.formState.errors.newLocationName ? "border-destructive" : ""}
          />
          {addForm.formState.errors.newLocationName && (
            <p className="text-sm text-destructive mt-1">{addForm.formState.errors.newLocationName.message}</p>
          )}
        </div>
        <Button type="submit">
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter
        </Button>
      </form>

      {locations.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Nom du Lieu</TableHead>
                <TableHead className="text-right py-2 px-4 w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location}>
                  <TableCell className="py-2 px-4 font-medium">{location}</TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(location)}
                      aria-label={`Modifier ${location}`}
                      className="mr-2"
                    >
                      <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteLocation(location)}
                      aria-label={`Supprimer ${location}`}
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
        <p className="text-center text-muted-foreground">Aucun lieu de stock (nourriture) à afficher.</p>
      )}

      {itemToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer le lieu "{itemToDelete}" ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteLocation} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {locationToEdit && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le lieu de stock</DialogTitle>
              <DialogDescription>
                Modifier le nom du lieu "{locationToEdit}".
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(handleSaveEditedLocation)} className="space-y-4">
              <Input
                {...editForm.register("editedLocationNameInput")}
                defaultValue={locationToEdit}
                className={editForm.formState.errors.editedLocationNameInput ? "border-destructive" : ""}
              />
              {editForm.formState.errors.editedLocationNameInput && (
                <p className="text-sm text-destructive mt-1">{editForm.formState.errors.editedLocationNameInput.message}</p>
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
    </div>
  );
}
    
