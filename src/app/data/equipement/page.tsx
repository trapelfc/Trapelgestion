
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import type { LicencieItem, PaiementDetails } from '@/app/inscription/nouveau-licencie/page';
import { parseISO, format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import type { AttributedEquipement } from '@/config/stock-constants';
import { INITIAL_PACK_OPTIONS } from '@/config/licencies-constants'; // Correction ici

type StoredLicencieItem = Omit<LicencieItem, 'dateNaissance' | 'responsableLegal' | 'paiement' | 'equipementAttribué' | 'statutEquipement'> & {
  dateNaissance: string;
  responsableLegal?: Omit<NonNullable<LicencieItem['responsableLegal']>, 'dateNaissance'> & {
    dateNaissance: string;
  };
  paiement?: Omit<PaiementDetails, 'datePaiement'> & {
    datePaiement?: string;
  };
  equipementAttribué?: AttributedEquipement[];
  statutEquipement?: 'En attente' | 'Incomplet' | 'Complet';
};

const DATA_EQUIPEMENT_ATTRIBUE_STORAGE_KEY = 'TRAPEL_FC_DATA_EQUIPEMENT_ATTRIBUE_DATA';
const ALL_PACKS_VALUE = "__ALL_PACKS__";
const ALL_CATEGORIES_VALUE = "__ALL_CATEGORIES__";
const ALL_EQUIPEMENTS_VALUE = "__ALL_EQUIPEMENTS__";

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
        statutEquipement: item.statutEquipement || 'Complet',
      }));
    } catch (error) {
      console.error("Error parsing data equipement attribue from localStorage:", error);
      return [];
    }
  }
  return [];
};

const formatPackForDisplay = (packChoisi?: string): string => {
  if (!packChoisi) return 'N/A';
  return packChoisi.split(' - ')[0];
};

const formatEquipementAttribue = (equipements?: AttributedEquipement[]): string => {
  if (!equipements || equipements.length === 0) return 'Aucun équipement';
  return equipements.map(eq => `${eq.selectedArticleName}${eq.size ? ` (${eq.size})` : ''} x${eq.quantity}`).join('; ');
};


export default function DataEquipementPage() {
  const [allLicencies, setAllLicencies] = useState<LicencieItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [packFilter, setPackFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [equipementFilter, setEquipementFilter] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);
    const storedData = getDataEquipementAttribueFromStorage();
    const sortedData = storedData.sort((a, b) => {
        const nomCompare = a.nom.localeCompare(b.nom);
        if (nomCompare !== 0) return nomCompare;
        return a.prenom.localeCompare(b.prenom);
    });
    setAllLicencies(sortedData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === DATA_EQUIPEMENT_ATTRIBUE_STORAGE_KEY) {
        const storedData = getDataEquipementAttribueFromStorage();
        const sortedData = storedData.sort((a, b) => {
            const nomCompare = a.nom.localeCompare(b.nom);
            if (nomCompare !== 0) return nomCompare;
            return a.prenom.localeCompare(b.prenom);
        });
        setAllLicencies(sortedData);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(allLicencies.map(l => l.categorie));
    return Array.from(categories).sort();
  }, [allLicencies]);

  const uniqueEquipementsAttribues = useMemo(() => {
    const equipements = new Set<string>();
    allLicencies.forEach(l => {
      l.equipementAttribué?.forEach(eq => {
        equipements.add(eq.selectedArticleName);
      });
    });
    return Array.from(equipements).sort();
  }, [allLicencies]);

  const filteredLicencies = useMemo(() => {
    return allLicencies.filter(licencie => {
      const packMatch = packFilter ? licencie.packChoisi === packFilter : true;
      const categoryMatch = categoryFilter ? licencie.categorie === categoryFilter : true;
      const equipementMatch = equipementFilter 
        ? licencie.equipementAttribué?.some(eq => eq.selectedArticleName === equipementFilter) 
        : true;
      return packMatch && categoryMatch && equipementMatch;
    });
  }, [allLicencies, packFilter, categoryFilter, equipementFilter]);

  const resetFilters = () => {
    setPackFilter('');
    setCategoryFilter('');
    setEquipementFilter('');
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement des données d'équipement attribué...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/data">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour au Module Data</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Données des Équipements Attribués</h1>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 items-end">
        <div className="space-y-1">
          <label htmlFor="packFilter" className="text-sm font-medium">Filtrer par Pack</label>
          <Select 
            value={packFilter} 
            onValueChange={(value) => setPackFilter(value === ALL_PACKS_VALUE ? '' : value)}
          >
            <SelectTrigger id="packFilter">
              <SelectValue placeholder="Tous les packs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PACKS_VALUE}>Tous les packs</SelectItem>
              {INITIAL_PACK_OPTIONS.map(pack => (
                <SelectItem key={pack} value={pack}>{formatPackForDisplay(pack)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label htmlFor="categoryFilter" className="text-sm font-medium">Filtrer par Catégorie</label>
          <Select 
            value={categoryFilter} 
            onValueChange={(value) => setCategoryFilter(value === ALL_CATEGORIES_VALUE ? '' : value)}
          >
            <SelectTrigger id="categoryFilter">
              <SelectValue placeholder="Toutes les catégories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES_VALUE}>Toutes les catégories</SelectItem>
              {uniqueCategories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label htmlFor="equipementFilter" className="text-sm font-medium">Filtrer par Équipement</label>
          <Select 
            value={equipementFilter} 
            onValueChange={(value) => setEquipementFilter(value === ALL_EQUIPEMENTS_VALUE ? '' : value)}
          >
            <SelectTrigger id="equipementFilter">
              <SelectValue placeholder="Tous les équipements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_EQUIPEMENTS_VALUE}>Tous les équipements</SelectItem>
              {uniqueEquipementsAttribues.map(eq => (
                <SelectItem key={eq} value={eq}>{eq}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={resetFilters} variant="outline" className="md:col-start-3 lg:col-start-4">Réinitialiser les filtres</Button>
      </div>
      
      {filteredLicencies.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Nom</TableHead>
                <TableHead className="py-2 px-4">Prénom</TableHead>
                <TableHead className="py-2 px-4">Catégorie</TableHead>
                <TableHead className="py-2 px-4 text-center">Pack</TableHead>
                <TableHead className="py-2 px-4">Équipements Attribués</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLicencies.map((licencie) => (
                <TableRow key={licencie.id}>
                  <TableCell className="py-2 px-4 font-medium">{licencie.nom}</TableCell>
                  <TableCell className="py-2 px-4">{licencie.prenom}</TableCell>
                  <TableCell className="py-2 px-4">{licencie.categorie}</TableCell>
                  <TableCell className="py-2 px-4 text-center">{formatPackForDisplay(licencie.packChoisi)}</TableCell>
                  <TableCell className="py-2 px-4 text-xs">{formatEquipementAttribue(licencie.equipementAttribué)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          <p>Aucun équipement attribué à afficher pour les filtres sélectionnés.</p>
          <p className="mt-2 text-sm">Les licenciés dont l'équipement a été intégralement attribué apparaîtront ici.</p>
        </div>
      )}
    </div>
  );
}
