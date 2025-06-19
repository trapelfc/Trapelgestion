
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { LicencieFormModal, type NewLicencieData } from '@/components/inscription/add-licencie-modal';
import {
  getLicenciesFromStorage,
  saveLicenciesToStorage,
  estLicencieComplet,
  type LicencieItem,
} from '@/app/inscription/nouveau-licencie/page'; // Importation des utilitaires
import { useToast } from '@/hooks/use-toast';

export default function AccueilInvitePage() {
  const [isLicencieFormModalOpen, setIsLicencieFormModalOpen] = useState(false);
  const { toast } = useToast();

  const handleAddLicencieClick = () => {
    setIsLicencieFormModalOpen(true);
  };

  const handleSaveLicencieData = (data: NewLicencieData) => {
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
      responsableLegal: data.isMineur && data.responsableLegalNom && data.responsableLegalPrenom && data.responsableLegalDateNaissance && data.responsableLegalEmail && (data.responsableLegalTelPere || data.responsableLegalTelMere) ? {
        nom: data.responsableLegalNom,
        prenom: data.responsableLegalPrenom,
        dateNaissance: data.responsableLegalDateNaissance,
        lieuNaissance: data.responsableLegalLieuNaissance || '',
        lieuNaissanceEtranger: data.responsableLegalLieuNaissanceEtranger || false,
        email: data.responsableLegalEmail,
        telPere: data.responsableLegalTelPere!,
        telMere: data.responsableLegalTelMere!,
      } : undefined,
    };

    const isComplet = estLicencieComplet(licencieDataItem);

    const newLicencie: LicencieItem = {
      ...licencieDataItem,
      id: crypto.randomUUID(),
      packValide: isComplet,
      paiement: undefined,
      equipementAttribué: [],
      statutEquipement: 'En attente',
    };

    const licenciesActuels = getLicenciesFromStorage();
    const updatedLicencies = [...licenciesActuels, newLicencie];
    
    // Tri optionnel ici si nécessaire, sinon la page principale le fera au chargement
    // const sortedLicencies = updatedLicencies.sort((a, b) => {
    //   if (!a.packValide && b.packValide) return -1;
    //   if (a.packValide && !b.packValide) return 1;
    //   const nomCompare = a.nom.localeCompare(b.nom);
    //   if (nomCompare !== 0) return nomCompare;
    //   return a.prenom.localeCompare(b.prenom);
    // });
    saveLicenciesToStorage(updatedLicencies);
    
    toast({
      title: "Inscription Envoyée",
      description: `${newLicencie.prenom} ${newLicencie.nom} a été ajouté(e). Son dossier est ${isComplet ? 'complet' : 'incomplet'}.`,
      variant: isComplet ? "default" : "destructive", // ou une autre variante pour 'incomplet'
    });

    setIsLicencieFormModalOpen(false);
  };


  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-var(--footer-height)-2rem)]">
      <div className="absolute top-4 left-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/inscription">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour au Module Inscription</span>
          </Link>
        </Button>
      </div>

      <div className="text-center space-y-6">
        <UserPlus className="mx-auto h-24 w-24 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight">Inscription au Club</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Bienvenue ! Cliquez sur le bouton ci-dessous pour commencer votre inscription ou celle d'un nouveau licencié.
        </p>
        <Button size="lg" onClick={handleAddLicencieClick} className="px-8 py-6 text-lg">
          <UserPlus className="mr-2 h-5 w-5" />
          Commencer mon Inscription
        </Button>
      </div>

      <LicencieFormModal
        isOpen={isLicencieFormModalOpen}
        onClose={() => setIsLicencieFormModalOpen(false)}
        onSave={handleSaveLicencieData}
        initialData={null} // Toujours pour un nouveau licencié ici
      />
    </div>
  );
}
