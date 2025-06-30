
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, Send, Trash2, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PendingEmail } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { deletePendingEmail, sendPendingEmail, sendMultiplePendingEmails } from "@/lib/actions";

export function MailsEnAttenteView({ pendingEmails }: { pendingEmails: PendingEmail[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isViewOpen, setViewOpen] = React.useState(false);
  const [isAlertOpen, setAlertOpen] = React.useState(false);
  const [selectedEmail, setSelectedEmail] = React.useState<PendingEmail | null>(null);
  
  const [selectedEmailIds, setSelectedEmailIds] = React.useState<string[]>([]);
  const [isBatchSending, setIsBatchSending] = React.useState(false);
  const [sendingEmailId, setSendingEmailId] = React.useState<string | null>(null);

  const handleSelectAll = (checked: boolean) => {
    setSelectedEmailIds(checked ? pendingEmails.map(e => e.id) : []);
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedEmailIds(prev =>
      checked ? [...prev, id] : prev.filter(emailId => emailId !== id)
    );
  };
  
  const handleViewClick = (email: PendingEmail) => {
    setSelectedEmail(email);
    setViewOpen(true);
  };

  const handleDeleteClick = (email: PendingEmail) => {
    setSelectedEmail(email);
    setAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedEmail) {
        await deletePendingEmail(selectedEmail.id);
        toast({
            title: "Mail supprimé",
            description: "Le mail en attente a été supprimé.",
            variant: "destructive"
        });
        setAlertOpen(false);
        setSelectedEmail(null);
        router.refresh();
    }
  };

  const handleSendClick = async (email: PendingEmail) => {
    setSendingEmailId(email.id);
    try {
      await sendPendingEmail(email.id);
      toast({
        title: "Mail envoyé !",
        description: `Le mail à ${email.recipientName} a été déplacé dans les archives.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de marquer le mail comme envoyé.",
        variant: "destructive",
      });
    } finally {
        setSendingEmailId(null);
    }
  };
  
  const handleSendSelected = async () => {
    setIsBatchSending(true);
    try {
      await sendMultiplePendingEmails(selectedEmailIds);
      toast({
        title: `${selectedEmailIds.length} mail(s) envoyé(s)`,
        description: "Les mails sélectionnés ont été déplacés dans les archives.",
      });
      setSelectedEmailIds([]);
      router.refresh();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la sélection.",
        variant: "destructive",
      });
    } finally {
      setIsBatchSending(false);
    }
  };

  const isAnyActionLoading = isBatchSending || sendingEmailId !== null;

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="text-3xl font-headline">Mails en attente d'envoi</CardTitle>
                <CardDescription>
                    Cochez les mails à envoyer ou envoyez-les individuellement.
                </CardDescription>
            </div>
            <Button
                onClick={handleSendSelected}
                disabled={selectedEmailIds.length === 0 || isAnyActionLoading}
            >
                {isBatchSending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Send className="mr-2 h-4 w-4" />
                )}
                {isBatchSending ? "Envoi en cours..." : `Envoyer la sélection (${selectedEmailIds.length})`}
            </Button>
        </CardHeader>
        <CardContent>
          {pendingEmails.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={pendingEmails.length > 0 && selectedEmailIds.length === pendingEmails.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Tout sélectionner"
                      disabled={isAnyActionLoading}
                    />
                  </TableHead>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingEmails.map((email) => (
                  <TableRow key={email.id} data-state={selectedEmailIds.includes(email.id) && "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEmailIds.includes(email.id)}
                        onCheckedChange={(checked) => handleSelectRow(email.id, !!checked)}
                        aria-label={`Sélectionner le mail pour ${email.recipientName}`}
                        disabled={isAnyActionLoading}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{email.recipientName}</div>
                      <div className="text-sm text-muted-foreground">{email.recipientEmail}</div>
                    </TableCell>
                    <TableCell>{email.subject}</TableCell>
                    <TableCell>
                      {format(new Date(email.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewClick(email)} disabled={isAnyActionLoading}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Voir</span>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleSendClick(email)} disabled={isAnyActionLoading}>
                            {sendingEmailId === email.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            <span className="sr-only">Envoyer</span>
                        </Button>
                         <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(email)} disabled={isAnyActionLoading}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Supprimer</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Aucun mail en attente pour le moment.</p>
            </div>
          )}
        </CardContent>
      </Card>

        <Dialog open={isViewOpen} onOpenChange={setViewOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Aperçu du mail</DialogTitle>
                    <DialogDescription>
                        Objet : {selectedEmail?.subject}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] rounded-md border p-4 my-4">
                    <div dangerouslySetInnerHTML={{ __html: selectedEmail?.body || '' }} />
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setViewOpen(false)}>Fermer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      
        <AlertDialog open={isAlertOpen} onOpenChange={setAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Voulez-vous vraiment supprimer ce mail en attente ? Cette action est irréversible.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
