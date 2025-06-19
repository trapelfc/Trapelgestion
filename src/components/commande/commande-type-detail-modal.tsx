
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CommandeType, CommandeTypeArticle } from '@/app/commande/nourriture-boissons/types/page';
import { Separator } from '@/components/ui/separator';

interface CommandeTypeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  commandeType: CommandeType | null;
}

const renderArticleTable = (articles: CommandeTypeArticle[] | undefined, title: string) => {
  if (!articles || articles.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-2">{title}: Aucun article.</p>;
  }
  return (
    <div>
      <h4 className="font-semibold text-md mb-1 mt-2">{title}</h4>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="py-2 px-3">Article</TableHead>
              <TableHead className="text-right py-2 px-3 w-[100px]">Quantité</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((article, index) => (
              <TableRow key={index}>
                <TableCell className="py-1.5 px-3 font-medium">{article.nomArticle}</TableCell>
                <TableCell className="text-right py-1.5 px-3">{article.quantite}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export function CommandeTypeDetailModal({ isOpen, onClose, commandeType }: CommandeTypeDetailModalProps) {
  if (!commandeType) return null;

  const getModelTypeLabel = (modelType: 'annexe' | 'match') => {
    if (modelType === 'annexe') return 'Annexe';
    if (modelType === 'match') return 'Match';
    return 'N/D';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Détail du Modèle : {commandeType.nom}</DialogTitle>
          <DialogDescription>
            Type de modèle : {getModelTypeLabel(commandeType.modelType)}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0 pr-4 py-2 space-y-3">
          {commandeType.modelType === 'match' ? (
            <>
              {renderArticleTable(commandeType.articlesDomicile, "Articles Domicile")}
              {renderArticleTable(commandeType.articlesExterieur, "Articles Extérieur")}
            </>
          ) : (
            renderArticleTable(commandeType.articles, "Articles")
          )}
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
