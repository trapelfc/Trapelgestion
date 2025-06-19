
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ListPlus, FileText, BookCopy, SendToBack } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function CommandeNourritureBoissonsPage() {
  const subModules = [
    {
      title: "Nouvelle Commande",
      description: "Créer une nouvelle session de commande de nourriture ou boissons.",
      href: "/commande/nourriture-boissons/nouvelle-commande",
      icon: <ListPlus className="h-6 w-6 text-primary" />,
    },
    {
      title: "Récap. avant Envoi Fournisseurs",
      description: "Vérifier la répartition par fournisseur avant de générer les e-mails.",
      href: "/commande/nourriture-boissons/recapitulatif-fournisseurs",
      icon: <SendToBack className="h-6 w-6 text-primary" />,
    },
    {
      title: "Gérer les Commandes Types",
      description: "Créer et gérer des modèles de commandes.",
      href: "/commande/nourriture-boissons/types",
      icon: <BookCopy className="h-6 w-6 text-primary" />, 
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/commande">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour au Module Commande</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Commandes de Nourriture & Boissons</h1>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {subModules.map((module) => (
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
      </div>
    </div>
  );
}
