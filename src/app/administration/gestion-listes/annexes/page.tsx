
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
import { Label } from '@/components/ui/label';
import { ArrowLeft, PlusCircle, Trash2, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AnnexeEvent } from '@/app/planning/occupation-annexe/page';

export interface AnnexeDefinition {
  id: string;
  village: string;
  lieu: string;
}

export const ANNEXE_DEFINITIONS_STORAGE_KEY = 'TRAPEL_FC_ANNEXE_DEFINITIONS_DATA';
const ANNEXE_EVENTS_STORAGE_KEY = 'TRAPEL_FC_ANNEXE_EVENTS_DATA'; // From occupation-annexe/page.tsx

const INITIAL_ANNEXE_DEFINITIONS: AnnexeDefinition[] = [
  { id: 'salle_reunion_vm', village: 'Villemoustoussou', lieu: 'Salle de Réunion' },
  { id: 'club_house_vm', village: 'Villemoustoussou', lieu: 'Club House' },
  { id: 'bureau_principal_vm', village: 'Villemoustoussou', lieu: 'Bureau Principal' },
];

export const getStoredAnnexeDefinitions = (): AnnexeDefinition[] => {
  if (typeof window === 'undefined') return [...INITIAL_ANNEXE_DEFINITIONS];
  const stored = localStorage.getItem(ANNEXE_DEFINITIONS_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as AnnexeDefinition[];
      if (Array.isArray(parsed) && parsed.every(item => item.id && item.village && item.lieu)) {
        return parsed.sort((a, b) => `${a.village} - ${a.lieu}`.localeCompare(`${b.village} - ${b.lieu}`));
      }
    } catch (e) {
      console.error("Failed to parse annexe definitions from localStorage", e);
    }
  }
  localStorage.setItem(ANNEXE_DEFINITIONS_STORAGE_KEY, JSON.stringify(INITIAL_ANNEXE_DEFINITIONS));
  return [...INITIAL_ANNEXE_DEFINITIONS].sort((a, b) => `${a.village} - ${a.lieu}`.localeCompare(`${b.village} - ${b.lieu}`));
};

const saveStoredAnnexeDefinitions = (definitions: AnnexeDefinition[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ANNEXE_DEFINITIONS_STORAGE_KEY, JSON.stringify(definitions));
  window.dispatchEvent(new StorageEvent('storage', { key: ANNEXE_DEFINITIONS_STORAGE_KEY }));
};

const getAnnexeEventsFromStorage = (): AnnexeEvent[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(ANNEXE_EVENTS_STORAGE_KEY);
  return storedData ? JSON.parse(storedData) : [];
};

export default function AnnexesDefinitionsPage() {
  const [definitions, setDefinitions] = useState<AnnexeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState<AnnexeDefinition | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnexeDefinition | null>(null);
  const [villageInput, setVillageInput] = useState('');
  const [lieuInput, setLieuInput] = useState('');

  useEffect(() => {
    setDefinitions(getStoredAnnexeDefinitions());
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ANNEXE_DEFINITIONS_STORAGE_KEY) {
        setDefinitions(getStoredAnnexeDefinitions());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleOpenModal = (item: AnnexeDefinition | null = null) => {
    setEditingItem(item);
    setVillageInput(item?.village || '');
    setLieuInput(item?.lieu || '');
    setIsModalOpen(true);
  };

  const handleSaveItem = () => {
    if (!villageInput.trim() || !lieuInput.trim()) {
      toast({ title: "Erreur", description: "Le village et le lieu sont requis.", variant: "destructive" });
      return;
    }

    const newItemLabel = `${villageInput.trim()} - ${lieuInput.trim()}`;
    if (!editingItem && definitions.some(def => `${def.village} - ${def.lieu}`.toLowerCase() === newItemLabel.toLowerCase())) {
      toast({ title: "Erreur", description: "Cette annexe existe déjà.", variant: "destructive" });
      return;
    }
    if (editingItem && editingItem.village === villageInput.trim() && editingItem.lieu === lieuInput.trim()) {
      // No change
      setIsModalOpen(false);
      return;
    }
     if (editingItem && definitions.some(def => def.id !== editingItem.id && `${def.village} - ${def.lieu}`.toLowerCase() === newItemLabel.toLowerCase())) {
      toast({ title: "Erreur", description: "Une autre annexe avec cette combinaison village/lieu existe déjà.", variant: "destructive" });
      return;
    }

    let updatedDefinitions;
    if (editingItem) {
      const oldLabel = `${editingItem.village} - ${editingItem.lieu}`;
      updatedDefinitions = definitions.map(def =>
        def.id === editingItem.id ? { ...def, village: villageInput.trim(), lieu: lieuInput.trim() } : def
      );
      toast({ title: "Succès", description: `Annexe "${oldLabel}" modifiée en "${newItemLabel}".` });
    } else {
      const newDefinition: AnnexeDefinition = {
        id: crypto.randomUUID(),
        village: villageInput.trim(),
        lieu: lieuInput.trim(),
      };
      updatedDefinitions = [...definitions, newDefinition];
      toast({ title: "Succès", description: `Annexe "${newItemLabel}" ajoutée.` });
    }

    setDefinitions(updatedDefinitions.sort((a, b) => `${a.village} - ${a.lieu}`.localeCompare(`${b.village} - ${b.lieu}`)));
    saveStoredAnnexeDefinitions(updatedDefinitions);
    setIsModalOpen(false);
  };

  const requestDeleteItem = (item: AnnexeDefinition) => {
    const annexeEvents = getAnnexeEventsFromStorage();
    const isUsed = annexeEvents.some(event => event.annexeId === item.id);
    if (isUsed) {
      toast({
        title: "Suppression impossible",
        description: `L'annexe "${item.village} - ${item.lieu}" est utilisée dans des événements planifiés et ne peut pas être supprimée.`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    setItemToDelete(item);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      const updatedDefinitions = definitions.filter(def => def.id !== itemToDelete.id);
      setDefinitions(updatedDefinitions);
      saveStoredAnnexeDefinitions(updatedDefinitions);
      toast({ title: "Succès", description: `Annexe "${itemToDelete.village} - ${itemToDelete.lieu}" supprimée.` });
    }
    setIsConfirmDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/administration/gestion-listes">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour à la Gestion des Listes</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Gestion des Annexes</h1>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter une Annexe
        </Button>
      </div>

      <div className="mb-6 p-4 border rounded-md bg-muted text-muted-foreground">
        <p className="text-sm">Gérez ici les annexes (salles de réunion, club houses, bureaux, etc.) utilisables dans le planning des annexes.</p>
      </div>

      {definitions.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Village</TableHead>
                <TableHead className="py-2 px-4">Lieu / Nom</TableHead>
                <TableHead className="text-right py-2 px-4 w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {definitions.map((def) => (
                <TableRow key={def.id}>
                  <TableCell className="py-2 px-4 font-medium">{def.village}</TableCell>
                  <TableCell className="py-2 px-4">{def.lieu}</TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenModal(def)}
                      aria-label={`Modifier ${def.village} - ${def.lieu}`}
                      className="mr-2"
                    >
                      <Edit3 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteItem(def)}
                      aria-label={`Supprimer ${def.village} - ${def.lieu}`}
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
        <p className="text-center text-muted-foreground">Aucune annexe à afficher. Cliquez sur "Ajouter une Annexe" pour commencer.</p>
      )}

      {itemToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer l'annexe "{itemToDelete.village} - {itemToDelete.lieu}" ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteItem} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Modifier l\'Annexe' : 'Ajouter une Annexe'}</DialogTitle>
              <DialogDescription>
                Saisissez le nom du village et le nom spécifique du lieu.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="village" className="text-right">Village</Label>
                <Input id="village" value={villageInput} onChange={(e) => setVillageInput(e.target.value)} className="col-span-3" placeholder="Ex: Villemoustoussou"/>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lieu" className="text-right">Lieu/Nom</Label>
                <Input id="lieu" value={lieuInput} onChange={(e) => setLieuInput(e.target.value)} className="col-span-3" placeholder="Ex: Salle de Réunion"/>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button></DialogClose>
              <Button type="button" onClick={handleSaveItem}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
