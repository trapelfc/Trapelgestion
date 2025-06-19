
'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, Eye } from 'lucide-react';
import type { LicencieItem, PaiementDetails } from '@/app/inscription/nouveau-licencie/page';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LicencieDetailModal } from '@/components/data/licencie-detail-modal';

type StoredLicencieItem = Omit<LicencieItem, 'dateNaissance' | 'responsableLegal' | 'paiement'> & {
  dateNaissance: string;
  responsableLegal?: Omit<NonNullable<LicencieItem['responsableLegal']>, 'dateNaissance'> & {
    dateNaissance: string;
  };
  paiement?: Omit<PaiementDetails, 'datePaiement'> & {
    datePaiement?: string;
  };
};

const DATA_PAIEMENTS_COMPLETS_STORAGE_KEY = 'TRAPEL_FC_DATA_PAIEMENTS_COMPLETS_DATA';
const ALL_CATEGORIES_VALUE = "__ALL_CATEGORIES__";
const ALL_METHODES_VALUE = "__ALL_METHODES__";
const ALL_DATES_VALUE = "__ALL_DATES__";

const getLicenciesDataPaiementsCompletsFromStorage = (): LicencieItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(DATA_PAIEMENTS_COMPLETS_STORAGE_KEY);
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
      }));
    } catch (error) {
      console.error("Error parsing data paiements complets from localStorage:", error);
      return [];
    }
  }
  return [];
};

const formatDateForDisplay = (date: Date | undefined): string => {
  if (!date || !isValid(date)) return 'N/A';
  return format(date, 'dd/MM/yyyy', { locale: fr });
};

const formatPackForDisplay = (packChoisi?: string): string => {
  if (!packChoisi) return 'N/A';
  return packChoisi.split(' - ')[0];
};

export default function DataPaiementPage() {
  const [allPaiements, setAllPaiements] = useState<LicencieItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [methodePaiementFilter, setMethodePaiementFilter] = useState<string>('');
  const [datePaiementFilter, setDatePaiementFilter] = useState<string>('');
  const [selectedLicencieForDetails, setSelectedLicencieForDetails] = useState<LicencieItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const storedPaiements = getLicenciesDataPaiementsCompletsFromStorage();
    const sortedPaiements = storedPaiements.sort((a, b) => {
        const nomCompare = a.nom.localeCompare(b.nom);
        if (nomCompare !== 0) return nomCompare;
        return a.prenom.localeCompare(b.prenom);
    });
    setAllPaiements(sortedPaiements);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === DATA_PAIEMENTS_COMPLETS_STORAGE_KEY) {
        const storedPaiements = getLicenciesDataPaiementsCompletsFromStorage();
        const sortedPaiements = storedPaiements.sort((a, b) => {
            const nomCompare = a.nom.localeCompare(b.nom);
            if (nomCompare !== 0) return nomCompare;
            return a.prenom.localeCompare(b.prenom);
        });
        setAllPaiements(sortedPaiements);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const uniqueCategories = useMemo(() => {
    const categories = new Set(allPaiements.map(l => l.categorie));
    return Array.from(categories).sort();
  }, [allPaiements]);

  const uniqueMethodesPaiement = useMemo(() => {
    const methodes = new Set<string>();
    allPaiements.forEach(l => {
      if (l.paiement) {
        const methode = l.paiement.methodePaiement === 'Autre' 
          ? l.paiement.autreMethodePaiement || 'Autre (non précisé)'
          : l.paiement.methodePaiement;
        if (methode) methodes.add(methode);
      }
    });
    return Array.from(methodes).sort();
  }, [allPaiements]);

  const uniqueDatesPaiement = useMemo(() => {
    const dates = new Set<string>();
    allPaiements.forEach(l => {
      if (l.paiement?.datePaiement && isValid(l.paiement.datePaiement)) {
        dates.add(formatDateForDisplay(l.paiement.datePaiement));
      }
    });
    return Array.from(dates).sort((a, b) => {
      const dateA = parseISO(a.split('/').reverse().join('-'));
      const dateB = parseISO(b.split('/').reverse().join('-'));
      if (isValid(dateA) && isValid(dateB)) return dateA.getTime() - dateB.getTime();
      return a.localeCompare(b);
    });
  }, [allPaiements]);

  const filteredPaiements = useMemo(() => {
    return allPaiements.filter(licencie => {
      const categoryMatch = categoryFilter ? licencie.categorie === categoryFilter : true;
      
      let methodeMatch = true;
      if (methodePaiementFilter) {
        const licencieMethode = licencie.paiement?.methodePaiement === 'Autre'
          ? licencie.paiement?.autreMethodePaiement || 'Autre (non précisé)'
          : licencie.paiement?.methodePaiement;
        methodeMatch = licencieMethode === methodePaiementFilter;
      }
      
      const dateMatch = datePaiementFilter 
        ? formatDateForDisplay(licencie.paiement?.datePaiement) === datePaiementFilter 
        : true;
        
      return categoryMatch && methodeMatch && dateMatch;
    });
  }, [allPaiements, categoryFilter, methodePaiementFilter, datePaiementFilter]);

  const resetFilters = () => {
    setCategoryFilter('');
    setMethodePaiementFilter('');
    setDatePaiementFilter('');
  };

  const handleViewDetails = (licencie: LicencieItem) => {
    setSelectedLicencieForDetails(licencie);
    setIsDetailModalOpen(true);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement des données de paiement...</div>;
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
        <h1 className="text-2xl font-bold">Données des Paiements Complétés</h1>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 items-end">
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
          <label htmlFor="methodePaiementFilter" className="text-sm font-medium">Filtrer par Méthode</label>
          <Select 
            value={methodePaiementFilter} 
            onValueChange={(value) => setMethodePaiementFilter(value === ALL_METHODES_VALUE ? '' : value)}
          >
            <SelectTrigger id="methodePaiementFilter">
              <SelectValue placeholder="Toutes les méthodes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_METHODES_VALUE}>Toutes les méthodes</SelectItem>
              {uniqueMethodesPaiement.map(methode => (
                <SelectItem key={methode} value={methode}>{methode}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <label htmlFor="datePaiementFilter" className="text-sm font-medium">Filtrer par Date</label>
          <Select 
            value={datePaiementFilter} 
            onValueChange={(value) => setDatePaiementFilter(value === ALL_DATES_VALUE ? '' : value)}
          >
            <SelectTrigger id="datePaiementFilter">
              <SelectValue placeholder="Toutes les dates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DATES_VALUE}>Toutes les dates</SelectItem>
              {uniqueDatesPaiement.map(dateStr => (
                <SelectItem key={dateStr} value={dateStr}>{dateStr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={resetFilters} variant="outline" className="md:col-start-3 lg:col-start-4">Réinitialiser les filtres</Button>
      </div>
      
      {filteredPaiements.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Nom</TableHead>
                <TableHead className="py-2 px-4">Prénom</TableHead>
                <TableHead className="py-2 px-4">Catégorie</TableHead>
                <TableHead className="py-2 px-4 text-center">Pack</TableHead>
                <TableHead className="py-2 px-4 text-center">Méthode</TableHead>
                <TableHead className="py-2 px-4 text-center">Date Paiement</TableHead>
                <TableHead className="py-2 px-4 text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPaiements.map((licencie) => (
                <TableRow key={licencie.id}>
                  <TableCell className="py-2 px-4 font-medium">{licencie.nom}</TableCell>
                  <TableCell className="py-2 px-4">{licencie.prenom}</TableCell>
                  <TableCell className="py-2 px-4">{licencie.categorie}</TableCell>
                  <TableCell className="py-2 px-4 text-center">{formatPackForDisplay(licencie.packChoisi)}</TableCell>
                  <TableCell className="py-2 px-4 text-center">
                    {licencie.paiement?.methodePaiement === 'Autre' 
                      ? licencie.paiement?.autreMethodePaiement 
                      : licencie.paiement?.methodePaiement ?? 'N/A'}
                  </TableCell>
                  <TableCell className="py-2 px-4 text-center">{formatDateForDisplay(licencie.paiement?.datePaiement)}</TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(licencie)}
                      aria-label={`Voir détails pour ${licencie.prenom} ${licencie.nom}`}
                    >
                      <Eye className="h-4 w-4 text-blue-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-8">
          <p>Aucun paiement complété à afficher pour les filtres sélectionnés.</p>
          <p className="mt-2 text-sm">Les licenciés dont le dossier est complet et le paiement intégralement soldé apparaîtront ici.</p>
        </div>
      )}

      {selectedLicencieForDetails && (
        <LicencieDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedLicencieForDetails(null);
          }}
          licencie={selectedLicencieForDetails}
        />
      )}
    </div>
  );
}
