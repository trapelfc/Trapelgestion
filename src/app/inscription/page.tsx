
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, UserPlus, CreditCard, Shirt, Home } from 'lucide-react'; // Home icon added

export default function InscriptionPage() {
  const modules = [
    {
      title: "Accueil",
      description: "Inscrire un nouveau membre au club.",
      href: "/inscription/nouveau-licencie",
      icon: <UserPlus className="h-6 w-6 text-primary" />,
    },
    {
      title: "Paiements",
      description: "Gérer les paiements des licenciés.",
      href: "/inscription/paiement",
      icon: <CreditCard className="h-6 w-6 text-primary" />,
    },
    {
      title: "Equipement",
      description: "Gérer l'équipement des licenciés.",
      href: "/inscription/equipement",
      icon: <Shirt className="h-6 w-6 text-primary" />,
    },
    {
      title: "Accueil invité",
      description: "Interface pour l'accueil des invités.",
      href: "/inscription/accueil-invite",
      icon: <Home className="h-6 w-6 text-primary" />,
    },
  ];

  // Mettre les modules dans l'ordre souhaité (si nécessaire)
  const orderedModules = modules; // Pour l'instant, l'ordre ci-dessus est conservé

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour au Menu Principal</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Inscriptions</h1>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {orderedModules.map((module) => (
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
