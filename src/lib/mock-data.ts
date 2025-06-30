
import type { Member } from './types';

export const mockMembers: Member[] = [
  {
    id: '1',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    registrationDate: new Date('2023-08-15'),
    equipment: {
      tshirt: 'L',
      shorts: 'L',
      socks: '41-43',
    },
  },
  {
    id: '2',
    firstName: 'Marie',
    lastName: 'Curie',
    email: 'marie.curie@example.com',
    registrationDate: new Date('2023-09-01'),
    equipment: {
      tshirt: 'M',
      shorts: 'M',
      socks: '38-40',
    },
  },
  {
    id: '3',
    firstName: 'Pierre',
    lastName: 'Martin',
    email: 'pierre.martin@example.com',
    registrationDate: new Date('2023-07-20'),
    equipment: {
      tshirt: null,
      shorts: null,
      socks: null,
    },
  },
    {
    id: '4',
    firstName: 'Sophie',
    lastName: 'Bernard',
    email: 'sophie.bernard@example.com',
    registrationDate: new Date('2024-01-10'),
    equipment: {
      tshirt: 'S',
      shorts: 'S',
      socks: '38-40',
    },
  },
  {
    id: '5',
    firstName: 'Lucas',
    lastName: 'Dubois',
    email: 'lucas.dubois@example.com',
    registrationDate: new Date('2024-02-22'),
    equipment: {
      tshirt: 'XL',
      shorts: 'L',
      socks: '44-46',
    },
  },
];
