
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Package, ClipboardList, Tags, Users } from "lucide-react";
import { getSession } from "@/lib/session";
import { adminListSubmodules } from "@/lib/roles";

const iconMap = {
    '/administration/listes/categories-licencies': Users,
    '/administration/listes/packs': Package,
    '/administration/listes/equipements': ClipboardList,
    '/administration/listes/categories': Tags,
} as const;

export default async function ListesPage() {
    const session = await getSession();
    const userPermissions = session?.permissions || [];

    const menuItems = adminListSubmodules.filter(item => userPermissions.includes(item.href));

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/administration">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Gestion des listes</CardTitle>
          <CardDescription>
            Modifiez les options disponibles dans les listes déroulantes de l'application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
            {menuItems.map(item => {
                const Icon = iconMap[item.href as keyof typeof iconMap];
                let description = '';
                switch(item.href) {
                    case '/administration/listes/categories-licencies':
                        description = 'Gérer les catégories par âge pour les licenciés.';
                        break;
                    case '/administration/listes/packs':
                        description = 'Gérer les différents packs d\'équipement.';
                        break;
                    case '/administration/listes/equipements':
                        description = 'Gérer les types d\'équipement (T-shirt, short, etc.).';
                        break;
                    case '/administration/listes/categories':
                        description = 'Gérer les catégories (Haut, Bas, Accessoire...).';
                        break;
                }

                return (
                    <div key={item.href} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                            <Icon className="h-6 w-6 text-muted-foreground" />
                            <div>
                                <p className="font-semibold">{item.label}</p>
                                <p className="text-sm text-muted-foreground">{description}</p>
                            </div>
                        </div>
                        <Button asChild>
                            <Link href={item.href}>Gérer</Link>
                        </Button>
                    </div>
                );
            })}
        </CardContent>
      </Card>
    </div>
  );
}
