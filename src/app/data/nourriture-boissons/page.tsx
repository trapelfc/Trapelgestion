
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ArchivedCommandSession, ArchivedCommande, AggregatedSupplierOrderForArchive } from '@/app/commande/nourriture-boissons/nouvelle/page';
import { ARCHIVED_FOOD_COMMAND_SESSIONS_STORAGE_KEY } from '@/app/commande/nourriture-boissons/nouvelle/page';

const getArchivedCommandSessions = (): ArchivedCommandSession[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(ARCHIVED_FOOD_COMMAND_SESSIONS_STORAGE_KEY);
  if (stored) {
    try {
      const sessions = JSON.parse(stored) as ArchivedCommandSession[];
      // Assurer la compatibilité avec les anciennes sessions qui n'ont pas supplierAggregatedOrders
      return sessions.map(s => ({
        ...s,
        supplierAggregatedOrders: s.supplierAggregatedOrders || [],
      }));
    } catch (e) {
      console.error("Error parsing archived command sessions:", e);
      return [];
    }
  }
  return [];
};

const formatPriceDetail = (price?: number, quantity?: number) => {
  if (price === undefined || price === null || quantity === undefined || quantity === null) return '';
  return `(${price.toFixed(2)}€/u, Total: ${(price * quantity).toFixed(2)}€)`;
};


export default function DataNourritureBoissonsPage() {
  const [archivedSessions, setArchivedSessions] = useState<ArchivedCommandSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ArchivedCommandSession | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const sessions = getArchivedCommandSessions();
    setArchivedSessions(sessions.sort((a, b) => parseISO(b.archivedAt).getTime() - parseISO(a.archivedAt).getTime()));
    setIsLoading(false);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === ARCHIVED_FOOD_COMMAND_SESSIONS_STORAGE_KEY) {
        const updatedSessions = getArchivedCommandSessions();
        setArchivedSessions(updatedSessions.sort((a, b) => parseISO(b.archivedAt).getTime() - parseISO(a.archivedAt).getTime()));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleViewDetails = (session: ArchivedCommandSession) => {
    setSelectedSession(session);
    setIsDetailModalOpen(true);
  };

  const formatSessionArchivedAt = (isoDate: string) => {
    try {
      return format(parseISO(isoDate), 'dd/MM/yyyy HH:mm', { locale: fr });
    } catch (e) { return 'Date invalide'; }
  };


  if (isLoading) {
    return <div className="container mx-auto p-4 text-center">Chargement des archives de commandes...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/data">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour au Module Data</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Archives des Commandes (Nourriture & Boissons)</h1>
      </div>

      {archivedSessions.length > 0 ? (
        <div className="rounded-md border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="py-2 px-4">Semaine de Commande</TableHead>
                <TableHead className="py-2 px-4 text-right">Montant Total Initial</TableHead>
                <TableHead className="py-2 px-4 text-center">Archivée le</TableHead>
                <TableHead className="py-2 px-4 text-center">Cmds Fourn. Générées</TableHead>
                <TableHead className="py-2 px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="py-2 px-4 font-medium">{session.weekLabel}</TableCell>
                  <TableCell className="py-2 px-4 text-right">{session.totalSessionAmount.toFixed(2)}€</TableCell>
                  <TableCell className="py-2 px-4 text-center">{formatSessionArchivedAt(session.archivedAt)}</TableCell>
                  <TableCell className="py-2 px-4 text-center">
                    {session.supplierOrdersGeneratedAt ? formatSessionArchivedAt(session.supplierOrdersGeneratedAt) : 'Non'}
                  </TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(session)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Voir Détail
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        !isLoading && (
          <div className="text-center text-muted-foreground py-8 border rounded-md">
            <p>Aucune session de commande archivée pour le moment.</p>
          </div>
        )
      )}

      {selectedSession && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-lg md:max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Détail de la Session de Commande</DialogTitle>
              <DialogDescription>
                {selectedSession.weekLabel} - Total Initial: {selectedSession.totalSessionAmount.toFixed(2)}€
                <br />
                Session archivée le: {formatSessionArchivedAt(selectedSession.archivedAt)}
                {selectedSession.supplierOrdersGeneratedAt && (
                    <>
                    <br />
                    Commandes fournisseurs finalisées le: {formatSessionArchivedAt(selectedSession.supplierOrdersGeneratedAt)}
                    </>
                )}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 min-h-0 pr-4 py-2">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Commandes Initiales (Préparées par l'utilisateur)</h3>
                  {selectedSession.commands.length > 0 ? selectedSession.commands.map((commande, index) => (
                    <div key={`initial-${index}`} className="p-3 border rounded-md mb-2 bg-background/50">
                      <h4 className="font-semibold text-md mb-1">{commande.nom} <span className="text-sm text-muted-foreground">({commande.montantTotalCommande.toFixed(2)}€)</span></h4>
                      {commande.articles.length > 0 ? (
                        <ul className="list-disc list-inside pl-4 text-sm space-y-0.5">
                          {commande.articles.map((article, artIndex) => (
                            <li key={`initial-art-${artIndex}`}>
                              {article.nomArticle} x {article.quantite}
                              {article.prixUnitaire !== undefined && article.prixTotalArticle !== undefined && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  {formatPriceDetail(article.prixUnitaire, article.quantite)}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">Aucun article pour cette commande.</p>
                      )}
                    </div>
                  )) : <p className="text-sm text-muted-foreground">Aucune commande initiale enregistrée.</p>}
                </div>

                {selectedSession.supplierAggregatedOrders && selectedSession.supplierAggregatedOrders.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Commandes Agrégées par Fournisseur (Après déduction stock)</h3>
                      {selectedSession.supplierAggregatedOrders.map((supplierOrder, index) => (
                        <div key={`supplier-${index}`} className="p-3 border rounded-md mb-2 bg-blue-50 dark:bg-blue-900/20">
                          <h4 className="font-semibold text-md mb-1">
                            Fournisseur: {supplierOrder.supplierName} {supplierOrder.supplierEmail && `(${supplierOrder.supplierEmail})`}
                            <span className="text-sm text-muted-foreground ml-2">({supplierOrder.montantTotalFournisseur.toFixed(2)}€)</span>
                          </h4>
                          {supplierOrder.articles.length > 0 ? (
                            <ul className="list-disc list-inside pl-4 text-sm space-y-0.5">
                              {supplierOrder.articles.map((article, artIndex) => (
                                <li key={`supplier-art-${artIndex}`}>
                                  {article.nomArticle} x {article.quantiteCommandee}
                                  {article.prixUnitaire !== undefined && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      {formatPriceDetail(article.prixUnitaire, article.quantiteCommandee)}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground">Aucun article commandé à ce fournisseur (probablement couvert par stock).</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t mt-auto">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                  Fermer
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

    
