"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { UserPlus, Archive, Mail, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MainNav() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/inscription', label: 'Inscription', icon: UserPlus },
    { href: '/stock', label: 'Stock', icon: Archive },
    { href: '/mail', label: 'Mail', icon: Mail },
    { href: '/administration', label: 'Administration', icon: Settings },
  ];

  return (
    <SidebarMenu>
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={isActive} className={cn("justify-start", isActive && "bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary")}>
              <Link href={item.href}>
                <Icon className="h-5 w-5" />
                <span className="text-base">{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
