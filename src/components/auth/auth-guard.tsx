
'use client';

import { useAuth } from '@/context/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { getStoredRolePermissions } from '@/config/roles-constants'; // Ajouté
import { useToast } from '@/hooks/use-toast'; // Ajouté

export function AuthGuard({ children }: { children: ReactNode }) {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast(); // Ajouté

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!currentUser) {
        // Utilisateur non connecté
        if (pathname !== '/login') {
          router.replace('/login');
        }
      } else {
        // Utilisateur connecté
        if (pathname === '/login') {
          router.replace('/'); // Si connecté et sur login, rediriger vers l'accueil
          return;
        }

        const rolePermissions = getStoredRolePermissions();
        const userPermissions = rolePermissions[currentUser.roleId] || [];

        // L'admin a toujours accès à tout (vérifié par le fait que getStoredRolePermissions lui donne tous les modules)
        // La page d'accueil est accessible à tous les utilisateurs connectés pour le moment.
        const isAllowed =
          currentUser.roleId === 'administrateur' ||
          pathname === '/' || // La page d'accueil est accessible
          userPermissions.includes(pathname);

        if (!isAllowed) {
          toast({
            title: "Accès non autorisé",
            description: "Vous n'avez pas les permissions nécessaires pour accéder à cette page.",
            variant: "destructive",
          });
          router.replace('/'); // Rediriger vers l'accueil si non autorisé
        }
      }
    }
  }, [currentUser, isLoadingAuth, pathname, router, toast]);

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Chargement de l'application...</p>
      </div>
    );
  }

  // Si l'utilisateur n'est pas connecté et qu'il n'est pas sur /login,
  // useEffect s'occupera de la redirection. Retourner null évite un flash de contenu.
  if (!currentUser && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
