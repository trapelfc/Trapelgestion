
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShoppingCart, Apple } from 'lucide-react'; // Changed icon for Equipement
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function CommandePage() {
  const modules = [
    {
      title: "Equipement",
      description: "Gérer les commandes d'équipement.",
      href: "/commande/equipement",
      icon: <ShoppingCart className="h-6 w-6 text-primary" />,
    },
    {
      title: "Nourriture & Boissons",
      description: "Gérer les commandes de nourriture et boissons.",
      href: "/commande/nourriture-boissons",
      icon: <Apple className="h-6 w-6 text-primary" />,
    },
    // Vous pourrez ajouter d'autres sous-modules de commande ici
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
        <h1 className="text-2xl font-bold">Module Commande</h1>
      </div>
      {modules.length > 0 ? (
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
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          <p>Aucun sous-module défini pour les commandes pour le moment.</p>
        </div>
      )}
    </div>
  );
}
