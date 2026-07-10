import type { FullContact } from './types';

export function contactsToJSON(contacts: FullContact[]): string {
  return JSON.stringify(contacts, null, 2);
}

export function parseJSON(text: string): Partial<FullContact>[] {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    if (data && typeof data === 'object') return [data as Partial<FullContact>];
    return [];
  }
  return data as Partial<FullContact>[];
}
