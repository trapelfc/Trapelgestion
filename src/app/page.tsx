
'use client'; // Make it a client component

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Package, UserPlus, Database, CalendarDays, ShieldCheck, Mail, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/auth-context'; // Import useAuth
import { getStoredRolePermissions } from '@/config/roles-constants'; 
import type { ReactNode } from 'react'; // Import ReactNode for icon type
import { useState, useEffect } from 'react'; 

interface ModuleConfig {
  title: string;
  icon: React.ElementType; // LucideIcon is too specific if we want to allow other icon types later
  href: string;
  description: string;
}

// Define constants outside the component to prevent re-creation on every render
const ALL_POSSIBLE_MODULES: ModuleConfig[] = [
  {
    title: "Planning",
    icon: CalendarDays,
    href: "/planning",
    description: "Gérer les plannings du club.",
  },
  {
    title: "Inscriptions",
    icon: UserPlus,
    href: "/inscription",
    description: "Gérer les inscriptions des membres.",
  },
  {
    title: "Gestion des Stocks",
    icon: Package,
    href: "/stock",
    description: "Accéder au module de gestion des stocks.",
  },
  {
    title: "Data",
    icon: Database,
    href: "/data",
    description: "Consulter les données de l'application.",
  },
  {
    title: "Mails",
    icon: Mail,
    href: "/mails",
    description: "Gérer les communications par email.",
  },
  {
    title: "Commande",
    icon: ShoppingCart,
    href: "/commande",
    description: "Gérer les commandes du club.",
  },
  {
    title: "Administration",
    icon: ShieldCheck,
    href: "/administration",
    description: "Gérer les paramètres et utilisateurs.",
  },
];

const ORDERED_MODULE_HREFS = [
  "/planning",
  "/inscription",
  "/stock",
  "/data",
  "/mails",
  "/commande",
  "/administration",
];

export default function HomePage() {
  const { currentUser } = useAuth();
  const [visibleModules, setVisibleModules] = useState<ModuleConfig[]>([]);

  useEffect(() => {
    if (currentUser) {
      const rolePermissions = getStoredRolePermissions();
      const userPermissions = rolePermissions[currentUser.roleId] || [];

      const filtered = ALL_POSSIBLE_MODULES.filter(module => {
        if (currentUser.roleId === 'administrateur') {
          return true; 
        }
        return userPermissions.includes(module.href) || 
               userPermissions.some(perm => perm.startsWith(module.href + '/'));
      });
      
      const sortedFilteredModules = filtered
        .slice() 
        .sort((a, b) => {
          return ORDERED_MODULE_HREFS.indexOf(a.href) - ORDERED_MODULE_HREFS.indexOf(b.href);
        });

      setVisibleModules(sortedFilteredModules);
    } else {
      setVisibleModules([]); 
    }
  // Only currentUser needs to be a direct dependency here, as the other arrays are now stable.
  // However, including them doesn't hurt as they are stable.
  }, [currentUser]);


  return (
    <div className="flex min-h-[calc(100vh-var(--header-height)-var(--footer-height))] flex-col items-center justify-center p-4">
      {visibleModules.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleModules.map((module) => (
            <Link href={module.href} key={module.title} legacyBehavior>
              <a className="block transform transition-all duration-300 hover:scale-105">
                <Card className="h-full shadow-lg hover:shadow-xl">
                  <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                    <module.icon className="h-6 w-6 text-primary" />
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
            {currentUser ? (
                <p>Aucun module accessible avec vos permissions actuelles.</p>
            ) : (
                <p>Chargement des modules...</p> 
            )}
        </div>
      )}
    </div>
  );
}
