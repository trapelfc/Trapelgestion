
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle, PackageCheck } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
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
import type { AggregatedEquipmentNeed } from '@/app/inscription/equipement/page';
import { EQUIPMENT_NEEDS_STORAGE_KEY, getEquipmentNeedsFromStorage as getNeeds, saveEquipmentNeedsToStorage } from '@/app/inscription/equipement/page';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EquipmentOrderItemInProgress } from '@/config/stock-constants';
import { EQUIPMENT_ORDERS_IN_PROGRESS_KEY } from '@/config/stock-constants';

const getEquipmentNeeds = (): AggregatedEquipmentNeed[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(EQUIPMENT_NEEDS_STORAGE_KEY);
  try {
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error parsing equipment needs from storage", e);
    return [];
  }
};

const getEquipmentOrdersInProgressFromStorage = (): EquipmentOrderItemInProgress[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(EQUIPMENT_ORDERS_IN_PROGRESS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export default function RuptureStockEquipementPage() {
  const [equipmentNeeds, setEquipmentNeeds] = useState<AggregatedEquipmentNeed[]>([]);
  const [articlesEnCommande, setArticlesEnCommande] = useState<EquipmentOrderItemInProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNeedIds, setSelectedNeedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [isConfirmProcessDialogOpen, setIsConfirmProcessDialogOpen] = useState(false);

  const loadData = () => {
    setIsLoading(true);
    setEquipmentNeeds(getEquipmentNeeds().sort((a,b) => a.articleName.localeCompare(b.articleName) || (a.size || '').localeCompare(b.size || '')));
    setArticlesEnCommande(getEquipmentOrdersInProgressFromStorage());
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === EQUIPMENT_NEEDS_STORAGE_KEY) {
        setEquipmentNeeds(getEquipmentNeeds().sort((a,b) => a.articleName.localeCompare(b.articleName) || (a.size || '').localeCompare(b.size || '')));
      }
      if (event.key === EQUIPMENT_ORDERS_IN_PROGRESS_KEY) {
        setArticlesEnCommande(getEquipmentOrdersInProgressFromStorage());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const getQuantiteEnCommandePourBesoin = (besoin: AggregatedEquipmentNeed): number => {
    return articlesEnCommande
      .filter(order => order.articleName === besoin.articleName && order.taille === besoin.size)
      .reduce((sum, order) => sum + order.quantite, 0);
  };

  const handleSelectNeed = (needId: string, checked: boolean) => {
    setSelectedNeedIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(needId);
      } else {
        newSet.delete(needId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNeedIds(new Set(equipmentNeeds.map(need => need.id)));
    } else {
      setSelectedNeedIds(new Set());
    }
  };

  const requestProcessSelectedNeeds = () => {
    if (selectedNeedIds.size === 0) {
      toast({ title: "Aucune sélection", description: "Veuillez sélectionner des articles à traiter.", variant: "default" });
      return;
    }
    setIsConfirmProcessDialogOpen(true);
  };
  
  const confirmProcessSelectedNeeds = () => {
    const remainingNeeds = equipmentNeeds.filter(need => !selectedNeedIds.has(need.id));
    saveEquipmentNeedsToStorage(remainingNeeds);
    // Potentiellement, il faudrait aussi ajuster les quantités dans EQUIPMENT_ORDERS_IN_PROGRESS_KEY si "traiter" signifie "reçu"
    // Pour l'instant, on retire juste de la liste des besoins.
    toast({ title: "Besoins traités", description: `${selectedNeedIds.size} article(s) ont été retiré(s) de la liste des besoins.` });
    setSelectedNeedIds(new Set()); // Vider la sélection
    setIsConfirmProcessDialogOpen(false);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement des besoins d'équipement...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className='flex items-center'>
            <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/commande/equipement"> 
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Retour au Module Equipement</span>
            </Link>
            </Button>
            <h1 className="text-2xl font-bold">Besoins pour Commande d'Équipement (Ruptures)</h1>
        </div>
        <Button onClick={requestProcessSelectedNeeds} disabled={selectedNeedIds.size === 0}>
            <PackageCheck className="mr-2 h-4 w-4" />
            Traiter les Articles Sélectionnés
        </Button>
      </div>

      <div className="mb-4 p-3 border rounded-md bg-sky-50 text-sky-800 text-sm">
        <p>Cette page liste les articles d'équipement marqués comme manquants lors de l'attribution aux licenciés.</p>
        <p className="mt-1">"Qté en Commande" indique combien d'unités de cet article/taille sont actuellement dans des commandes validées mais non encore traitées/reçues.</p>
        <p className="mt-1">Sélectionnez les articles que vous avez commandés ou reçus, puis cliquez sur "Traiter" pour les retirer de cette liste de besoins.</p>
      </div>

      {equipmentNeeds.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>{/*
                Ensure no whitespace characters (like spaces or newlines) are direct children
                of TableRow, other than the TableHead components themselves.
                This is a common cause for hydration errors related to "whitespace text nodes".
              */}<TableHead className="py-2 px-4 w-12">
                  <Checkbox
                    checked={selectedNeedIds.size === equipmentNeeds.length && equipmentNeeds.length > 0}
                    onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    aria-label="Tout sélectionner"
                  />
                </TableHead><TableHead className="py-2 px-4">Article</TableHead><TableHead className="py-2 px-4">Taille</TableHead><TableHead className="py-2 px-4 text-right">Qté Nécessaire</TableHead><TableHead className="py-2 px-4 text-right">Qté en Commande</TableHead><TableHead className="py-2 px-4 text-center">Dernière MàJ Besoin</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {equipmentNeeds.map((need) => (
                <TableRow key={need.id}>
                  <TableCell className="py-2 px-4">
                    <Checkbox
                      checked={selectedNeedIds.has(need.id)}
                      onCheckedChange={(checked) => handleSelectNeed(need.id, Boolean(checked))}
                      aria-label={`Sélectionner ${need.articleName}`}
                    />
                  </TableCell>
                  <TableCell className="py-2 px-4 font-medium">{need.articleName}</TableCell>
                  <TableCell className="py-2 px-4">{need.size || '-'}</TableCell>
                  <TableCell className="py-2 px-4 text-right">{need.totalQuantityNeeded}</TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    {getQuantiteEnCommandePourBesoin(need)}
                  </TableCell>
                  <TableCell className="py-2 px-4 text-center text-xs text-muted-foreground">
                    {format(parseISO(need.lastUpdate), 'dd/MM/yy HH:mm', {locale: fr})}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8 border rounded-md">
          <p>Aucun besoin d'équipement en attente pour le moment.</p>
        </div>
      )}
      <AlertDialog open={isConfirmProcessDialogOpen} onOpenChange={setIsConfirmProcessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le Traitement</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment marquer les {selectedNeedIds.size} article(s) sélectionné(s) comme traités ? Ils seront retirés de cette liste de besoins.
              Cela n'affecte pas (encore) les quantités "en commande".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmProcessDialogOpen(false)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmProcessSelectedNeeds} className="bg-green-600 hover:bg-green-700">
              Oui, Traiter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
