
import {
  UserPlus,
  Archive,
  Mail,
  Settings,
  Database,
  type LucideIcon,
} from 'lucide-react';
import { menuConfigData, adminListSubmodules as adminListSubmodulesData, SubModule } from './menu-config';

// Map icon names to components
const iconMap: Record<string, LucideIcon> = {
  UserPlus,
  Archive,
  Mail,
  Settings,
  Database,
};


export interface ModuleConfig {
  label: string;
  icon: LucideIcon;
  href: string; // The main landing page for the module
  subModules: SubModule[];
}

// Hydrate the config with icon components
export const menuConfig: ModuleConfig[] = menuConfigData.map(item => ({
  ...item,
  icon: iconMap[item.iconName] || Settings, // Fallback to a default icon
}));

export const adminListSubmodules = adminListSubmodulesData;

// Helper to get all application routes for the middleware
// This is now in menu-config.ts to avoid importing react components in middleware
export { getAllAppRoutes } from './menu-config';
