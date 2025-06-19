
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { LicencieItem } from '@/app/inscription/nouveau-licencie/page';
import { format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AttributedEquipement } from '@/config/stock-constants';

interface LicencieDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  licencie: LicencieItem | null;
}

const formatDate = (date: Date | undefined): string => {
  if (!date || !isValid(date)) return 'Non renseigné';
  return format(date, 'dd/MM/yyyy', { locale: fr });
};

const formatPackForDisplay = (packChoisi?: string): string => {
  if (!packChoisi) return 'N/A';
  return packChoisi.split(' - ')[0];
};

const formatEquipementAttribue = (equipements?: AttributedEquipement[]): string => {
  if (!equipements || equipements.length === 0) return 'Aucun équipement attribué';
  return equipements.map(eq => `${eq.selectedArticleName}${eq.size ? ` (${eq.size})` : ''} x${eq.quantity}`).join('; ');
};

export function LicencieDetailModal({ isOpen, onClose, licencie }: LicencieDetailModalProps) {
  if (!licencie) return null;

  const renderDetailLine = (label: string, value?: string | number | boolean | null | Date) => {
    let displayValue: React.ReactNode = 'Non renseigné';
    if (value instanceof Date) {
      displayValue = formatDate(value);
    } else if (typeof value === 'boolean') {
      displayValue = value ? 'Oui' : 'Non';
    } else if (value !== null && value !== undefined && value !== '') {
      displayValue = String(value);
    }

    return (
      <div className="grid grid-cols-3 gap-2 text-sm py-1">
        <span className="font-medium text-muted-foreground col-span-1">{label}:</span>
        <span className="col-span-2">{displayValue}</span>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Détails du Licencié</DialogTitle>
          <DialogDescription>
            Informations complètes pour {licencie.prenom} {licencie.nom}.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0 pr-4 py-2">
          <div className="space-y-3">
            <section>
              <h4 className="font-semibold text-md mb-1">Informations Personnelles</h4>
              {renderDetailLine('Nom', licencie.nom)}
              {renderDetailLine('Prénom', licencie.prenom)}
              {renderDetailLine('Sexe', licencie.sexe)}
              {renderDetailLine('Date de Naissance', licencie.dateNaissance)}
              {renderDetailLine('Lieu de Naissance', licencie.lieuNaissance)}
              {renderDetailLine('Né(e) à l\'étranger', licencie.lieuNaissanceEtranger)}
              {renderDetailLine('Catégorie', licencie.categorie)}
              {renderDetailLine('Pack Choisi', licencie.packChoisi)}
              {renderDetailLine('Téléphone', licencie.telephone)}
              {renderDetailLine('Email', licencie.email)}
              {renderDetailLine('Dossier État', licencie.packValide ? 'Complet' : 'Incomplet')}
            </section>

            {licencie.responsableLegal && (
              <>
                <Separator />
                <section>
                  <h4 className="font-semibold text-md mb-1">Responsable Légal</h4>
                  {renderDetailLine('Nom', licencie.responsableLegal.nom)}
                  {renderDetailLine('Prénom', licencie.responsableLegal.prenom)}
                  {renderDetailLine('Date de Naissance', licencie.responsableLegal.dateNaissance)}
                  {renderDetailLine('Lieu de Naissance', licencie.responsableLegal.lieuNaissance)}
                  {renderDetailLine('Né(e) à l\'étranger', licencie.responsableLegal.lieuNaissanceEtranger)}
                  {renderDetailLine('Email', licencie.responsableLegal.email)}
                  {renderDetailLine('Téléphone Père', licencie.responsableLegal.telPere)}
                  {renderDetailLine('Téléphone Mère', licencie.responsableLegal.telMere)}
                </section>
              </>
            )}

            {licencie.paiement && (
              <>
                <Separator />
                <section>
                  <h4 className="font-semibold text-md mb-1">Détails du Paiement</h4>
                  {renderDetailLine('Pack Original', licencie.paiement.packOriginal)}
                  {renderDetailLine('Montant Pack Original', `${licencie.paiement.montantPackOriginal}€`)}
                  {renderDetailLine('Licence avec Don', licencie.paiement.licenceAvecDon)}
                  {renderDetailLine('Enfant Éducateur', licencie.paiement.enfantEducateur)}
                  {renderDetailLine('Réduction Fratrie', licencie.paiement.reductionFratrie)}
                  {licencie.paiement.reductionFratrie && renderDetailLine('Nb Enfants Fratrie', licencie.paiement.nombreEnfantsFratrie)}
                  {renderDetailLine('Pass Sport', licencie.paiement.passSport)}
                  {licencie.paiement.passSport && renderDetailLine('Code Pass Sport', licencie.paiement.codePassSport)}
                  {renderDetailLine('Carte Villemoustoussou', licencie.paiement.carteVillemoustoussou)}
                  {licencie.paiement.carteVillemoustoussou && renderDetailLine('Code Carte Villemoustoussou', licencie.paiement.codeCarteVillemoustoussou)}
                  {renderDetailLine('Montant Total Dû (après réductions)', `${licencie.paiement.montantTotalDu}€`)}
                  {renderDetailLine('Statut Paiement', licencie.paiement.statutPaiement)}
                  {licencie.paiement.statutPaiement === 'Partiel' && renderDetailLine('Montant Payé (Partiel)', `${licencie.paiement.montantPayePartiel}€`)}
                  {renderDetailLine('Méthode de Paiement', licencie.paiement.methodePaiement === 'Autre' ? licencie.paiement.autreMethodePaiement : licencie.paiement.methodePaiement)}
                  {renderDetailLine('Date de Paiement', licencie.paiement.datePaiement)}
                  {renderDetailLine('Commentaires', licencie.paiement.commentaires)}
                </section>
              </>
            )}

            {licencie.equipementAttribué && licencie.equipementAttribué.length > 0 && (
                <>
                <Separator />
                <section>
                    <h4 className="font-semibold text-md mb-1">Équipement Attribué</h4>
                    <ul className="list-disc list-inside pl-4 text-sm">
                    {licencie.equipementAttribué.map((eq, index) => (
                        <li key={index}>
                        {eq.selectedArticleName}
                        {eq.size ? ` (Taille: ${eq.size})` : ''}
                        {' x'}{eq.quantity}
                        </li>
                    ))}
                    </ul>
                    {renderDetailLine('Statut Équipement', licencie.statutEquipement)}
                </section>
                </>
            )}


          </div>
        </ScrollArea>
        
        <DialogFooter className="pt-4 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

