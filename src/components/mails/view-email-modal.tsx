
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PendingEmail } from '@/app/inscription/paiement/page'; 
import { Send } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { ReferencedDocument } from '@/app/administration/documents/page';
import { getReferencedDocuments } from '@/app/administration/documents/page';
import { getPendingEmailsFromStorage, savePendingEmailsToStorage } from '@/app/inscription/paiement/page';
import { useToast } from '@/hooks/use-toast';

const ATTACHMENT_NOTE_HEADER = "\n\n---\nPièces jointes suggérées (à ajouter manuellement) :\n";
const ATTACHMENT_NOTE_FOOTER = "\n---";

interface ViewEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: PendingEmail | null;
  onMarkAsSent: (emailId: string) => void;
  isReadOnly?: boolean; 
}

export function ViewEmailModal({ isOpen, onClose, email, onMarkAsSent, isReadOnly = false }: ViewEmailModalProps) {
  const [availableDocuments, setAvailableDocuments] = React.useState<ReferencedDocument[]>([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<Set<string>>(new Set());
  
  const [editedSubject, setEditedSubject] = React.useState<string>('');
  const [editedBody, setEditedBody] = React.useState<string>('');
  const { toast } = useToast();

  // Store the original body to correctly re-apply notes without duplicating user edits
  const [originalEmailBodyForNote, setOriginalEmailBodyForNote] = React.useState<string>('');

  React.useEffect(() => {
    if (isOpen && email) {
      setAvailableDocuments(getReferencedDocuments());
      setEditedSubject(email.sujet);
      setEditedBody(email.corps); 
      setOriginalEmailBodyForNote(email.corps.split(ATTACHMENT_NOTE_HEADER)[0].trim()); // Store body without any existing note
      setSelectedDocumentIds(new Set()); 
    }
  }, [isOpen, email]);

  const generateAttachmentNote = (selectedIds: Set<string>): string => {
    const selectedDocs = availableDocuments.filter(doc => selectedIds.has(doc.id));
    if (selectedDocs.length === 0) return "";
    return ATTACHMENT_NOTE_HEADER +
           selectedDocs.map(doc => `- ${doc.displayName}`).join("\n") +
           ATTACHMENT_NOTE_FOOTER;
  };
  
  const updateBodyWithAttachmentNote = (currentBody: string, note: string, baseBody: string): string => {
    // If the user manually edited the part where the note was, we use the currentBody up to the note.
    // Otherwise, we use the original baseBody to avoid re-adding notes to already modified text.
    const bodyToUseForBase = currentBody.includes(ATTACHMENT_NOTE_HEADER) 
      ? currentBody.split(ATTACHMENT_NOTE_HEADER)[0].trim()
      : baseBody; // Use original base if no note was present in current user edits
    return bodyToUseForBase + note;
  };

  React.useEffect(() => {
    if (email && !isReadOnly) { 
      const note = generateAttachmentNote(selectedDocumentIds);
      // Use originalEmailBodyForNote to ensure user's manual edits to the main body are preserved
      // if they re-select PJs or if the note part was already there.
      setEditedBody(prevBody => {
          // If prevBody already contains a note, we want to preserve user changes *before* that note.
          // Otherwise, we use the pristine original body.
          const baseForNote = prevBody.includes(ATTACHMENT_NOTE_HEADER) 
                              ? prevBody.split(ATTACHMENT_NOTE_HEADER)[0].trim() 
                              : originalEmailBodyForNote;
          return baseForNote + note;
      });
    } else if (email && isReadOnly) {
        setEditedBody(email.corps);
    }
  }, [selectedDocumentIds, availableDocuments, email, isReadOnly, originalEmailBodyForNote]);

  if (!email) return null;

  const handleSaveAndSend = () => {
    if (isReadOnly || !email) return;

    const allPendingEmails = getPendingEmailsFromStorage();
    const emailIndex = allPendingEmails.findIndex(e => e.id === email.id);

    if (emailIndex === -1) {
      toast({ title: "Erreur", description: "Email non trouvé pour la mise à jour.", variant: "destructive" });
      return;
    }
    
    const finalBodyWithNote = updateBodyWithAttachmentNote(
      editedBody, 
      generateAttachmentNote(selectedDocumentIds),
      originalEmailBodyForNote
    );

    const updatedEmail: PendingEmail = {
      ...allPendingEmails[emailIndex],
      sujet: editedSubject,
      corps: finalBodyWithNote,
      status: 'envoye',
      datePreparation: new Date().toISOString(), 
    };

    allPendingEmails[emailIndex] = updatedEmail;
    savePendingEmailsToStorage(allPendingEmails);
    onMarkAsSent(email.id); 
  };

  const handleDocumentSelectionChange = (docId: string, checked: boolean) => {
    setSelectedDocumentIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(docId);
      } else {
        newSet.delete(docId);
      }
      return newSet;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isReadOnly ? "Détails de l'E-mail" : "Modifier l'E-mail"}</DialogTitle>
          <DialogDescription>
            {isReadOnly ? "Détails de l'e-mail envoyé à :" : "Prêt à être envoyé à :"} {email.licenciePrenom} {email.licencieNom} ({email.licencieEmail || 'Email non fourni'})
            <br/>
            Source: {email.source}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 py-4 space-y-3">
          <div>
            <Label htmlFor="email-subject" className="font-semibold text-sm">Sujet :</Label>
            {isReadOnly ? (
              <p className="text-sm p-2 mt-1 bg-muted rounded-md">{email.sujet}</p>
            ) : (
              <Input
                id="email-subject"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                className="mt-1"
              />
            )}
          </div>
          
          {!isReadOnly && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2">Pièces Jointes Suggérées (Cochez pour inclure une note)</h4>
                {availableDocuments.length > 0 ? (
                  <ScrollArea className="h-[100px] w-full rounded-md border p-2">
                    <div className="space-y-1.5">
                      {availableDocuments.map(doc => (
                        <div key={doc.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`doc-${doc.id}`}
                            checked={selectedDocumentIds.has(doc.id)}
                            onCheckedChange={(checked) => handleDocumentSelectionChange(doc.id, Boolean(checked))}
                          />
                          <Label htmlFor={`doc-${doc.id}`} className="text-xs font-normal cursor-pointer">
                            {doc.displayName} <span className="text-muted-foreground">({doc.originalFileName})</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-xs text-muted-foreground p-2 border rounded-md">
                    Aucun document référencé. Ajoutez des documents via "Administration &gt; Documents Officiels" pour les lister ici.
                  </p>
                )}
              </div>
            </>
          )}
          
          <Separator />
          
          <div>
            <Label htmlFor="email-body" className="font-semibold text-sm">Corps du message :</Label>
            <ScrollArea className="h-[250px] w-full rounded-md border mt-1">
              {isReadOnly ? (
                 <div className="p-3 text-sm whitespace-pre-wrap bg-muted">{email.corps}</div>
              ) : (
                <Textarea
                  id="email-body"
                  value={editedBody}
                  onChange={(e) => {
                    setEditedBody(e.target.value);
                    // Si l'utilisateur modifie manuellement le corps, nous devons mettre à jour `originalEmailBodyForNote`
                    // pour que la reconstruction de la note des PJ se base sur le texte actuel de l'utilisateur.
                    setOriginalEmailBodyForNote(e.target.value.split(ATTACHMENT_NOTE_HEADER)[0].trim());
                  }}
                  className="h-full w-full p-3 text-sm whitespace-pre-wrap min-h-[240px] border-0 focus-visible:ring-0 bg-background"
                  rows={10}
                />
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </DialogClose>
          {!isReadOnly && (
            <Button type="button" onClick={handleSaveAndSend}>
              <Send className="mr-2 h-4 w-4" />
              Sauvegarder & Marquer comme Envoyé
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

