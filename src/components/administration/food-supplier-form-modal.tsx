
'use client';

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { FoodSupplierDetail } from '@/config/stock-constants';

const foodSupplierFormSchema = z.object({
  name: z.string().min(1, "Le nom du fournisseur est requis.").max(50, "Le nom ne doit pas dépasser 50 caractères."),
  contactName: z.string().max(50, "Le nom du contact ne doit pas dépasser 50 caractères.").optional().or(z.literal('')),
  email: z.string().email("L'adresse email est invalide.").optional().or(z.literal('')),
  phone: z.string().max(20, "Le numéro de téléphone ne doit pas dépasser 20 caractères.").optional().or(z.literal('')),
});

export type FoodSupplierFormData = z.infer<typeof foodSupplierFormSchema>;

interface FoodSupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FoodSupplierFormData) => void;
  initialData?: FoodSupplierDetail | null;
}

export function FoodSupplierFormModal({ isOpen, onClose, onSave, initialData }: FoodSupplierFormModalProps) {
  const form = useForm<FoodSupplierFormData>({
    resolver: zodResolver(foodSupplierFormSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          name: initialData.name || "",
          contactName: initialData.contactName || "",
          email: initialData.email || "",
          phone: initialData.phone || "",
        });
      } else {
        form.reset({
          name: "",
          contactName: "",
          email: "",
          phone: "",
        });
      }
    }
  }, [isOpen, initialData, form]);

  const onSubmit = (data: FoodSupplierFormData) => {
    onSave(data);
  };

  const modalTitle = initialData ? "Modifier le Fournisseur" : "Ajouter un Fournisseur";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            Saisissez les informations du fournisseur.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Fournisseur *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom officiel du fournisseur" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Contact (Optionnel)</FormLabel>
                  <FormControl>
                    <Input placeholder="Prénom Nom du contact" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail (Optionnel)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@fournisseur.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone (Optionnel)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="0123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={onClose}>
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
