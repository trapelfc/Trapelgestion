
"use client";

import * as React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PendingEmail } from "@/lib/types";

export function ArchivedMailsView({ archivedEmails }: { archivedEmails: PendingEmail[] }) {
  const [isViewOpen, setViewOpen] = React.useState(false);
  const [selectedEmail, setSelectedEmail] = React.useState<PendingEmail | null>(null);
  
  const handleViewClick = (email: PendingEmail) => {
    setSelectedEmail(email);
    setViewOpen(true);
  };

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Archives des mails</CardTitle>
          <CardDescription>
            Historique des mails envoyés aux membres du club.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {archivedEmails.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinataire</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Date d'envoi</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archivedEmails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>
                      <div className="font-medium">{email.recipientName}</div>
                      <div className="text-sm text-muted-foreground">{email.recipientEmail}</div>
                    </TableCell>
                    <TableCell>{email.subject}</TableCell>
                    <TableCell>
                      {email.sentAt ? format(new Date(email.sentAt), "d MMMM yyyy 'à' HH:mm", { locale: fr }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleViewClick(email)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Voir</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">Aucun mail archivé pour le moment.</p>
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
    </>
  );
}
