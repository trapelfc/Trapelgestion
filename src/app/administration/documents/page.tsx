
'use client';

import Link from 'next/link';
import { useState, useEffect, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ArrowLeft, PlusCircle, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface ReferencedDocument {
  id: string;
  displayName: string;
  originalFileName: string;
  addedAt: string; // ISO date string
}

const REFERENCED_DOCUMENTS_STORAGE_KEY = 'TRAPEL_FC_REFERENCED_DOCUMENTS_DATA';

import { getReferencedDocuments } from '@/lib/documents';

const saveReferencedDocuments = (documents: ReferencedDocument[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFERENCED_DOCUMENTS_STORAGE_KEY, JSON.stringify(documents));
  window.dispatchEvent(new StorageEvent('storage', { key: REFERENCED_DOCUMENTS_STORAGE_KEY }));
};

export default function DocumentsOfficielsPage() {
  const [documents, setDocuments] = useState<ReferencedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDocumentName, setNewDocumentName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<ReferencedDocument | null>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    setDocuments(getReferencedDocuments().sort((a,b) => parseISO(b.addedAt).getTime() - parseISO(a.addedAt).getTime()));
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === REFERENCED_DOCUMENTS_STORAGE_KEY) {
        setDocuments(getReferencedDocuments().sort((a,b) => parseISO(b.addedAt).getTime() - parseISO(a.addedAt).getTime()));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      if (!newDocumentName) { // Pré-remplir le nom si vide
        setNewDocumentName(event.target.files[0].name.split('.').slice(0, -1).join('.'));
      }
    } else {
      setSelectedFile(null);
    }
  };

  const handleAddDocument = () => {
    if (!newDocumentName.trim()) {
      toast({ title: "Erreur", description: "Veuillez donner un nom au document.", variant: "destructive" });
      return;
    }
    if (!selectedFile) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un fichier.", variant: "destructive" });
      return;
    }

    const newDocument: ReferencedDocument = {
      id: crypto.randomUUID(),
      displayName: newDocumentName.trim(),
      originalFileName: selectedFile.name,
      addedAt: new Date().toISOString(),
    };

    const updatedDocuments = [...documents, newDocument].sort((a,b) => parseISO(b.addedAt).getTime() - parseISO(a.addedAt).getTime());
    setDocuments(updatedDocuments);
    saveReferencedDocuments(updatedDocuments);

    toast({ title: "Succès", description: `Référence au document "${newDocument.displayName}" ajoutée.` });
    setNewDocumentName('');
    setSelectedFile(null);
    // Reset file input visually (important for UX)
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const requestDeleteDocument = (doc: ReferencedDocument) => {
    setDocumentToDelete(doc);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteDocument = () => {
    if (documentToDelete) {
      const updatedDocuments = documents.filter(d => d.id !== documentToDelete.id);
      setDocuments(updatedDocuments);
      saveReferencedDocuments(updatedDocuments);
      toast({ title: "Succès", description: `Référence "${documentToDelete.displayName}" supprimée.` });
    }
    setIsConfirmDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/administration">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour au Module Administration</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Gestionnaire de Documents Officiels</h1>
      </div>

      <div className="mb-8 p-4 border rounded-lg shadow-sm bg-card">
        <h2 className="text-lg font-semibold mb-3">Ajouter une Référence de Document</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1 md:col-span-1">
            <label htmlFor="docName" className="text-sm font-medium">Nom d'affichage *</label>
            <Input
              id="docName"
              value={newDocumentName}
              onChange={(e) => setNewDocumentName(e.target.value)}
              placeholder="Ex: Attestation Licence Dupont 2024"
            />
          </div>
          <div className="space-y-1 md:col-span-1">
            <label htmlFor="file-upload" className="text-sm font-medium">Fichier (pour référence) *</label>
            <Input id="file-upload" type="file" onChange={handleFileChange} className="pt-[5px]" />
          </div>
          <Button onClick={handleAddDocument} className="md:self-end">
            <PlusCircle className="mr-2 h-4 w-4" />
            Ajouter la référence
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Note : L'application ne stocke pas les fichiers eux-mêmes, seulement une référence à leur nom. Vous êtes responsable de la conservation des fichiers originaux.
        </p>
      </div>

      <h2 className="text-xl font-semibold mb-3">Documents Référencés</h2>
      {documents.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Nom d'Affichage</TableHead>
                <TableHead className="py-2 px-4">Nom du Fichier Original</TableHead>
                <TableHead className="py-2 px-4 text-center">Ajouté le</TableHead>
                <TableHead className="text-right py-2 px-4 w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="py-2 px-4 font-medium">{doc.displayName}</TableCell>
                  <TableCell className="py-2 px-4 text-sm text-muted-foreground">{doc.originalFileName}</TableCell>
                  <TableCell className="py-2 px-4 text-center text-sm">
                    {format(parseISO(doc.addedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                  </TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteDocument(doc)}
                      aria-label={`Supprimer la référence ${doc.displayName}`}
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
        <p className="text-center text-muted-foreground">
          Aucun document référencé. Utilisez le formulaire ci-dessus pour en ajouter.
        </p>
      )}

      {documentToDelete && (
        <AlertDialog open={isConfirmDeleteDialogOpen} onOpenChange={setIsConfirmDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Voulez-vous vraiment supprimer la référence au document "{documentToDelete.displayName}" (Fichier: {documentToDelete.originalFileName}) ?
                Ceci ne supprime pas le fichier original de votre ordinateur.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsConfirmDeleteDialogOpen(false)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteDocument} className="bg-destructive hover:bg-destructive/90">Supprimer la référence</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
