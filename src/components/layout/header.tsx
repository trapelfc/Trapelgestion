
'use client'; 

import Link from "next/link";
import { LayersIcon, LogOut } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context"; 

export function Header() {
  const { currentUser, logout } = useAuth(); 

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <LayersIcon className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg text-foreground">Menu Principal</span>
          </Link>
        </div>
        <nav className="flex items-center space-x-2">
          {siteConfig.navLinks.map((link) => (
            <Button key={link.href} variant="ghost" asChild className="hidden md:inline-flex">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          {currentUser && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Connecté: {currentUser.nom} {/* Changed from currentUser.email */}
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="mr-1.5 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
