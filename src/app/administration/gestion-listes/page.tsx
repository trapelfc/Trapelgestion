
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Users, Package, Ruler, Footprints, Warehouse, Truck, Archive, SquareLibrary, Building, Apple } from 'lucide-react';

export default function GestionListesPage() {
  const listModules = [
    {
      title: "Catégories des Licenciés",
      description: "Gérer les catégories d'âge pour les licenciés.",
      href: "/administration/gestion-listes/categories-licencies",
      icon: <Users className="h-6 w-6 text-primary" />,
    },
    {
      title: "Gestion des Packs",
      description: "Gérer les différents packs proposés aux licenciés.",
      href: "/administration/gestion-listes/packs-licencies",
      icon: <Package className="h-6 w-6 text-primary" />,
    },
    {
      title: "Tailles des Vêtements",
      description: "Gérer la liste des tailles disponibles pour les vêtements.",
      href: "/administration/gestion-listes/tailles-vetements",
      icon: <Ruler className="h-6 w-6 text-primary" />,
    },
    {
      title: "Tailles des Chaussettes",
      description: "Gérer la liste des tailles pour les chaussettes.",
      href: "/administration/gestion-listes/tailles-chaussettes",
      icon: <Footprints className="h-6 w-6 text-primary" />,
    },
    {
      title: "Lieux de Stock (Nourriture)",
      description: "Gérer les lieux de stockage pour la nourriture et les boissons.",
      href: "/administration/gestion-listes/lieux-stock-nourriture",
      icon: <Warehouse className="h-6 w-6 text-primary" />,
    },
    // { // Lieux de Stock (Sportif) module removed
    //   title: "Lieux de Stock (Sportif)",
    //   description: "Gérer les lieux de stockage pour le matériel sportif.",
    //   href: "/administration/gestion-listes/lieux-stock-sportif",
    //   icon: <Warehouse className="h-6 w-6 text-primary" />, 
    // },
    {
      title: "Fournisseurs",
      description: "Gérer la liste des fournisseurs pour la nourriture.",
      href: "/administration/gestion-listes/fournisseurs-nourriture",
      icon: <Truck className="h-6 w-6 text-primary" />,
    },
    {
      title: "Vêtement sportif",
      description: "Gérer les types de vêtement sportif.",
      href: "/administration/gestion-listes/articles-stock",
      icon: <Archive className="h-6 w-6 text-primary" />,
    },
    {
      title: "Nourriture & Boissons (Listes)",
      description: "Gérer des listes spécifiques (menus types, etc.).",
      href: "/administration/gestion-listes/listes-nourriture-boissons",
      icon: <Apple className="h-6 w-6 text-primary" />,
    },
    {
      title: "Stades (Planning)",
      description: "Gérer les stades et leur subdivision.",
      href: "/administration/gestion-listes/unites-stades",
      icon: <SquareLibrary className="h-6 w-6 text-primary" />,
    },
    {
      title: "Annexes (Planning)",
      description: "Gérer les annexes et leur subdivision.",
      href: "/administration/gestion-listes/annexes",
      icon: <Building className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/administration">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour au Module Administration</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Gestion des Listes</h1>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listModules.map((module) => (
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
         {listModules.length === 0 && (
           <div className="text-center text-muted-foreground col-span-full">
            <p>Aucun module de gestion de listes disponible pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
