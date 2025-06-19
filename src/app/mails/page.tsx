
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, Send, MailWarning, Trash2 } from 'lucide-react';
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

const getPendingEmailsFromStorage = (): PendingEmail[] => {
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
      console.error("Error parsing pending emails from localStorage:", error);
      return [];
    }
  }
  return [];
};

const savePendingEmailsToStorage = (emails: PendingEmail[]) => {
  if (typeof window === 'undefined') return;
  const emailsToStore: StoredPendingEmail[] = emails.map(email => ({
    ...email,
    datePreparation: email.datePreparation,
  }));
  localStorage.setItem(PENDING_EMAILS_STORAGE_KEY, JSON.stringify(emailsToStore));
  window.dispatchEvent(new StorageEvent('storage', { key: PENDING_EMAILS_STORAGE_KEY, newValue: JSON.stringify(emailsToStore) })); // Dispatch event
};

export default function MailsPage() {
  const [allPendingEmails, setAllPendingEmails] = useState<PendingEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<PendingEmail | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isConfirmSendAllOpen, setIsConfirmSendAllOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<PendingEmail | null>(null);
  const { toast } = useToast();
  const [sourceFilter, setSourceFilter] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);
    const emails = getPendingEmailsFromStorage();
    setAllPendingEmails(emails.sort((a,b) => parseISO(b.datePreparation).getTime() - parseISO(a.datePreparation).getTime()));
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === PENDING_EMAILS_STORAGE_KEY) {
        const updatedEmails = getPendingEmailsFromStorage();
        setAllPendingEmails(updatedEmails.sort((a,b) => parseISO(b.datePreparation).getTime() - parseISO(a.datePreparation).getTime()));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const uniqueSources = useMemo(() => {
    const sources = new Set(
        allPendingEmails
            .filter(e => e.status === 'en_attente' && e.source && e.source.trim() !== '')
            .map(email => email.source)
    );
    return Array.from(sources).sort();
  }, [allPendingEmails]);

  const filteredEmails = useMemo(() => {
    return allPendingEmails
      .filter(email => email.status === 'en_attente')
      .filter(email => sourceFilter ? email.source === sourceFilter : true);
  }, [allPendingEmails, sourceFilter]);

  const handleViewEmail = (email: PendingEmail) => {
    setSelectedEmail(email);
    setIsViewModalOpen(true);
  };

  const handleModalCloseAndToast = (emailId: string, savedEmail: PendingEmail) => {
    setIsViewModalOpen(false);
    setSelectedEmail(null);
    toast({ title: "E-mail Sauvegardé et Marqué comme Envoyé", 
            description: `L'e-mail pour ${savedEmail.licenciePrenom} ${savedEmail.licencieNom} a été mis à jour.` });
  };

  const requestSendAllPendingEmails = () => {
    if (filteredEmails.length === 0) {
      toast({ title: "Aucun e-mail", description: "Il n'y a aucun e-mail en attente à envoyer pour le filtre actuel.", variant: "default" });
      return;
    }
    setIsConfirmSendAllOpen(true);
  };

  const confirmSendAllPendingEmails = () => {
    const emails = getPendingEmailsFromStorage();
    let count = 0;
    const updatedEmails = emails.map(email => {
      if (email.status === 'en_attente' && (sourceFilter ? email.source === sourceFilter : true)) {
        count++;
        return { ...email, status: 'envoye' as 'envoye' };
      }
      return email;
    });
    savePendingEmailsToStorage(updatedEmails);
    // L'état local sera mis à jour par l'écouteur de storage.
    setIsConfirmSendAllOpen(false);
    toast({ title: "Envoi en masse (simulé)", description: `${count} e-mail(s) marqué(s) comme envoyé(s) pour le filtre actuel.` });
  };

  const requestDeleteEmail = (email: PendingEmail) => {
    setEmailToDelete(email);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDeleteEmail = () => {
    if (!emailToDelete) return;
    const emails = getPendingEmailsFromStorage();
    const updatedEmails = emails.filter(email => email.id !== emailToDelete.id);
    savePendingEmailsToStorage(updatedEmails);
    // L'état local sera mis à jour par l'écouteur de storage
    setIsConfirmDeleteOpen(false);
    setEmailToDelete(null);
    toast({ title: "E-mail supprimé", description: `L'e-mail pour ${emailToDelete.licenciePrenom} ${emailToDelete.licencieNom} a été supprimé.` });
  };

  const formatDateForDisplay = (isoDate: string) => {
    try {
      return format(parseISO(isoDate), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch (e) {
      return 'Date invalide';
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement des e-mails en attente...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="outline" size="icon" asChild className="mr-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour au Menu Principal</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">E-mails en Attente d'Envoi</h1>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-[200px]">
            <Select 
              value={sourceFilter} 
              onValueChange={(value) => setSourceFilter(value === ALL_SOURCES_VALUE ? '' : value)}
            >
              <SelectTrigger id="sourceFilter">
                <SelectValue placeholder="Toutes les sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SOURCES_VALUE}>Toutes les sources</SelectItem>
                {uniqueSources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={requestSendAllPendingEmails} variant="outline" disabled={filteredEmails.length === 0}>
            <MailWarning className="mr-2 h-4 w-4" />
            Envoyer Filtrés (Simulé)
          </Button>
        </div>
      </div>

      {filteredEmails.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Destinataire</TableHead>
                <TableHead className="py-2 px-4">Source</TableHead>
                <TableHead className="py-2 px-4">Sujet</TableHead>
                <TableHead className="py-2 px-4 text-center">Préparé le</TableHead>
                <TableHead className="py-2 px-4 text-center">Statut</TableHead>
                <TableHead className="text-right py-2 px-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmails.map((email) => (
                <TableRow key={email.id}>
                  <TableCell className="py-2 px-4 font-medium">
                    {email.licenciePrenom} {email.licencieNom}
                    {email.licencieEmail && <span className="block text-xs text-muted-foreground">{email.licencieEmail}</span>}
                  </TableCell>
                  <TableCell className="py-2 px-4">{email.source}</TableCell>
                  <TableCell className="py-2 px-4">{email.sujet}</TableCell>
                  <TableCell className="py-2 px-4 text-center">{formatDateForDisplay(email.datePreparation)}</TableCell>
                  <TableCell className="py-2 px-4 text-center">
                     <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        En attente
                     </span>
                  </TableCell>
                  <TableCell className="py-2 px-4 text-right space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEmail(email)}
                    >
                      <Eye className="mr-1 h-3 w-3" />
                      Modifier/Envoyer
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteEmail(email)}
                      aria-label={`Supprimer e-mail pour ${email.licenciePrenom} ${email.licencieNom}`}
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
          <p>Aucun e-mail en attente d'envoi pour le filtre sélectionné.</p>
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
          onMarkAsSent={(emailId) => handleModalCloseAndToast(emailId, selectedEmail!)}
        />
      )}

      <AlertDialog open={isConfirmSendAllOpen} onOpenChange={setIsConfirmSendAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'envoi en masse</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment marquer tous les e-mails en attente ({filteredEmails.length}) pour le filtre actuel comme envoyés ? Cette action est simulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsConfirmSendAllOpen(false)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSendAllPendingEmails} className="bg-blue-600 hover:bg-blue-700">
              Oui, marquer comme envoyés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {emailToDelete && (
        <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer l'e-mail en attente pour {emailToDelete.licenciePrenom} {emailToDelete.licencieNom} ?
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

