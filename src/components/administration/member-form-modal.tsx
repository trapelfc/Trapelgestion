
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role } from '@/config/roles-constants';
import { getStoredRoles } from '@/config/roles-constants';
import type { AppMember } from '@/config/member-constants';

const memberFormSchemaBase = z.object({
  nom: z.string().min(1, "Le login est requis.").max(100, "Le login ne doit pas dépasser 100 caractères."), // Internal name 'nom' kept, message updated
  email: z.string().email("L'adresse e-mail est invalide.").min(1, "L'e-mail est requis."),
  roleId: z.string().min(1, "Un rôle doit être sélectionné."),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
});

export type MemberFormData = z.infer<typeof memberFormSchemaBase>;

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MemberFormData, editingId?: string) => void;
  initialData?: AppMember | null;
  editingId?: string;
  allMembers: AppMember[];
}

export function MemberFormModal({ 
    isOpen, 
    onClose, 
    onSave, 
    initialData, 
    editingId,
    allMembers
}: MemberFormModalProps) {
  const [availableRoles, setAvailableRoles] = React.useState<Role[]>([]);
  
  const memberFormSchema = memberFormSchemaBase.superRefine((data, ctx) => {
    const emailExists = allMembers.some(
      member => member.email.toLowerCase() === data.email.toLowerCase() && member.id !== editingId
    );
    if (emailExists) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cet e-mail est déjà utilisé par un autre membre.",
        path: ["email"],
      });
    }

    if (!editingId && (!data.password || data.password.trim() === '')) { 
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Le mot de passe est requis.",
            path: ["password"],
        });
    }
    if (data.password && data.password.trim() !== '') { 
        if (data.password.length < 6) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Le mot de passe doit contenir au moins 6 caractères.",
                path: ["password"],
            });
        }
        if (data.password !== data.confirmPassword) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Les mots de passe ne correspondent pas.",
                path: ["confirmPassword"],
            });
        }
    } else if (data.confirmPassword && data.confirmPassword.trim() !== '') { 
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Veuillez d'abord saisir un mot de passe.",
            path: ["password"],
        });
    }
  });
  
  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: {
      nom: "", // Internal name 'nom' kept
      email: "",
      roleId: "",
      password: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      setAvailableRoles(getStoredRoles());
      if (initialData) {
        form.reset({
          nom: initialData.nom || "", // Internal name 'nom' kept
          email: initialData.email || "",
          roleId: initialData.roleId || "",
          password: "", 
          confirmPassword: "", 
        });
      } else {
        form.reset({
          nom: "", // Internal name 'nom' kept
          email: "",
          roleId: "",
          password: "",
          confirmPassword: "",
        });
      }
    }
  }, [isOpen, initialData, form]);

  const onSubmit = (data: MemberFormData) => {
    const dataToSend: MemberFormData = { ...data };
    if (!data.password || data.password.trim() === '') {
      delete dataToSend.password;
      delete dataToSend.confirmPassword;
    }
    onSave(dataToSend, editingId);
  };

  const modalTitle = editingId ? "Modifier le Membre" : "Ajouter un Membre";
  const passwordPlaceholder = editingId ? "Laisser vide pour ne pas changer" : "Minimum 6 caractères";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>
            Saisissez les informations du membre et assignez-lui un rôle.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="nom" // Internal name 'nom' kept
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Login *</FormLabel>
                  <FormControl>
                    <Input placeholder="Identifiant de connexion" {...field} />
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
                  <FormLabel>E-mail (Identifiant unique) *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="membre@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rôle *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.label}
                        </SelectItem>
                      ))}
                      {availableRoles.length === 0 && <p className="p-2 text-sm text-muted-foreground">Aucun rôle défini.</p>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe {editingId ? '(Optionnel)' : '*'}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={passwordPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmer le mot de passe {editingId && !form.getValues().password ? '(Optionnel)' : '*'}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Retapez le mot de passe" {...field} />
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
