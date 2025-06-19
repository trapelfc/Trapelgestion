// src/config/member-constants.ts
import type { RoleId } from './roles-constants';

export interface AppMember {
  id: string;
  nom: string; // Utilisé comme login
  email: string; // Doit être unique
  roleId: RoleId;
  password?: string; // **ATTENTION: Stockage en clair non sécurisé, pour prototypage uniquement!**
}

export const APP_MEMBERS_STORAGE_KEY = 'TRAPEL_FC_APP_MEMBERS_DATA';

const INITIAL_ADMIN_MEMBER: AppMember = {
  id: 'default-admin-001',
  nom: 'admin', // Login
  email: 'admin@trapelfc.local', // Email par défaut, peut être modifié via l'interface
  roleId: 'administrateur',
  password: 'admin', // Mot de passe par défaut
};

export const getAppMembers = (): AppMember[] => {
  if (typeof window === 'undefined') return [{ ...INITIAL_ADMIN_MEMBER }];

  const stored = localStorage.getItem(APP_MEMBERS_STORAGE_KEY);
  let members: AppMember[] = [];
  let needsSave = false;

  if (stored) {
    try {
      const parsed = JSON.parse(stored) as AppMember[];
      if (Array.isArray(parsed) && parsed.every(item => item.id && item.nom && item.email && item.roleId)) {
        members = parsed;
      } else {
        members = [{ ...INITIAL_ADMIN_MEMBER }];
        needsSave = true;
      }
    } catch (e) {
      console.error("Failed to parse app members from localStorage, re-initializing.", e);
      members = [{ ...INITIAL_ADMIN_MEMBER }];
      needsSave = true;
    }
  } else {
    members = [{ ...INITIAL_ADMIN_MEMBER }];
    needsSave = true;
  }

  const adminMemberIndex = members.findIndex(member => member.nom.toLowerCase() === INITIAL_ADMIN_MEMBER.nom.toLowerCase());
  
  if (adminMemberIndex === -1) {
    members.push({ ...INITIAL_ADMIN_MEMBER });
    needsSave = true;
  } else {
    // Ensure existing admin has the correct role and default password if it was missing or different
    if (members[adminMemberIndex].roleId !== 'administrateur') {
      members[adminMemberIndex].roleId = 'administrateur';
      needsSave = true;
    }
    // If password was undefined or an empty string, set it to the default 'admin'
    // This ensures existing setups or faulty manual edits get corrected to the new default.
    if (members[adminMemberIndex].password === undefined || members[adminMemberIndex].password === '') {
      members[adminMemberIndex].password = 'admin';
      needsSave = true;
    }
  }

  if (needsSave && typeof window !== 'undefined') {
    localStorage.setItem(APP_MEMBERS_STORAGE_KEY, JSON.stringify(members));
  }

  return members.sort((a, b) => a.nom.localeCompare(b.nom));
};

export const saveAppMembers = (members: AppMember[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(APP_MEMBERS_STORAGE_KEY, JSON.stringify(members));
  window.dispatchEvent(new StorageEvent('storage', { key: APP_MEMBERS_STORAGE_KEY, newValue: JSON.stringify(members) }));
};
