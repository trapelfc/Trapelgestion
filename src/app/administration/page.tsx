
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, ListChecks, Settings, MailCheck, FileText, Shield, Users } from 'lucide-react'; // Users ajouté

export default function AdministrationPage() {
  const modules = [
    {
      title: "Gestion des Listes",
      description: "Mettre à jour les listes déroulantes et configurations de l'application.",
      href: "/administration/gestion-listes",
      icon: <ListChecks className="h-6 w-6 text-primary" />,
    },
    {
      title: "Paramètres",
      description: "Configurer les paramètres généraux de l'application.",
      href: "/administration/parametre",
      icon: <Settings className="h-6 w-6 text-primary" />,
    },
    {
      title: "Modèles d'E-mails",
      description: "Gérer le contenu des e-mails automatiques.",
      href: "/administration/modeles-mails",
      icon: <MailCheck className="h-6 w-6 text-primary" />,
    },
    {
      title: "Documents Officiels",
      description: "Gérer les références aux documents officiels.",
      href: "/administration/documents",
      icon: <FileText className="h-6 w-6 text-primary" />,
    },
    {
      title: "Gestion des Droits et Accès",
      description: "Configurer les droits d'accès des utilisateurs.",
      href: "/administration/droits-acces",
      icon: <Shield className="h-6 w-6 text-primary" />,
    },
    {
      title: "Gestion des Membres",
      description: "Gérer les utilisateurs de l'application et leurs rôles.",
      href: "/administration/gestion-membres",
      icon: <Users className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour au Menu Principal</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Module Administration</h1>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((module) => (
          <Link href={module.href} key={module.title} legacyBehavior>
            <a className="block transform transition-all duration-300 hover:scale-105">
              <Card className="h-full shadow-lg hover:shadow-xl">
                <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                  {module.icon}
                  <CardTitle className="text-xl font-semibold">{module.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {module.description}
                  </p>
                </CardContent>
              </Card>
            </a>
          </Link>
        ))}
        {modules.length === 0 && (
           <div className="text-center text-muted-foreground col-span-full">
            <p>Aucun module d'administration disponible pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}

