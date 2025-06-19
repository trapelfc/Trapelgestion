
'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
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
import type { EquipementItem } from '@/app/stock/equipement/page';
import { APPAREL_SIZES, SOCK_SIZES, FOOD_LOCATIONS, SPORTIF_LOCATIONS } from '@/config/stock-constants'; 

interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EquipementItem;
}

export function StockDetailModal({ isOpen, onClose, item }: StockDetailModalProps) {
  if (!item) return null;

  const breakdownKeysToDisplay = React.useMemo(() => {
    if (!item.hasSizeVariants) return [];
    if (item.itemCategory === 'food') return FOOD_LOCATIONS;
    if (item.itemCategory === 'sportif') return SPORTIF_LOCATIONS;
    if (item.itemCategory === 'apparel') return APPAREL_SIZES;
    if (item.itemCategory === 'socks') return SOCK_SIZES;
    return item.availableSizes || []; // Fallback
  }, [item]);

  const breakdownTitle = React.useMemo(() => {
    if (item.itemCategory === 'food' || item.itemCategory === 'sportif') return "Répartition par lieu :";
    if (item.itemCategory === 'apparel' || item.itemCategory === 'socks') return "Répartition par taille :";
    return "Répartition :";
  }, [item.itemCategory]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] md:sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Détail du stock : {item.name}</DialogTitle>
           <DialogDescription>
            Récapitulatif des informations.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-auto max-h-[400px] pr-4 my-4">
          {item.itemCategory === 'food' && item.supplier && (
            <p className="text-sm mb-3">
              <span className="font-medium">Fournisseur : </span>
              <span>{item.supplier}</span>
            </p>
          )}

          {item.hasSizeVariants && item.sizeBreakdown && breakdownKeysToDisplay.length > 0 ? (
            <>
              <h4 className="font-medium mb-2">{breakdownTitle}</h4>
              <ul className="space-y-2">
                {breakdownKeysToDisplay.map(key => (
                  <li key={key} className="flex justify-between items-center text-sm">
                    <span>{key}:</span>
                    <span className="font-medium">{item.sizeBreakdown?.[key] ?? 0}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-3">
                <span className="font-medium">Quantité totale : </span> 
                <span>{item.quantity}</span>
              </p>
            </>
          ) : ( 
            <div className="text-sm">
              <span className="font-medium">Quantité totale : </span>
              <span>{item.quantity}</span>
            </div>
          )}

           {!item.hasSizeVariants && item.quantity === 0 && (
             <p className="text-sm text-muted-foreground mt-2">Aucun stock pour cet article.</p>
           )}
           {item.hasSizeVariants && (!item.sizeBreakdown || breakdownKeysToDisplay.length === 0) && item.quantity === 0 && (
             <p className="text-sm text-muted-foreground mt-2">Aucune répartition disponible ou configurée, et quantité totale à zéro.</p>
           )}
        </ScrollArea>
        
        <DialogFooter className="mt-4">
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
