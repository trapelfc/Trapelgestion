
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Archive } from "lucide-react";
import { getSession } from "@/lib/session";
import { menuConfig } from "@/lib/roles";

export default async function DataPage() {
  const session = await getSession();
  const userPermissions = session?.permissions || [];
  const dataModule = menuConfig.find(m => m.href === '/data');

  const iconMap = {
    '/data/annee-en-cours': CalendarCheck,
    '/data/annees-anterieures': Archive,
  } as const;

  const dataModules = dataModule?.subModules.filter(item => userPermissions.includes(item.href)) || [];

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Link>
        </Button>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Données et Statistiques</CardTitle>
          <CardDescription>
            Consultez les données et statistiques du club pour la saison en cours ou les archives.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {dataModules.map((item) => {
                const Icon = iconMap[item.href as keyof typeof iconMap] || CalendarCheck;
                return (
                    <Link href={item.href} key={item.href} className="group block">
                        <Card className="w-40 h-40 flex flex-col justify-center items-center text-center shadow-lg rounded-xl transform transition-all duration-300 ease-in-out group-hover:scale-105 group-hover:shadow-2xl group-hover:-translate-y-2">
                        <CardContent className="flex flex-col items-center justify-center gap-3 p-4">
                            <Icon className="h-12 w-12 text-primary transition-transform duration-300 group-hover:scale-110" />
                            <span className="text-base font-semibold text-card-foreground">{item.label}</span>
                        </CardContent>
                        </Card>
                    </Link>
                );
                })}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
