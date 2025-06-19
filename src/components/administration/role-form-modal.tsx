
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
import { Textarea } from "@/components/ui/textarea";
import type { Role } from '@/config/roles-constants'; // Import Role type

const roleFormSchema = z.object({
  label: z.string().min(1, "Le nom du rôle est requis.").max(50, "Le nom ne doit pas dépasser 50 caractères."),
  description: z.string().min(1, "La description est requise.").max(250, "La description ne doit pas dépasser 250 caractères."),
});

export type RoleFormData = z.infer<typeof roleFormSchema>;

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: RoleFormData, editingId?: string) => void;
  initialData?: Partial<Role> | null; // Role type for initialData
  editingId?: string;
}

export function RoleFormModal({ isOpen, onClose, onSave, initialData, editingId }: RoleFormModalProps) {
  const form = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      label: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.reset({
          label: initialData.label || "",
          description: initialData.description || "",
        });
      } else {
        form.reset({
          label: "",
          description: "",
        });
      }
    }
  }, [isOpen, initialData, form]);

  const onSubmit = (data: RoleFormData) => {
    onSave(data, editingId);
  };

  const modalTitle = editingId ? "Modifier le Rôle" : "Ajouter un Rôle";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            Définissez le nom et la description du rôle.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Rôle *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Super Modérateur" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Décrivez les permissions associées à ce rôle..." {...field} rows={4}/>
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
