
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, Box, Apple } from 'lucide-react'; // Users icon removed

export default function StockPage() {
  const modules = [
    {
      title: "Équipement",
      description: "Gérer les équipements du club.",
      href: "/stock/equipement",
      icon: <Box className="h-6 w-6 text-primary" />,
    },
    {
      title: "Nourriture & Boissons",
      description: "Gérer les stocks de nourriture et boissons.",
      href: "/stock/nourriture-boissons",
      icon: <Apple className="h-6 w-6 text-primary" />,
    },
    // { // Sportif module removed
    //   title: "Sportif",
    //   description: "Gérer le matériel sportif spécifique.",
    //   href: "/stock/sportif",
    //   icon: <Users className="h-6 w-6 text-primary" />,
    // },
  ];

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="icon" asChild className="mr-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Gestion des Stocks</h1>
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
      </div>
    </div>
  );
}
