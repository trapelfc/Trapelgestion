
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle, ListPlus } from 'lucide-react'; // Ajout de ListPlus
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function CommandeEquipementMenuPage() {
  const subModules = [
    {
      title: "Rupture Stock Equipement",
      description: "Visualiser et traiter les besoins d'équipement suite aux ruptures de stock.",
      href: "/commande/equipement/rupture-stock",
      icon: <AlertTriangle className="h-6 w-6 text-primary" />,
    },
    {
      title: "Nouvelle Commande Équipement",
      description: "Créer manuellement une nouvelle commande d'équipement.",
      href: "/commande/equipement/nouvelle-commande",
      icon: <ListPlus className="h-6 w-6 text-primary" />,
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
        <h1 className="text-2xl font-bold">Gestion Équipement</h1>
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
        {subModules.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-8">
            <p>Aucun sous-module disponible pour la gestion de l'équipement.</p>
          </div>
        )}
      </div>
    </div>
  );
}
