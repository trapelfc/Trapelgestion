
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
import { Textarea } from '@/components/ui/textarea'; // Using Textarea for better copy-paste
import { useToast } from '@/hooks/use-toast';
import { Copy } from 'lucide-react';

interface PreviewEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailContent: {
    recipients: string;
    subject: string;
    body: string;
  };
}

export function PreviewEmailModal({ isOpen, onClose, emailContent }: PreviewEmailModalProps) {
  const { toast } = useToast();

  const handleCopyToClipboard = async () => {
    const fullEmailText = `Destinataires : ${emailContent.recipients}\nSujet : ${emailContent.subject}\n\nCorps du message :\n${emailContent.body}`;
    try {
      await navigator.clipboard.writeText(fullEmailText);
      toast({
        title: "Copié !",
        description: "Le contenu de l'e-mail a été copié dans le presse-papiers.",
      });
    } catch (err) {
      toast({
        title: "Erreur de copie",
        description: "Impossible de copier le contenu. Veuillez le faire manuellement.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Aperçu de l'E-mail</DialogTitle>
          <DialogDescription>
            Vérifiez le contenu avant de le copier pour l'envoyer.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 py-4 space-y-3 overflow-y-auto">
          <div className="text-sm">
            <span className="font-semibold">Destinataires :</span> {emailContent.recipients}
          </div>
          <div className="text-sm">
            <span className="font-semibold">Sujet :</span> {emailContent.subject}
          </div>
          
          <div>
            <h4 className="font-semibold text-sm mb-1">Corps du message :</h4>
            <Textarea
              readOnly
              value={emailContent.body}
              className="h-[300px] w-full rounded-md border p-3 text-sm whitespace-pre-wrap bg-muted text-foreground"
              rows={15}
            />
          </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-auto">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleCopyToClipboard}>
            <Copy className="mr-2 h-4 w-4" />
            Copier tout le contenu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
