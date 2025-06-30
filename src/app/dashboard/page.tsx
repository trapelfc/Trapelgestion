
import Link from 'next/link';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/actions';
import { getSession } from '@/lib/session';
import { menuConfig } from '@/lib/roles';

export default async function DashboardPage() {
  const session = await getSession();
  const userPermissions = session?.permissions || [];

  const menuItems = menuConfig.filter(item => {
    // Show the main module card if the user has permission for the main page
    // OR if they have permission for at least one of its sub-modules.
    return userPermissions.includes(item.href) || 
           item.subModules.some(sub => userPermissions.includes(sub.href));
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-8 relative">
       <div className="absolute top-4 right-4">
        <form action={logout}>
          <Button type="submit" variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </form>
      </div>

      <div className="flex flex-col items-center gap-4 mb-12 text-center">
        <Image
          src="https://cdn-transverse.azureedge.net/phlogos/BC548191.jpg"
          alt="Trapel Football Club Logo"
          width={64}
          height={64}
          className="rounded-full"
        />
        <div>
            <h1 className="text-4xl font-bold font-headline text-foreground">Trapel Football Club</h1>
            <p className="text-muted-foreground mt-2">Tableau de bord de gestion</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {menuItems.map((item) => {
          const Icon = item.icon;
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
    </div>
  );
}
