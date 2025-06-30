
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { unstable_cache as cache } from 'next/cache';
import type { Category, EquipmentItem, Pack, Size, LicenseeCategory, AppSettings, Licensee, LegalRepresentative, PaymentMethod, AppliedReduction, AssignedEquipment, StockEntry, PendingEmail, Reduction, EmailTemplates, PdfTemplates, User, LoginState, Role } from './types';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { sendEmail } from './email';
import { createSession, deleteSession } from './session';
import { redirect } from 'next/navigation';
import { getAllAppRoutes } from './menu-config';


// Helper functions to read and write to our JSON "database"
const dbDirectory = path.join(process.cwd(), 'src', 'lib', 'db');

async function readDbFile<T>(filename: string): Promise<T> {
  const filePath = path.join(dbDirectory, filename);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error(`Database file ${filename} not found. Please ensure it exists.`);
      // Depending on the file, we might return a default structure
      if (filename === 'settings.json') return { referenceSeason: new Date().getFullYear(), reductions: [], clubInfo: { name: 'Trapel Football Club', address: 'Adresse à compléter' } } as T;
      if (filename === 'stock.json') return [] as T;
      if (filename === 'pending-emails.json') return [] as T;
      if (filename === 'email-templates.json') return { paymentConfirmation: {}, equipmentComplete: {}, equipmentIncomplete: {} } as T;
      if (filename === 'pdf-templates.json') return { orderForm: {}, donationReceipt: {} } as T;
      if (filename === 'users.json') return [] as T;
      if (filename === 'roles.json') return [] as T;
      if (filename.startsWith('archive-')) return [] as T; // Return empty array for non-existent archives
      return [] as T;
    }
    throw error;
  }
}

async function writeDbFile(filename: string, data: any): Promise<void> {
  const filePath = path.join(dbDirectory, filename);
  await fs.mkdir(dbDirectory, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}


// --- USER & AUTH ACTIONS ---

export const getUsers = cache(
    async (): Promise<User[]> => {
      try {
        const users = await readDbFile<User[]>('users.json');
        return users;
      } catch (e) {
        return [];
      }
    },
    ['users'],
    { tags: ['users'] }
);

export async function login(state: LoginState, data: FormData): Promise<LoginState> {
  const { username, password } = Object.fromEntries(data);
  const users = await getUsers();
  const user = users.find(u => u.username === username);

  if (!user || user.password !== password) {
    return { success: false, error: 'Identifiants invalides' };
  }
  
  let permissions: string[] = [];
  if (user.role === 'admin') {
      // The admin role gets all possible permissions programmatically.
      permissions = Array.from(getAllAppRoutes());
  } else {
      // Other roles get their permissions from the configuration file.
      const allRoles = await getRoles();
      const userRole = allRoles.find(r => r.name === user.role);
      permissions = userRole?.permissions || [];
  }

  await createSession({id: user.id, role: user.role}, permissions);
  
  return { success: true };
}


export async function logout() {
    await deleteSession();
    redirect('/login');
}

export async function addUser(userData: Omit<User, 'id'>) {
    const users = await getUsers();
    if (users.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
        throw new Error('Ce nom d\'utilisateur existe déjà.');
    }
    if (!userData.password || userData.password.length < 4) {
        throw new Error('Le mot de passe doit contenir au moins 4 caractères.');
    }

    const newUser: User = { ...userData, id: `user-${Date.now()}` };
    const updatedUsers = [...users, newUser];
    await writeDbFile('users.json', updatedUsers);
    revalidateTag('users');
}

export async function updateUser(updatedUser: User) {
    const users = await getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index > -1) {
        if (users.some(u => u.username.toLowerCase() === updatedUser.username.toLowerCase() && u.id !== updatedUser.id)) {
            throw new Error('Ce nom d\'utilisateur existe déjà.');
        }

        if (updatedUser.password && updatedUser.password.length > 0 && updatedUser.password.length < 4) {
             throw new Error('Le mot de passe doit contenir au moins 4 caractères.');
        }

        // If password is not provided or empty, keep the existing one
        if (!updatedUser.password || updatedUser.password.trim() === '') {
            updatedUser.password = users[index].password;
        }

        users[index] = updatedUser;
        await writeDbFile('users.json', users);
        revalidateTag('users');
    }
}

export async function deleteUser(id: string) {
    const users = await getUsers();
    if (users.length <= 1) {
        throw new Error("Vous ne pouvez pas supprimer le dernier utilisateur.");
    }
    const updatedUsers = users.filter(u => u.id !== id);
    await writeDbFile('users.json', updatedUsers);
    revalidateTag('users');
}


// --- ROLE ACTIONS ---
export const getRoles = cache(
    async (): Promise<Role[]> => readDbFile<Role[]>('roles.json'),
    ['roles'],
    { tags: ['roles'] }
);

export async function updateRoles(roles: Role[]) {
    await writeDbFile('roles.json', roles);
    revalidateTag('roles');
    revalidateTag('session'); // Invalidate session cache if roles change
}


// --- CATEGORY ACTIONS ---
export const getCategories = cache(
    async (): Promise<Category[]> => readDbFile<Category[]>('categories.json'),
    ['categories'],
    { tags: ['categories'] }
);

export async function addCategory(categoryData: Omit<Category, 'id' | 'sizes'>) {
  const categories = await readDbFile<Category[]>('categories.json');
  const newCategory: Category = { ...categoryData, id: `cat-${Date.now()}`, sizes: [] };
  const updatedCategories = [...categories, newCategory];
  await writeDbFile('categories.json', updatedCategories);
  revalidateTag('categories');
}

export async function updateCategory(updatedCategory: Category) {
  let categories = await readDbFile<Category[]>('categories.json');
  const index = categories.findIndex(c => c.id === updatedCategory.id);
  if (index !== -1) {
    const oldCategoryName = categories[index].name;
    categories[index] = updatedCategory;
    await writeDbFile('categories.json', categories);
    
    if(oldCategoryName !== updatedCategory.name) {
        let equipements = await readDbFile<EquipmentItem[]>('equipements.json');
        equipements.forEach(equip => {
            if(equip.category === oldCategoryName) {
                equip.category = updatedCategory.name;
            }
        });
        await writeDbFile('equipements.json', equipements);
        revalidateTag('equipements');
    }
  }
  revalidateTag('categories');
}

export async function deleteCategory(id: string) {
  let categories = await readDbFile<Category[]>('categories.json');
  const updatedCategories = categories.filter(c => c.id !== id);
  await writeDbFile('categories.json', updatedCategories);
  revalidateTag('categories');
  revalidateTag('equipements');
}

export async function addSizeToCategory(categoryId: string, sizeName: string) {
  let categories = await readDbFile<Category[]>('categories.json');
  const category = categories.find(c => c.id === categoryId);
  if (category) {
    const newSize: Size = { id: `size-${Date.now()}`, name: sizeName };
    if (!category.sizes) category.sizes = [];
    category.sizes.push(newSize);
    category.sizes.sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
    await writeDbFile('categories.json', categories);
  }
  revalidateTag('categories');
}

export async function updateSizeInCategory(categoryId: string, updatedSize: Size) {
    let categories = await readDbFile<Category[]>('categories.json');
    const category = categories.find(c => c.id === categoryId);
    if (category && category.sizes) {
      const sizeIndex = category.sizes.findIndex(s => s.id === updatedSize.id);
      if (sizeIndex !== -1) {
          category.sizes[sizeIndex] = updatedSize;
          category.sizes.sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true}));
          await writeDbFile('categories.json', categories);
      }
    }
    revalidateTag('categories');
}

export async function deleteSizeInCategory(categoryId: string, sizeId: string) {
    let categories = await readDbFile<Category[]>('categories.json');
    const category = categories.find(c => c.id === categoryId);
    if (category && category.sizes) {
      category.sizes = category.sizes.filter(s => s.id !== sizeId);
      await writeDbFile('categories.json', categories);
    }
    revalidateTag('categories');
}


// --- EQUIPEMENT ACTIONS ---
export const getEquipements = cache(
    async (): Promise<EquipmentItem[]> => readDbFile<EquipmentItem[]>('equipements.json'),
    ['equipements'],
    { tags: ['equipements'] }
);

export async function addEquipement(equipementData: Omit<EquipmentItem, 'id'>) {
  const equipements = await readDbFile<EquipmentItem[]>('equipements.json');
  const newEquipement: EquipmentItem = { ...equipementData, id: `eq-${Date.now()}` };
  const updatedEquipements = [...equipements, newEquipement];
  await writeDbFile('equipements.json', updatedEquipements);
  revalidateTag('equipements');
  revalidateTag('packs');
}

export async function updateEquipement(updatedEquipement: EquipmentItem) {
  let equipements = await readDbFile<EquipmentItem[]>('equipements.json');
  let packs = await readDbFile<Pack[]>('packs.json');
  const index = equipements.findIndex(e => e.id === updatedEquipement.id);
  
  if (index !== -1) {
    const oldEquipementName = equipements[index].name;
    equipements[index] = updatedEquipement;
    await writeDbFile('equipements.json', equipements);
    
    if (oldEquipementName !== updatedEquipement.name) {
      packs.forEach(pack => {
        pack.composition = pack.composition.map(item => item === oldEquipementName ? updatedEquipement.name : item);
      });
      await writeDbFile('packs.json', packs);
      revalidateTag('packs');
    }
  }
  revalidateTag('equipements');
}

export async function deleteEquipement(id: string) {
    let equipements = await readDbFile<EquipmentItem[]>('equipements.json');
    let packs = await readDbFile<Pack[]>('packs.json');
    const equipementToDelete = equipements.find(e => e.id === id);

    if (equipementToDelete) {
        const updatedEquipements = equipements.filter(e => e.id !== id);
        await writeDbFile('equipements.json', updatedEquipements);

        packs.forEach(pack => {
            pack.composition = pack.composition.filter(item => item !== equipementToDelete.name);
        });
        await writeDbFile('packs.json', packs);

        revalidateTag('equipements');
        revalidateTag('packs');
    }
}


// --- PACK ACTIONS ---
export const getPacks = cache(
    async (): Promise<Pack[]> => readDbFile<Pack[]>('packs.json'),
    ['packs'],
    { tags: ['packs'] }
);

export async function addPack(packData: Omit<Pack, 'id'>) {
  const packs = await readDbFile<Pack[]>('packs.json');
  const newPack: Pack = { ...packData, id: `pack-${Date.now()}` };
  const updatedPacks = [...packs, newPack];
  await writeDbFile('packs.json', updatedPacks);
  revalidateTag('packs');
}

export async function updatePack(updatedPack: Pack) {
    let packs = await readDbFile<Pack[]>('packs.json');
    const index = packs.findIndex(p => p.id === updatedPack.id);
    if (index !== -1) {
        packs[index] = updatedPack;
        await writeDbFile('packs.json', packs);
    }
    revalidateTag('packs');
}

export async function deletePack(id: string) {
    let packs = await readDbFile<Pack[]>('packs.json');
    const updatedPacks = packs.filter(p => p.id !== id);
    await writeDbFile('packs.json', updatedPacks);
    revalidateTag('packs');
}


// --- LICENSEE CATEGORY ACTIONS ---
function getAgeRuleFromCategoryName(name: string): { type: 'range' | 'single' | 'seniors' | 'custom', values: number[] } | null {
    const upperName = name.trim().toUpperCase();

    if (name.startsWith("Loisirs") || !upperName.match(/^U\d/) && !upperName.startsWith('SENIORS')) {
        return { type: 'custom', values: [] };
    }
    
    if (upperName.startsWith('SENIORS')) {
        return { type: 'seniors', values: [19] };
    }
    
    const rangeMatch = upperName.match(/^U(\d+)-U(\d+)/);
    if (rangeMatch?.[1] && rangeMatch?.[2]) {
        return { type: 'range', values: [parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10)] };
    }
    
    const singleAgeMatch = upperName.match(/^U(\d+)/);
    if (singleAgeMatch?.[1]) {
        return { type: 'single', values: [parseInt(singleAgeMatch[1], 10)] };
    }

    return null;
}

function calculateAgeDescriptions(cats: LicenseeCategory[], referenceSeason: number): LicenseeCategory[] {
    return cats.map(category => {
        const ageRule = getAgeRuleFromCategoryName(category.name);
        
        if (!ageRule || ageRule.type === 'custom') {
            return category;
        }
        
        const isFeminine = category.name.trim().toUpperCase().includes(' F');
        const birthVerb = isFeminine ? 'Née' : 'Né';
        let newDescription = category.description;

        switch(ageRule.type) {
            case 'seniors': {
                const year = referenceSeason - ageRule.values[0];
                newDescription = `${birthVerb} avant ou en ${year}`;
                break;
            }
            case 'range': {
                const age1 = ageRule.values[0] - 1;
                const age2 = ageRule.values[1] - 1;
                const year1 = referenceSeason - Math.max(age1, age2);
                const year2 = referenceSeason - Math.min(age1, age2);
                newDescription = `${birthVerb} en ${year1} ou ${year2}`;
                break;
            }
            case 'single': {
                const age = ageRule.values[0] - 1;
                const year = referenceSeason - age;
                newDescription = `${birthVerb} en ${year}`;
                break;
            }
        }
        return { ...category, description: newDescription };
    });
}

export const getLicenseeCategories = cache(
    async (): Promise<LicenseeCategory[]> => {
        const currentSettings = await getSettings();
        const licenseeCategories = await readDbFile<LicenseeCategory[]>('licensee-categories.json');
        const recalculatedCategories = calculateAgeDescriptions(licenseeCategories, currentSettings.referenceSeason);
        return Promise.resolve(JSON.parse(JSON.stringify(recalculatedCategories)));
    },
    ['licensee-categories'],
    { tags: ['licensee-categories', 'settings'] }
);

export async function addLicenseeCategory(categoryData: Omit<LicenseeCategory, 'id'>) {
    const licenseeCategories = await readDbFile<LicenseeCategory[]>('licensee-categories.json');
    const newCategory: LicenseeCategory = { ...categoryData, id: `lc-${Date.now()}` };
    const updatedCategories = [...licenseeCategories, newCategory];
    await writeDbFile('licensee-categories.json', updatedCategories);
    revalidateTag('licensee-categories');
}

export async function updateLicenseeCategory(updatedData: Omit<LicenseeCategory, 'ageRule'>) {
    const licenseeCategories = await readDbFile<LicenseeCategory[]>('licensee-categories.json');
    const index = licenseeCategories.findIndex(c => c.id === updatedData.id);
    if (index !== -1) {
        licenseeCategories[index] = { ...licenseeCategories[index], ...updatedData };
        await writeDbFile('licensee-categories.json', licenseeCategories);
    }
    revalidateTag('licensee-categories');
}

export async function deleteLicenseeCategory(id: string) {
    let licenseeCategories = await readDbFile<LicenseeCategory[]>('licensee-categories.json');
    const updatedCategories = licenseeCategories.filter(c => c.id !== id);
    await writeDbFile('licensee-categories.json', updatedCategories);
    revalidateTag('licensee-categories');
}


// --- SETTINGS ACTIONS ---
export const getSettings = cache(
    async (): Promise<AppSettings> => {
        const settingsData = await readDbFile<Partial<AppSettings>>('settings.json');
        return {
            referenceSeason: settingsData.referenceSeason ?? new Date().getFullYear(),
            reductions: settingsData.reductions ?? [],
            clubInfo: settingsData.clubInfo ?? { name: 'Trapel Football Club', address: 'Adresse à compléter', email: '', phone: '', responsibleName: '', facebookUrl: '', instagramUrl: '' },
        };
    },
    ['settings'],
    { tags: ['settings'] }
);

export async function updateSettings(updatedSettings: AppSettings) {
    await writeDbFile('settings.json', updatedSettings);
    revalidateTag('settings');
    revalidateTag('licensee-categories');
}


// --- TEMPLATE & EMAIL ACTIONS ---
export const getEmailTemplates = cache(
    async (): Promise<EmailTemplates> => {
        const templates = await readDbFile<EmailTemplates>('email-templates.json');
        return templates;
    },
    ['email-templates'],
    { tags: ['email-templates'] }
);

export async function updateEmailTemplates(templates: EmailTemplates) {
    await writeDbFile('email-templates.json', templates);
    revalidateTag('email-templates');
}

export const getPdfTemplates = cache(
    async (): Promise<PdfTemplates> => {
        const templates = await readDbFile<any>('pdf-templates.json');
        
        const defaultOrderForm = {
            title: 'Bon de Commande',
            headerText: 'Généré le {{currentDate}} par {{clubName}}',
            footerText: 'Merci de votre commande. Pour toute question...'
        };
        const defaultDonationReceipt = {
            title: 'Reçu de Don',
            headerText: 'Généré le {{currentDate}} pour {{recipientName}}',
            footerText: 'Merci pour votre générosité.'
        };

        return {
            orderForm: {
                ...defaultOrderForm,
                ...(templates?.orderForm ?? {}),
            },
            donationReceipt: {
                ...defaultDonationReceipt,
                ...(templates?.donationReceipt ?? {}),
            }
        };
    },
    ['pdf-templates'],
    { tags: ['pdf-templates'] }
);

export async function updatePdfTemplates(templates: PdfTemplates) {
    await writeDbFile('pdf-templates.json', templates);
    revalidateTag('pdf-templates');
}

function renderTemplate(template: string, context: Record<string, string>): string {
    let rendered = template;
    for (const key in context) {
        rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), context[key]);
    }
    return rendered;
}

function formatEquipmentListHTML(items: AssignedEquipment[]): string {
    let listHtml = '<ul>';
    items.forEach(item => {
        listHtml += `<li>${item.name} (${item.size})${item.outOfStock ? ' <strong style="color: #dc2626;">- En rupture</strong>' : ''}</li>`;
    });
    listHtml += '</ul>';
    return listHtml;
}

async function createAndQueueEmail(
    templateType: keyof EmailTemplates, 
    licensee: Licensee,
    context: Record<string, string>
) {
    const templates = await getEmailTemplates();
    const settings = await getSettings();
    const template = templates[templateType];

    if (!template || !template.subject || !template.body) {
        console.error(`Email template "${templateType}" is missing or incomplete.`);
        return;
    }
    
    const clubContext = {
        clubName: settings.clubInfo?.name || '',
        clubAddress: settings.clubInfo?.address?.replace(/\n/g, '<br />') || '',
        clubEmail: settings.clubInfo?.email || '',
        clubPhone: settings.clubInfo?.phone || '',
        clubResponsibleName: settings.clubInfo?.responsibleName || '',
        clubFacebookUrl: settings.clubInfo?.facebookUrl || '',
        clubInstagramUrl: settings.clubInfo?.instagramUrl || '',
    };

    const recipient = licensee.legalRepresentative || licensee;
    const allContext = {
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        licenseeName: `${licensee.firstName} ${licensee.lastName}`,
        ...clubContext,
        ...context
    };

    const subject = renderTemplate(template.subject, allContext);
    const body = renderTemplate(template.body, allContext);

    const pendingEmails = await readDbFile<PendingEmail[]>('pending-emails.json');
    const newEmail: PendingEmail = {
        id: `email-${Date.now()}`,
        licenseeId: licensee.id,
        recipientName: allContext.recipientName,
        recipientEmail: recipient.email,
        subject,
        body,
        status: 'pending',
        createdAt: new Date(),
    };
  
    pendingEmails.unshift(newEmail);
    await writeDbFile('pending-emails.json', pendingEmails);
    revalidateTag('pending-emails');
}

// --- PENDING EMAIL ACTIONS ---
export const getPendingEmails = cache(
    async (): Promise<PendingEmail[]> => {
        const emails = await readDbFile<PendingEmail[]>('pending-emails.json');
        return emails
            .filter(email => email.status === 'pending')
            .map(email => ({
                ...email,
                createdAt: new Date(email.createdAt),
                sentAt: email.sentAt ? new Date(email.sentAt) : undefined,
            }));
    },
    ['pending-emails'],
    { tags: ['pending-emails'] }
);

export const getArchivedEmails = cache(
    async (): Promise<PendingEmail[]> => {
        const emails = await readDbFile<PendingEmail[]>('pending-emails.json');
        return emails
            .filter(email => email.status === 'sent')
            .map(email => ({
                ...email,
                createdAt: new Date(email.createdAt),
                sentAt: email.sentAt ? new Date(email.sentAt) : undefined,
            }))
            .sort((a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0));
    },
    ['pending-emails'],
    { tags: ['pending-emails'] }
);


export async function deletePendingEmail(id: string) {
    const emails = await readDbFile<PendingEmail[]>('pending-emails.json');
    const updatedEmails = emails.filter(email => email.id !== id);
    await writeDbFile('pending-emails.json', updatedEmails);
    revalidateTag('pending-emails');
}

export async function sendPendingEmail(id: string) {
    let emails = await readDbFile<PendingEmail[]>('pending-emails.json');
    const emailIndex = emails.findIndex(email => email.id === id);
    if (emailIndex !== -1) {
        const emailToSend = emails[emailIndex];
        if (emailToSend.status !== 'pending') return;

        try {
            await sendEmail({
                to: emailToSend.recipientEmail,
                toName: emailToSend.recipientName,
                subject: emailToSend.subject,
                html: emailToSend.body,
            });

            emails[emailIndex].status = 'sent';
            emails[emailIndex].sentAt = new Date();
            await writeDbFile('pending-emails.json', emails);
            revalidateTag('pending-emails');
        } catch (error) {
            console.error(`Failed to send email ${id}:`, error);
            throw new Error('Failed to send email. Check server logs.');
        }
    } else {
        throw new Error('Email not found.');
    }
}

export async function sendMultiplePendingEmails(ids: string[]) {
    let emails = await readDbFile<PendingEmail[]>('pending-emails.json');
    const emailsToSend = ids.map(id => emails.find(e => e.id === id && e.status === 'pending')).filter(Boolean) as PendingEmail[];

    if (emailsToSend.length === 0) {
        return;
    }

    let successfulSends = 0;
    for (const email of emailsToSend) {
        try {
            await sendEmail({
                to: email.recipientEmail,
                toName: email.recipientName,
                subject: email.subject,
                html: email.body,
            });
            
            const index = emails.findIndex(e => e.id === email.id);
            if (index !== -1) {
                emails[index].status = 'sent';
                emails[index].sentAt = new Date();
                successfulSends++;
            }
        } catch (error) {
            console.error(`Failed to send email to ${email.recipientEmail}:`, error);
        }
    }

    if (successfulSends > 0) {
        await writeDbFile('pending-emails.json', emails);
        revalidateTag('pending-emails');
    }

    if (successfulSends < emailsToSend.length) {
        const failedCount = emailsToSend.length - successfulSends;
        throw new Error(`${failedCount} email(s) could not be sent. Check server logs for details.`);
    }
}


// --- LICENSEE (MEMBER) ACTIONS ---
export const getLicensees = cache(
    async (): Promise<Licensee[]> => {
        const licensees = await readDbFile<any[]>('licensees.json');
        return licensees.map(lic => ({
            ...lic,
            registrationDate: new Date(lic.registrationDate),
            dateOfBirth: new Date(lic.dateOfBirth),
            paymentStatus: lic.paymentStatus || 'En attente',
            equipmentStatus: lic.equipmentStatus || 'En attente',
            paymentMethod: lic.paymentMethod,
            paymentDate: lic.paymentDate ? new Date(lic.paymentDate) : undefined,
            amountPaid: lic.amountPaid,
            paymentComment: lic.paymentComment,
            reductions: lic.reductions || [],
            assignedEquipment: lic.assignedEquipment || [],
            legalRepresentative: lic.legalRepresentative ? {
                ...lic.legalRepresentative,
                dateOfBirth: new Date(lic.legalRepresentative.dateOfBirth),
            } : undefined
        }));
    },
    ['licensees'],
    { tags: ['licensees'] }
);

const FormLegalRepresentativeSchema = z.object({
    lastName: z.string().min(2).optional(),
    firstName: z.string().min(2).optional(),
    dateOfBirth: z.date().optional(),
    placeOfBirth: z.string().min(2).optional(),
    bornAbroad: z.boolean().default(false).optional(),
    email: z.string().email().optional(),
    fatherPhone: z.string().optional(),
    motherPhone: z.string().optional(),
}).optional();
  
const LicenseeFormSchema = z.object({
    lastName: z.string(),
    firstName: z.string(),
    sex: z.enum(["male", "female"]),
    dateOfBirth: z.date(),
    placeOfBirth: z.string().optional(),
    bornAbroad: z.boolean(),
    licenseeCategoryId: z.string(),
    packId: z.string(),
    phone: z.string(),
    email: z.string().email(),
    legalRepresentative: FormLegalRepresentativeSchema,
});
  
export async function addLicensee(data: z.infer<typeof LicenseeFormSchema>) {
    const licensees = await readDbFile<Licensee[]>('licensees.json');
    
    const newLicensee: Licensee = {
      ...data,
      id: `lic-${Date.now()}`,
      registrationDate: new Date(),
      placeOfBirth: data.placeOfBirth ?? "",
      paymentStatus: 'En attente',
      equipmentStatus: 'En attente',
      reductions: [],
      assignedEquipment: [],
      legalRepresentative: data.legalRepresentative?.lastName ? {
        lastName: data.legalRepresentative.lastName!,
        firstName: data.legalRepresentative.firstName!,
        dateOfBirth: data.legalRepresentative.dateOfBirth!,
        placeOfBirth: data.legalRepresentative.placeOfBirth!,
        bornAbroad: data.legalRepresentative.bornAbroad!,
        email: data.legalRepresentative.email!,
        fatherPhone: data.legalRepresentative.fatherPhone,
        motherPhone: data.legalRepresentative.motherPhone,
      } : undefined,
    };

    const updatedLicensees = [...licensees, newLicensee];
    await writeDbFile('licensees.json', updatedLicensees);
    
    revalidateTag('licensees');
}

export async function updateLicensee(id: string, data: z.infer<typeof LicenseeFormSchema>) {
    const licensees = await readDbFile<Licensee[]>('licensees.json');
    const index = licensees.findIndex(lic => lic.id === id);

    if (index !== -1) {
        const originalLicensee = licensees[index];
        const updatedLicensee: Licensee = {
            ...originalLicensee,
            ...data,
            placeOfBirth: data.placeOfBirth ?? "",
            legalRepresentative: data.legalRepresentative?.lastName && data.legalRepresentative.firstName && data.legalRepresentative.dateOfBirth && data.legalRepresentative.placeOfBirth && data.legalRepresentative.email ? {
                lastName: data.legalRepresentative.lastName,
                firstName: data.legalRepresentative.firstName,
                dateOfBirth: data.legalRepresentative.dateOfBirth,
                placeOfBirth: data.legalRepresentative.placeOfBirth,
                bornAbroad: data.legalRepresentative.bornAbroad || false,
                email: data.legalRepresentative.email,
                fatherPhone: data.legalRepresentative.fatherPhone,
                motherPhone: data.legalRepresentative.motherPhone,
            } : undefined,
        };
        licensees[index] = updatedLicensee;
        await writeDbFile('licensees.json', licensees);
        revalidateTag('licensees');
    }
}

export async function updateLicenseePaymentDetails(
    licenseeId: string,
    paymentDetails: Partial<Pick<Licensee, 'paymentStatus' | 'paymentMethod' | 'paymentDate' | 'paymentComment' | 'reductions' | 'amountPaid'>>
) {
    const licensees = await readDbFile<Licensee[]>('licensees.json');
    const index = licensees.findIndex(lic => lic.id === licenseeId);
    if (index !== -1) {
        const originalStatus = licensees[index].paymentStatus;
        licensees[index] = { ...licensees[index], ...paymentDetails };
        
        if (paymentDetails.paymentStatus !== 'Partiel') {
            licensees[index].amountPaid = undefined;
        }

        if (paymentDetails.paymentStatus === 'Payé' && originalStatus !== 'Payé') {
            const updatedLicensee = licensees[index];
            const packs = await getPacks();
            const reductions = (await getSettings()).reductions;
            const pack = packs.find(p => p.id === updatedLicensee.packId);
            
            if (pack) {
                const appliedReductionDetails = (updatedLicensee.reductions || [])
                    .map(applied => (reductions || []).find(r => r.id === applied.id))
                    .filter((r): r is Reduction => !!r);
                
                let priceAfterMultipliers = pack.price;
                appliedReductionDetails.forEach(r => {
                    if (r.multiplier && r.multiplier !== 1) {
                        priceAfterMultipliers *= r.multiplier;
                    }
                });
                
                const totalFixedReduction = appliedReductionDetails.reduce((total, r) => total + (r.amount || 0), 0);
                const finalPrice = Math.max(0, priceAfterMultipliers - totalFixedReduction);

                await createAndQueueEmail('paymentConfirmation', updatedLicensee, {
                    packName: pack.name,
                    finalPrice: finalPrice.toFixed(2),
                });
            }
        }
    }
    await writeDbFile('licensees.json', licensees);
    revalidateTag('licensees');
}

export async function assignEquipmentToLicensee(
    licenseeId: string,
    assignments: AssignedEquipment[]
) {
    const licensees = await readDbFile<Licensee[]>('licensees.json');
    const index = licensees.findIndex(lic => lic.id === licenseeId);
    if (index !== -1) {
        const isAnyItemOutOfStock = assignments.some(a => a.outOfStock);
        licensees[index].equipmentStatus = isAnyItemOutOfStock ? 'Incomplet' : 'Attribué';
        licensees[index].assignedEquipment = assignments;
        await writeDbFile('licensees.json', licensees);
        
        const templateType = licensees[index].equipmentStatus === 'Attribué' ? 'equipmentComplete' : 'equipmentIncomplete';
        await createAndQueueEmail(templateType, licensees[index], {
            equipmentList: formatEquipmentListHTML(assignments),
        });
    }
    revalidateTag('licensees');
}

export async function deleteLicensee(licenseeId: string) {
    const licensees = await readDbFile<Licensee[]>('licensees.json');
    const updatedLicensees = licensees.filter(lic => lic.id !== licenseeId);
    await writeDbFile('licensees.json', updatedLicensees);
    revalidateTag('licensees');
}

const ImportedLicenseeSchema = z.object({
    lastName: z.string().min(1),
    firstName: z.string().min(1),
    sex: z.enum(["male", "female"]),
    dateOfBirth: z.date(),
    placeOfBirth: z.string().optional(),
    bornAbroad: z.boolean(),
    licenseeCategoryId: z.string(),
    packId: z.string(),
    phone: z.string(),
    email: z.string().email(),
    legalRepresentative: z.object({
        lastName: z.string().min(1),
        firstName: z.string().min(1),
        dateOfBirth: z.date(),
        placeOfBirth: z.string(),
        bornAbroad: z.boolean(),
        email: z.string().email(),
        fatherPhone: z.string().optional(),
        motherPhone: z.string().optional(),
    }).optional(),
});

export async function importLicensees(data: z.infer<typeof ImportedLicenseeSchema>[]) {
    const licensees = await getLicensees();
    
    const newLicensees: Licensee[] = data.map(item => ({
        ...item,
        id: `lic-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        registrationDate: new Date(),
        placeOfBirth: item.placeOfBirth ?? "",
        paymentStatus: 'En attente',
        equipmentStatus: 'En attente',
        reductions: [],
        assignedEquipment: [],
        legalRepresentative: item.legalRepresentative,
    }));

    const updatedLicensees = [...licensees, ...newLicensees];
    await writeDbFile('licensees.json', updatedLicensees);
    
    revalidateTag('licensees');

    return { success: true, importedCount: newLicensees.length };
}


// --- STOCK ACTIONS ---
export const getStock = cache(
    async (): Promise<StockEntry[]> => {
        const stockData = await readDbFile<any[]>('stock.json');
        return stockData.map(s => ({
            ...s,
            quantity: s.quantity || 0,
            lastModified: s.lastModified ? new Date(s.lastModified) : undefined,
        }));
    },
    ['stock'],
    { tags: ['stock'] }
);

export async function updateStock(equipmentName: string, sizeName: string, quantity: number) {
    let stock = await readDbFile<any[]>('stock.json');
    const index = stock.findIndex(s => s.equipmentName === equipmentName && s.sizeName === sizeName);
    
    const newQuantity = Math.max(0, quantity);
    const lastModified = new Date().toISOString();

    if (index !== -1) {
        stock[index].quantity = newQuantity;
        stock[index].lastModified = lastModified;
    } else {
        stock.push({ equipmentName, sizeName, quantity: newQuantity, lastModified });
    }
    
    await writeDbFile('stock.json', stock);
    revalidateTag('stock');
}

// --- ARCHIVE ACTIONS ---
export async function archiveAndResetSeason() {
    const licensees = await getLicensees();
    const settings = await getSettings();
    const currentSeason = settings.referenceSeason;
    
    const archiveFilename = `archive-${currentSeason - 1}-${currentSeason}.json`;
    
    await writeDbFile(archiveFilename, licensees);
    await writeDbFile('licensees.json', []);
    await writeDbFile('pending-emails.json', []);
    await writeDbFile('stock.json', []);

    const newSettings = { ...settings, referenceSeason: currentSeason + 1 };
    await writeDbFile('settings.json', newSettings);

    revalidateTag('licensees');
    revalidateTag('pending-emails');
    revalidateTag('stock');
    revalidateTag('settings');
    revalidateTag('archives');
}

export const getArchivedSeasons = cache(
    async (): Promise<string[]> => {
        try {
            const files = await fs.readdir(dbDirectory);
            return files
                .filter(file => file.startsWith('archive-') && file.endsWith('.json'))
                .map(file => file.replace('archive-', '').replace('.json', ''))
                .sort((a, b) => b.localeCompare(a));
        } catch (error) {
            console.error("Could not read archives directory:", error);
            return [];
        }
    },
    ['archives'],
    { tags: ['archives'] }
);

export async function getArchivedLicensees(season: string): Promise<Licensee[]> {
    const archiveFilename = `archive-${season}.json`;
    const licensees = await readDbFile<any[]>(archiveFilename);
    return licensees.map(lic => ({
        ...lic,
        registrationDate: new Date(lic.registrationDate),
        dateOfBirth: new Date(lic.dateOfBirth),
        paymentStatus: lic.paymentStatus || 'En attente',
        equipmentStatus: lic.equipmentStatus || 'En attente',
        paymentMethod: lic.paymentMethod,
        paymentDate: lic.paymentDate ? new Date(lic.paymentDate) : undefined,
        amountPaid: lic.amountPaid,
        paymentComment: lic.paymentComment,
        reductions: lic.reductions || [],
        assignedEquipment: lic.assignedEquipment || [],
        legalRepresentative: lic.legalRepresentative ? {
            ...lic.legalRepresentative,
            dateOfBirth: new Date(lic.legalRepresentative.dateOfBirth),
        } : undefined
    }));
}
