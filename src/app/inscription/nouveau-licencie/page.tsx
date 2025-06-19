
'use client';

import Link from 'next/link';
import { useState, useEffect, type Key } from 'react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LicencieFormModal, type NewLicencieData } from '@/components/inscription/add-licencie-modal';
import { ArrowLeft, PlusCircle, Trash2, Edit3 } from 'lucide-react';
import { format, isValid, parseISO, differenceInYears } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { AttributedEquipement } from '@/config/stock-constants';
import { REFERENCE_YEAR } from '@/config/licencies-constants'; // Import REFERENCE_YEAR

export interface PaiementDetails {
  packOriginal: string;
  montantPackOriginal: number;
  licenceAvecDon?: boolean;
  enfantEducateur?: boolean;
  reductionFratrie?: boolean;
  nombreEnfantsFratrie?: number;
  passSport?: boolean;
  codePassSport?: string;
  carteVillemoustoussou?: boolean;
  codeCarteVillemoustoussou?: string;
  statutPaiement: 'En attente' | 'Partiel' | 'Payé' | 'Non payé';
  montantPayePartiel?: number;
  methodePaiement?: 'CB' | 'Chèque' | 'Espèces' | 'Virement' | 'Autre';
  autreMethodePaiement?: string;
  datePaiement?: Date;
  commentaires?: string;
  montantTotalDu: number;
}

export interface LicencieItem {
  id: string;
  nom: string;
  prenom: string;
  sexe: 'Masculin' | 'Féminin' | 'Autre';
  dateNaissance: Date;
  lieuNaissance?: string;
  lieuNaissanceEtranger?: boolean;
  categorie: string;
  packChoisi: string;
  telephone?: string;
  email?: string;
  packValide: boolean;
  responsableLegal?: {
    nom: string;
    prenom: string;
    dateNaissance: Date;
    lieuNaissance?: string;
    lieuNaissanceEtranger?: boolean;
    email: string;
    telPere: string;
    telMere: string;
  };
  paiement?: PaiementDetails;
  equipementAttribué?: AttributedEquipement[];
  statutEquipement?: 'En attente' | 'Incomplet' | 'Complet';
}

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

const LICENCIES_STORAGE_KEY = 'TRAPEL_FC_LICENCIES_DATA';

export const getLicenciesFromStorage = (): LicencieItem[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(LICENCIES_STORAGE_KEY);
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
        statutEquipement: item.statutEquipement || 'En attente',
      }));
    } catch (error) {
      console.error("Error parsing licencies data from localStorage:", error);
      return [];
    }
  }
  return [];
};

export const saveLicenciesToStorage = (licencies: LicencieItem[]) => {
  if (typeof window === 'undefined') return;
  const licenciesToStore: StoredLicencieItem[] = licencies.map(licencie => ({
    ...licencie,
    dateNaissance: licencie.dateNaissance.toISOString(),
    responsableLegal: licencie.responsableLegal ? {
      ...licencie.responsableLegal,
      dateNaissance: licencie.responsableLegal.dateNaissance.toISOString(),
    } : undefined,
    paiement: licencie.paiement ? {
      ...licencie.paiement,
      datePaiement: licencie.paiement.datePaiement ? licencie.paiement.datePaiement.toISOString() : undefined,
    } : undefined,
    equipementAttribué: licencie.equipementAttribué || [],
    statutEquipement: licencie.statutEquipement,
  }));
  localStorage.setItem(LICENCIES_STORAGE_KEY, JSON.stringify(licenciesToStore));
};

export const estLicencieComplet = (licencie: Omit<LicencieItem, 'id' | 'packValide' | 'paiement' | 'equipementAttribué' | 'statutEquipement'>): boolean => {
  if (!licencie.nom || !licencie.prenom || !licencie.sexe || !licencie.dateNaissance || !licencie.categorie || !licencie.packChoisi) {
    return false;
  }
  if (!licencie.lieuNaissance || !licencie.telephone || !licencie.email) {
    return false;
  }
  const isMinor = differenceInYears(new Date(), licencie.dateNaissance) < 18;
  if (isMinor) {
    if (!licencie.responsableLegal) return false;
    const rl = licencie.responsableLegal;
    if (!rl.nom || !rl.prenom || !rl.dateNaissance || !rl.email) {
      return false;
    }
    if (!rl.telPere && !rl.telMere) {
      return false;
    }
  }
  return true;
};

export default function GestionLicenciesPage() {
  const [licencies, setLicencies] = useState<LicencieItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [licencieToDelete, setLicencieToDelete] = useState<LicencieItem | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [isLicencieFormModalOpen, setIsLicencieFormModalOpen] = useState(false);
  const [licencieEnEdition, setLicencieEnEdition] = useState<LicencieItem | null>(null);

  const sortLicenciesForAccueil = (licenciesList: LicencieItem[]): LicencieItem[] => {
    return licenciesList.sort((a, b) => {
      if (!a.packValide && b.packValide) return -1;
      if (a.packValide && !b.packValide) return 1;
      const nomCompare = a.nom.localeCompare(b.nom);
      if (nomCompare !== 0) return nomCompare;
      return a.prenom.localeCompare(b.prenom);
    });
  };

  useEffect(() => {
    setIsLoading(true);
    const storedLicencies = getLicenciesFromStorage();
    if (storedLicencies.length === 0) {
        const initialLicenciesData = [
          { nom: 'Dupont', prenom: 'Jean', sexe: 'Masculin', dateNaissance: new Date('2006-05-15'), lieuNaissance: 'Paris', packChoisi: 'Pack 4 - 190€', telephone: '0612345678', email: 'jean.dupont@email.com', categorie: 'Seniors G' },
          { nom: 'Martin', prenom: 'Alice', sexe: 'Féminin', dateNaissance: new Date('2015-08-20'), lieuNaissance: 'Lyon', packChoisi: 'Loisir - 50€', telephone: '0687654321', email: 'alice.martin@email.com', responsableLegal: { nom: 'Martin', prenom: 'Luc', dateNaissance: new Date('1980-01-01'), lieuNaissance: 'Lyon', lieuNaissanceEtranger: false, email: 'luc.martin@email.com', telPere: '0600000001', telMere: '0600000002' }, categorie: 'U10-U11 F' },
          { nom: 'Durand', prenom: 'Paul', sexe: 'Masculin', dateNaissance: new Date('2008-11-01'), lieuNaissance: 'Marseille', packChoisi: 'Pack 3 - 160€', telephone: '0611223344', email: '' /* Email manquant -> Incomplet */, categorie: 'U18-U19 G' },
        ];
        const initialLicencies = initialLicenciesData.map(l => {
            const baseLicencie = l as Omit<LicencieItem, 'id' | 'packValide' | 'paiement' | 'equipementAttribué' | 'statutEquipement'>;
            return {
                ...baseLicencie,
                id: crypto.randomUUID(),
                packValide: estLicencieComplet(baseLicencie),
                equipementAttribué: [],
                statutEquipement: 'En attente',
            };
        });
        setLicencies(sortLicenciesForAccueil(initialLicencies));
        saveLicenciesToStorage(initialLicencies);
    } else {
        setLicencies(sortLicenciesForAccueil(storedLicencies.map(l => ({...l, equipementAttribué: l.equipementAttribué || [], statutEquipement: l.statutEquipement || 'En attente' }))));
    }
    setIsLoading(false);
  }, []);

  const handleAddLicencieClick = () => {
    setLicencieEnEdition(null);
    setIsLicencieFormModalOpen(true);
  };

  const handleEditLicencieClick = (licencie: LicencieItem) => {
    setLicencieEnEdition(licencie);
    setIsLicencieFormModalOpen(true);
  };

  const handleSaveLicencieData = (data: NewLicencieData) => {
    const isMinor = data.dateNaissance ? differenceInYears(new Date(), data.dateNaissance) < 18 : false;

    const licencieDataItem: Omit<LicencieItem, 'id' | 'packValide' | 'paiement' | 'equipementAttribué' | 'statutEquipement'> = {
      nom: data.nom,
      prenom: data.prenom,
      sexe: data.sexe,
      dateNaissance: data.dateNaissance,
      lieuNaissance: data.lieuNaissance,
      lieuNaissanceEtranger: data.lieuNaissanceEtranger,
      categorie: data.categorie,
      packChoisi: data.packChoisi,
      telephone: data.telephone,
      email: data.email,
      responsableLegal: isMinor && data.responsableLegalNom && data.responsableLegalPrenom && data.responsableLegalDateNaissance && data.responsableLegalEmail && (data.responsableLegalTelPere || data.responsableLegalTelMere) ? {
        nom: data.responsableLegalNom,
        prenom: data.responsableLegalPrenom,
        dateNaissance: data.responsableLegalDateNaissance,
        lieuNaissance: data.responsableLegalLieuNaissance || '',
        lieuNaissanceEtranger: data.responsableLegalLieuNaissanceEtranger,
        email: data.responsableLegalEmail,
        telPere: data.responsableLegalTelPere!,
        telMere: data.responsableLegalTelMere!,
      } : undefined,
    };

    const isComplet = estLicencieComplet(licencieDataItem);

    let updatedLicencies;
    if (licencieEnEdition) {
      updatedLicencies = licencies.map(l =>
        l.id === licencieEnEdition.id ? { ...licencieEnEdition, ...licencieDataItem, packValide: isComplet, equipementAttribué: l.equipementAttribué || [], statutEquipement: l.statutEquipement || 'En attente' } : l
      );
    } else {
      const newLicencie: LicencieItem = {
        ...licencieDataItem,
        id: crypto.randomUUID(),
        packValide: isComplet,
        paiement: undefined,
        equipementAttribué: [],
        statutEquipement: 'En attente',
      };
      updatedLicencies = [...licencies, newLicencie];
    }

    const sortedLicencies = sortLicenciesForAccueil(updatedLicencies);
    setLicencies(sortedLicencies);
    saveLicenciesToStorage(sortedLicencies);
    setIsLicencieFormModalOpen(false);
    setLicencieEnEdition(null);
  };

  const requestDeleteLicencie = (licencie: LicencieItem) => {
    setLicencieToDelete(licencie);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteLicencie = () => {
    if (licencieToDelete) {
      const updatedLicencies = licencies.filter(l => l.id !== licencieToDelete.id);
      setLicencies(sortLicenciesForAccueil(updatedLicencies));
      saveLicenciesToStorage(updatedLicencies);
      console.log('Licencié supprimé ID:', licencieToDelete.id);
    }
    setIsConfirmDeleteDialogOpen(false);
    setLicencieToDelete(null);
  };

  const cancelDeleteLicencie = () => {
    setIsConfirmDeleteDialogOpen(false);
    setLicencieToDelete(null);
  };

  const formatDateForDisplay = (date: Date | undefined): string => {
    if (!date) return 'N/A';
    if (!isValid(date)) return 'Date invalide';
    return format(date, 'dd/MM/yyyy', { locale: fr });
  };

  const formatPackForDisplay = (packChoisi: string): string => {
    if (!packChoisi) return 'N/A';
    return packChoisi.split(' - ')[0];
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement des licenciés...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/inscription">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour aux Inscriptions</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Gestion des Licenciés</h1>
        </div>
        <Button onClick={handleAddLicencieClick}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un licencié
        </Button>
      </div>

      <div className="rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2 px-4">Nom</TableHead>
              <TableHead className="py-2 px-4">Prénom</TableHead>
              <TableHead className="py-2 px-4 text-center">Sexe</TableHead>
              <TableHead className="py-2 px-4 text-center">Catégorie</TableHead>
              <TableHead className="py-2 px-4 text-center">Pack</TableHead>
              <TableHead className="py-2 px-4 text-center">État</TableHead>
              <TableHead className="text-right py-2 px-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {licencies.map((licencie) => (
              <TableRow key={licencie.id}>
                <TableCell className="py-2 px-4 font-medium">{licencie.nom}</TableCell>
                <TableCell className="py-2 px-4">{licencie.prenom}</TableCell>
                <TableCell className="py-2 px-4 text-center">{licencie.sexe}</TableCell>
                <TableCell className="py-2 px-4 text-center">{licencie.categorie}</TableCell>
                <TableCell className="py-2 px-4 text-center">{formatPackForDisplay(licencie.packChoisi)}</TableCell>
                <TableCell className={cn(
                    "py-2 px-4 text-center",
                    licencie.packValide ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                  )}
                >
                  <span className="px-2 py-1 text-xs font-semibold rounded-full">
                    {licencie.packValide ? 'Complet' : 'Incomplet'}
                  </span>
                </TableCell>
                <TableCell className="py-2 px-4 text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditLicencieClick(licencie)}
                    aria-label={`Modifier ${licencie.prenom} ${licencie.nom}`}
                    className="mr-2"
                  >
                    <Edit3 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => requestDeleteLicencie(licencie)}
                    aria-label={`Supprimer ${licencie.prenom} ${licencie.nom}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {licencies.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Aucun licencié à afficher. Cliquez sur "Ajouter un licencié" pour commencer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {licencieToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer le licencié "{licencieToDelete.prenom} {licencieToDelete.nom}" ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDeleteLicencie}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteLicencie} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <LicencieFormModal
        isOpen={isLicencieFormModalOpen}
        onClose={() => {
            setIsLicencieFormModalOpen(false);
            setLicencieEnEdition(null);
        }}
        onSave={handleSaveLicencieData}
        initialData={licencieEnEdition}
      />
    </div>
  );
}
