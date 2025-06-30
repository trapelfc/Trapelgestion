
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Role, SerializableModuleConfig } from "@/lib/types";
import { updateRoles } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2 } from "lucide-react";

interface RolesViewProps {
  initialRoles: Role[];
  modulesConfig: SerializableModuleConfig[];
}

export function RolesView({ initialRoles, modulesConfig }: RolesViewProps) {
  const [roles, setRoles] = React.useState<Role[]>(initialRoles);
  const [selectedRoleName, setSelectedRoleName] = React.useState<string>("");
  const [newRoleName, setNewRoleName] = React.useState("");
  const { toast } = useToast();
  const router = useRouter();

  React.useEffect(() => {
    if (!selectedRoleName && initialRoles.length > 0) {
      setSelectedRoleName(initialRoles[0].name);
    }
  }, [initialRoles, selectedRoleName]);
  
  const selectedRole = roles.find(r => r.name === selectedRoleName);

  const handlePermissionChange = (permissionHref: string, checked: boolean) => {
    if (!selectedRole) return;

    setRoles(currentRoles =>
      currentRoles.map(role => {
        if (role.name === selectedRole.name) {
          let newPermissions = [...role.permissions];

          // Add or remove the clicked permission
          if (checked) {
            newPermissions.push(permissionHref);
          } else {
            newPermissions = newPermissions.filter(p => p !== permissionHref);
          }
          
          // Auto-manage parent module access
          modulesConfig.forEach(parentModule => {
            const allSubHrefs = parentModule.subModules.flatMap(sm => [sm.href, ...(sm.subModules?.map(ssm => ssm.href) || [])]);
            const hasAnySubmodule = allSubHrefs.some(href => newPermissions.includes(href));
            const isParentInPermissions = newPermissions.includes(parentModule.href);
            
            if (hasAnySubmodule && !isParentInPermissions) {
              newPermissions.push(parentModule.href);
            } else if (!hasAnySubmodule && isParentInPermissions && parentModule.href !== '/stock') { // Keep /stock as it's a root module
              newPermissions = newPermissions.filter(p => p !== parentModule.href);
            }
          });

          return { ...role, permissions: [...new Set(newPermissions)] };
        }
        return role;
      })
    );
  };

  const handleAddRole = () => {
    if (!newRoleName.trim()) {
      toast({ title: "Erreur", description: "Le nom du rôle ne peut pas être vide.", variant: "destructive" });
      return;
    }
    if (roles.some(role => role.name.toLowerCase() === newRoleName.trim().toLowerCase())) {
      toast({ title: "Erreur", description: "Ce rôle existe déjà.", variant: "destructive" });
      return;
    }
    setRoles(currentRoles => [...currentRoles, { name: newRoleName.trim(), permissions: [] }]);
    setSelectedRoleName(newRoleName.trim());
    setNewRoleName("");
  };
  
  const handleDeleteRole = (roleNameToDelete: string) => {
    if(roleNameToDelete === 'admin') {
        toast({ title: "Action non autorisée", description: "Le rôle 'admin' ne peut pas être supprimé.", variant: "destructive" });
        return;
    }
    setRoles(currentRoles => {
      const newRoles = currentRoles.filter(role => role.name !== roleNameToDelete);
      if (selectedRoleName === roleNameToDelete) {
        setSelectedRoleName(newRoles[0]?.name || "");
      }
      return newRoles;
    });
  };

  const handleSaveChanges = async () => {
    try {
      await updateRoles(roles);
      toast({ title: "Sauvegardé", description: "Les rôles et permissions ont été mis à jour." });
      router.refresh();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder les modifications.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Gestion des Rôles et Accès</CardTitle>
          <CardDescription>
            Définissez des rôles et attribuez-leur des droits d'accès aux différents modules de l'application.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-4 lg:col-span-3">
              <Card>
                <CardHeader className="p-4">
                  <CardTitle className="text-lg">Rôles</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <RadioGroup value={selectedRoleName} onValueChange={setSelectedRoleName} className="space-y-1">
                    {roles.map(role => (
                      <div key={role.name} className="flex items-center justify-between p-2 rounded-md hover:bg-accent has-[[data-state=checked]]:bg-accent">
                          <Label htmlFor={role.name} className="flex-1 cursor-pointer py-1 text-base">{role.name}</Label>
                          <RadioGroupItem value={role.name} id={role.name} className="mr-2" />
                          {role.name !== 'admin' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteRole(role.name)}>
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Supprimer</span>
                              </Button>
                          )}
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
                <CardFooter className="p-2 border-t mt-2">
                  <div className="flex items-center gap-2 w-full">
                    <Input placeholder="Nouveau rôle..." value={newRoleName} onChange={e => setNewRoleName(e.target.value)} />
                    <Button onClick={handleAddRole} size="icon" className="shrink-0"><PlusCircle/></Button>
                  </div>
                </CardFooter>
              </Card>
            </div>

            <div className="md:col-span-8 lg:col-span-9">
              {selectedRole ? (
                <div className="space-y-8">
                  {modulesConfig.map(module => (
                    <div key={module.href}>
                      <h3 className="text-xl font-semibold border-b pb-2 mb-4">{module.label}</h3>
                      <div className="space-y-4">
                        {module.subModules.map(subModule => (
                            <div key={subModule.href} className="pl-4">
                                <div className="flex items-center space-x-3">
                                    <Checkbox 
                                        id={`${selectedRole.name}-${subModule.href}`}
                                        checked={selectedRole.permissions.includes(subModule.href)}
                                        onCheckedChange={(checked) => handlePermissionChange(subModule.href, !!checked)}
                                        disabled={selectedRole.name === 'admin'}
                                    />
                                    <Label htmlFor={`${selectedRole.name}-${subModule.href}`} className="font-normal cursor-pointer text-base">
                                        {subModule.label}
                                    </Label>
                                </div>
                                {subModule.subModules && (
                                    <div className="mt-3 pl-8 space-y-3 border-l ml-[7px]">
                                        {subModule.subModules.map(subSubModule => (
                                            <div key={subSubModule.href} className="flex items-center space-x-3">
                                                <Checkbox 
                                                    id={`${selectedRole.name}-${subSubModule.href}`}
                                                    checked={selectedRole.permissions.includes(subSubModule.href)}
                                                    onCheckedChange={(checked) => handlePermissionChange(subSubModule.href, !!checked)}
                                                    disabled={selectedRole.name === 'admin'}
                                                />
                                                <Label htmlFor={`${selectedRole.name}-${subSubModule.href}`} className="font-normal cursor-pointer text-muted-foreground">
                                                    {subSubModule.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Sélectionnez un rôle pour voir ses permissions.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end pt-4">
        <Button size="lg" onClick={handleSaveChanges}>Sauvegarder les modifications</Button>
      </div>
    </div>
  );
}
