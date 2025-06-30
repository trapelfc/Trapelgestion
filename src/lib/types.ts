

import { type LucideIcon } from 'lucide-react';

export type EquipmentSize = 'S' | 'M' | 'L' | 'XL' | 'XXL';
export type SockSize = '38-40' | '41-43' | '44-46';

export type Equipment = {
  tshirt: EquipmentSize | null;
  shorts: EquipmentSize | null;
  socks: SockSize | null;
};

export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  registrationDate: Date;
  equipment: Equipment;
};

export type Pack = {
  id: string;
  name: string;
  price: number;
  composition: string[];
};

export type EquipmentItem = {
    id: string;
    name: string;
    category: string;
    reference_adulte?: string;
    reference_enfant?: string;
};

export type Size = {
    id: string;
    name: string;
};

export type Category = {
    id: string;
    name: string;
    sizes: Size[];
};

export type LicenseeCategory = {
    id: string;
    name: string;
    description: string;
    color: string;
};

export type Reduction = {
  id: string;
  name: string;
  amount: number;
  note?: string;
  multiplier?: number;
};

export type AppliedReduction = {
  id: string; // The ID of the Reduction from settings
  note?: string; // The custom note for this specific application
};

export type ClubInfo = {
    name: string;
    address: string;
    email?: string;
    phone?: string;
    responsibleName?: string;
    facebookUrl?: string;
    instagramUrl?: string;
};

export type AppSettings = {
    referenceSeason: number;
    reductions: Reduction[];
    clubInfo?: ClubInfo;
};

export type LegalRepresentative = {
    lastName: string;
    firstName: string;
    dateOfBirth: Date;
    placeOfBirth: string;
    bornAbroad: boolean;
    email: string;
    fatherPhone?: string;
    motherPhone?: string;
};

export type PaymentMethod = 'Espèces' | 'Chèque' | 'CB' | 'Virement';

export type AssignedEquipment = {
    name: string;
    size: string;
    outOfStock?: boolean;
};

export type StockEntry = {
  equipmentName: string;
  sizeName: string;
  quantity: number;
  lastModified?: Date;
};

export type Licensee = {
    id: string;
    lastName: string;
    firstName: string;
    sex: 'male' | 'female';
    dateOfBirth: Date;
    placeOfBirth: string;
    bornAbroad: boolean;
    licenseeCategoryId: string;
    packId: string;
    phone: string;
    email: string;
    registrationDate: Date;
    paymentStatus: 'En attente' | 'Payé' | 'Partiel';
    paymentMethod?: PaymentMethod;
    paymentDate?: Date;
    amountPaid?: number;
    paymentComment?: string;
    reductions?: AppliedReduction[];
    equipmentStatus: 'En attente' | 'Attribué' | 'Incomplet';
    assignedEquipment?: AssignedEquipment[];
    legalRepresentative?: LegalRepresentative;
};

export type PendingEmail = {
  id: string;
  licenseeId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string; // HTML body
  status: 'pending' | 'sent';
  createdAt: Date;
  sentAt?: Date;
};

export type EmailTemplate = {
  subject: string;
  body: string;
};

export type EmailTemplates = {
  paymentConfirmation: EmailTemplate;
  equipmentComplete: EmailTemplate;
  equipmentIncomplete: EmailTemplate;
};

export type PdfTemplate = {
  title: string;
  headerText: string;
  footerText: string;
};

export type PdfTemplates = {
  orderForm: PdfTemplate;
  donationReceipt: PdfTemplate;
};

export type Role = {
  name: string;
  permissions: string[];
};

export type User = {
    id: string;
    username: string;
    password?: string; // Password should be optional when sending data to the client
    name: string;
    role: string;
};

export type LoginState = {
  success: boolean;
  error?: string;
};

// Types for passing module configs to client components (must be serializable)
export interface SerializableSubModule {
  href: string;
  label: string;
  subModules?: SerializableSubModule[];
}

export interface SerializableModuleConfig {
  label: string;
  href: string;
  subModules: SerializableSubModule[];
}
