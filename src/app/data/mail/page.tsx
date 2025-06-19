
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Trash2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
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
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PendingEmail } from '@/app/inscription/paiement/page'; 
import { ViewEmailModal } from '@/components/mails/view-email-modal'; 
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

const PENDING_EMAILS_STORAGE_KEY = 'TRAPEL_FC_PENDING_EMAILS_DATA';
const ALL_SOURCES_VALUE = "__ALL_SOURCES__";

type StoredPendingEmail = Omit<PendingEmail, 'datePreparation'> & {
  datePreparation: string;
};

const getEmailsFromStorage = (): PendingEmail[] => {
  if (typeof window === 'undefined') return [];
  const storedData = localStorage.getItem(PENDING_EMAILS_STORAGE_KEY);
  if (storedData) {
    try {
      const items = JSON.parse(storedData) as StoredPendingEmail[];
      return items.map(item => ({
        ...item,
        datePreparation: item.datePreparation, 
      }));
    } catch (error) {
      console.error("Error parsing emails from localStorage:", error);
      return [];
    }
  }
  return [];
};

const saveEmailsToStorage = (emails: PendingEmail[]) => {
  if (typeof window === 'undefined') return;
  const emailsToStore: StoredPendingEmail[] = emails.map(email => ({
    ...email,
    datePreparation: email.datePreparation,
  }));
  localStorage.setItem(PENDING_EMAILS_STORAGE_KEY, JSON.stringify(emailsToStore));
  window.dispatchEvent(new StorageEvent('storage', { key: PENDING_EMAILS_STORAGE_KEY, newValue: JSON.stringify(emailsToStore) }));
};

export default function DataMailPage() {
  const [allEmails, setAllEmails] = useState<PendingEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<PendingEmail | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<PendingEmail | null>(null);
  const { toast } = useToast();
  const [sourceFilter, setSourceFilter] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);
    const emails = getEmailsFromStorage();
    setAllEmails(emails.sort((a,b) => parseISO(b.datePreparation).getTime() - parseISO(a.datePreparation).getTime()));
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === PENDING_EMAILS_STORAGE_KEY) {
        const updatedEmails = getEmailsFromStorage();
        setAllEmails(updatedEmails.sort((a,b) => parseISO(b.datePreparation).getTime() - parseISO(a.datePreparation).getTime()));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const sentEmails = useMemo(() => {
    return allEmails.filter(email => email.status === 'envoye');
  }, [allEmails]);

  const uniqueSources = useMemo(() => {
    const sources = new Set(
        sentEmails
            .filter(e => e.source && e.source.trim() !== '')
            .map(email => email.source)
    );
    return Array.from(sources).sort();
  }, [sentEmails]);

  const filteredSentEmails = useMemo(() => {
    return sentEmails
      .filter(email => sourceFilter ? email.source === sourceFilter : true);
  }, [sentEmails, sourceFilter]);

  const handleViewEmail = (email: PendingEmail) => {
    setSelectedEmail(email);
    setIsViewModalOpen(true);
  };

  const requestDeleteEmail = (email: PendingEmail) => {
    setEmailToDelete(email);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDeleteEmail = () => {
    if (!emailToDelete) return;
    const emails = getEmailsFromStorage();
    const updatedEmails = emails.filter(email => email.id !== emailToDelete.id);
    saveEmailsToStorage(updatedEmails);
    // L'état local sera mis à jour par l'écouteur de storage
    setIsConfirmDeleteOpen(false);
    setEmailToDelete(null);
    toast({ title: "E-mail supprimé de l'historique", description: `L'e-mail pour ${emailToDelete.licenciePrenom} ${emailToDelete.licencieNom} a été supprimé.` });
  };

  const formatDateForDisplay = (isoDate: string) => {
    try {
      return format(parseISO(isoDate), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch (e) {
      return 'Date invalide';
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement de l'historique des e-mails...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/data">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour au Module Data</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Historique des E-mails Envoyés</h1>
        </div>
         <div className="w-[200px]">
            <Select 
              value={sourceFilter} 
              onValueChange={(value) => setSourceFilter(value === ALL_SOURCES_VALUE ? '' : value)}
            >
              <SelectTrigger id="sourceFilter">
                <SelectValue placeholder="Filtrer par source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SOURCES_VALUE}>Toutes les sources</SelectItem>
                {uniqueSources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
      </div>

      {filteredSentEmails.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Destinataire</TableHead>
                <TableHead className="py-2 px-4">Source</TableHead>
                <TableHead className="py-2 px-4">Sujet</TableHead>
                <TableHead className="py-2 px-4 text-center">Envoyé le (Préparé)</TableHead>
                <TableHead className="text-right py-2 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSentEmails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell className="py-2 px-4 font-medium">
                    {email.licenciePrenom} {email.licencieNom}
                    {email.licencieEmail && <span className="block text-xs text-muted-foreground">{email.licencieEmail}</span>}
                  </TableCell>
                  <TableCell className="py-2 px-4">{email.source}</TableCell>
                  <TableCell className="py-2 px-4">{email.sujet}</TableCell>
                  <TableCell className="py-2 px-4 text-center">{formatDateForDisplay(email.datePreparation)}</TableCell>
                  <TableCell className="py-2 px-4 text-right space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEmail(email)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Voir
                    </Button>
                     <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteEmail(email)}
                      aria-label={`Supprimer l'historique de l'e-mail pour ${email.licenciePrenom} ${email.licencieNom}`}
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
        <div className="text-center text-muted-foreground py-8">
          <p>Aucun e-mail envoyé à afficher pour le filtre sélectionné.</p>
        </div>
      )}

      {selectedEmail && (
        <ViewEmailModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedEmail(null);
          }}
          email={selectedEmail}
          onMarkAsSent={() => {}} // Pas d'action de "marquer comme envoyé" ici
          isReadOnly={true} // Mode lecture seule
        />
      )}

      {emailToDelete && (
        <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer cet e-mail de l'historique ? Ceci est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteEmail} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
