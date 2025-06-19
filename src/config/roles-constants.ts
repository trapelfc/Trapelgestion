
// src/config/roles-constants.ts
import type { AppModule } from './app-modules';
import { APP_MODULES } from './app-modules';

export interface Role {
  id: string;
  label: string;
  description: string;
  isDefault?: boolean; 
}

export const INITIAL_ROLES: Role[] = [
  {
    id: 'administrateur',
    label: 'Administrateur',
    description: "Accès complet à toutes les fonctionnalités, y compris l'administration et la configuration.",
    isDefault: true,
  },
  {
    id: 'moderateur',
    label: 'Modérateur',
    description: "Accès étendu à la gestion du contenu et des utilisateurs, mais pas aux configurations critiques.",
    isDefault: true,
  },
  {
    id: 'membre',
    label: 'Membre',
    description: "Accès standard aux fonctionnalités de base de l'application une fois connecté.",
    isDefault: true,
  },
  {
    id: 'invite',
    label: 'Invité',
    description: "Accès limité aux fonctionnalités publiques, généralement pour l'inscription ou la consultation.",
    isDefault: true,
  },
];

export type RoleId = typeof INITIAL_ROLES[number]['id'];

export const ROLES_STORAGE_KEY = 'TRAPEL_FC_ROLES_DATA';
export const ROLE_PERMISSIONS_STORAGE_KEY = 'TRAPEL_FC_ROLE_PERMISSIONS_DATA';

export type RolePermissions = Record<RoleId, string[]>; // string[] est une liste d'AppModule['id'] (chemins complets)

export const getStoredRoles = (): Role[] => {
  if (typeof window === 'undefined') return [...INITIAL_ROLES].sort((a, b) => a.label.localeCompare(b.label));
  const stored = localStorage.getItem(ROLES_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Role[];
      if (Array.isArray(parsed) && parsed.every(item => item.id && item.label && item.description !== undefined)) {
        return parsed.map(role => ({
          ...role,
          isDefault: INITIAL_ROLES.some(initRole => initRole.id === role.id)
        })).sort((a, b) => a.label.localeCompare(b.label));
      }
    } catch (e) {
      console.error("Failed to parse roles from localStorage", e);
    }
  }
  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(INITIAL_ROLES.map(({isDefault, ...rest}) => rest)));
  return [...INITIAL_ROLES].sort((a, b) => a.label.localeCompare(b.label));
};

export const saveStoredRoles = (roles: Role[]) => {
  if (typeof window === 'undefined') return;
  const rolesToSave = roles.map(({ isDefault: _isDefault, ...rest }) => rest);
  localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(rolesToSave));
  window.dispatchEvent(new StorageEvent('storage', { key: ROLES_STORAGE_KEY }));
};


export const getStoredRolePermissions = (): RolePermissions => {
  if (typeof window === 'undefined') {
    // Default permissions for server-side or initial state
    const defaultPermissions: RolePermissions = {};
    INITIAL_ROLES.forEach(role => {
      if (role.id === 'administrateur') {
        defaultPermissions[role.id] = APP_MODULES.map(module => module.id); // Accès à TOUTES les routes définies
      } else {
        defaultPermissions[role.id] = []; 
      }
    });
    return defaultPermissions;
  }

  const stored = localStorage.getItem(ROLE_PERMISSIONS_STORAGE_KEY);
  let parsedPermissions: RolePermissions = {};
  if (stored) {
    try {
      parsedPermissions = JSON.parse(stored) as RolePermissions;
    } catch (e) {
      console.error("Failed to parse role permissions from localStorage", e);
      parsedPermissions = {}; // Start fresh if parsing fails
    }
  }

  const currentRoles = getStoredRoles(); // Get all defined roles (initial + custom)
  const finalPermissions: RolePermissions = {};

  currentRoles.forEach(role => {
    if (role.id === 'administrateur') {
      finalPermissions[role.id] = APP_MODULES.map(module => module.id); // Admin always gets all
    } else if (parsedPermissions[role.id]) {
      // Filter out permissions for modules that no longer exist
      finalPermissions[role.id] = parsedPermissions[role.id].filter(permId => 
        APP_MODULES.some(appModule => appModule.id === permId)
      );
    } else {
      finalPermissions[role.id] = []; // New roles get no permissions by default
    }
  });
  
  // Save back to ensure all roles are present and admin has full rights,
  // and non-existent permissions are cleaned up.
  localStorage.setItem(ROLE_PERMISSIONS_STORAGE_KEY, JSON.stringify(finalPermissions));
  return finalPermissions;
};

export const saveStoredRolePermissions = (permissions: RolePermissions) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROLE_PERMISSIONS_STORAGE_KEY, JSON.stringify(permissions));
  window.dispatchEvent(new StorageEvent('storage', { key: ROLE_PERMISSIONS_STORAGE_KEY }));
};

