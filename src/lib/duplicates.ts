import type { FullContact, DuplicateGroup } from './types';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, '').replace(/^\+/, '');
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface DuplicateMatch {
  groups: DuplicateGroup[];
  totalDuplicates: number;
}

export function findDuplicates(contacts: FullContact[], options: {
  matchByEmail?: boolean;
  matchByPhone?: boolean;
  matchByName?: boolean;
}): DuplicateMatch {
  const { matchByEmail = true, matchByPhone = true, matchByName = true } = options;
  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();

  // Build lookup maps
  const emailMap = new Map<string, FullContact[]>();
  const phoneMap = new Map<string, FullContact[]>();
  const nameMap = new Map<string, FullContact[]>();

  for (const contact of contacts) {
    if (matchByEmail) {
      for (const email of contact.emails || []) {
        if (email.email) {
          const key = normalizeEmail(email.email);
          if (!emailMap.has(key)) emailMap.set(key, []);
          emailMap.get(key)!.push(contact);
        }
      }
    }
    if (matchByPhone) {
      for (const phone of contact.phones || []) {
        if (phone.phone) {
          const key = normalizePhone(phone.phone);
          if (key.length >= 7) {
            if (!phoneMap.has(key)) phoneMap.set(key, []);
            phoneMap.get(key)!.push(contact);
          }
        }
      }
    }
    if (matchByName) {
      const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ');
      if (fullName) {
        const key = normalizeName(fullName);
        if (!nameMap.has(key)) nameMap.set(key, []);
        nameMap.get(key)!.push(contact);
      }
    }
  }

  // Find email matches
  if (matchByEmail) {
    for (const [email, matched] of emailMap) {
      if (matched.length < 2) continue;
      const groupKey = matched.map((c) => c.id).sort().join('|');
      if (seen.has(groupKey)) continue;
      seen.add(groupKey);
      groups.push({ contacts: matched, matchType: 'email', matchValue: email });
    }
  }

  // Find phone matches
  if (matchByPhone) {
    for (const [phone, matched] of phoneMap) {
      if (matched.length < 2) continue;
      const groupKey = matched.map((c) => c.id).sort().join('|');
      if (seen.has(groupKey)) continue;
      seen.add(groupKey);
      groups.push({ contacts: matched, matchType: 'phone', matchValue: phone });
    }
  }

  // Find name matches (only if not already caught by email/phone)
  if (matchByName) {
    for (const [name, matched] of nameMap) {
      if (matched.length < 2) continue;
      const groupKey = matched.map((c) => c.id).sort().join('|');
      if (seen.has(groupKey)) continue;
      seen.add(groupKey);
      groups.push({ contacts: matched, matchType: 'name', matchValue: name });
    }
  }

  return {
    groups,
    totalDuplicates: groups.reduce((sum, g) => sum + g.contacts.length, 0),
  };
}

// Merge two or more contacts into one. The first contact in the array is the "primary" (target).
export function mergeContacts(contacts: FullContact[]): Partial<FullContact> {
  if (contacts.length === 0) return {};
  const primary = contacts[0];

  const merged: Partial<FullContact> = {
    ...primary,
    id: primary.id,
    // Prefer non-null values from any contact
    prefix: contacts.find((c) => c.prefix)?.prefix || null,
    first_name: contacts.find((c) => c.first_name)?.first_name || null,
    middle_name: contacts.find((c) => c.middle_name)?.middle_name || null,
    last_name: contacts.find((c) => c.last_name)?.last_name || null,
    suffix: contacts.find((c) => c.suffix)?.suffix || null,
    nickname: contacts.find((c) => c.nickname)?.nickname || null,
    formatted_name: contacts.find((c) => c.formatted_name)?.formatted_name || null,
    organization: contacts.find((c) => c.organization)?.organization || null,
    title: contacts.find((c) => c.title)?.title || null,
    department: contacts.find((c) => c.department)?.department || null,
    photo_url: contacts.find((c) => c.photo_url)?.photo_url || null,
    photo_data: contacts.find((c) => c.photo_data)?.photo_data || null,
    gender: contacts.find((c) => c.gender)?.gender || null,
    birthday: contacts.find((c) => c.birthday)?.birthday || null,
    language: contacts.find((c) => c.language)?.language || null,
    timezone: contacts.find((c) => c.timezone)?.timezone || null,
    is_favorite: contacts.some((c) => c.is_favorite),
  };

  // Merge emails (dedupe by email value)
  const emailSet = new Set<string>();
  merged.emails = [];
  for (const c of contacts) {
    for (const email of c.emails || []) {
      const key = normalizeEmail(email.email);
      if (!emailSet.has(key)) {
        emailSet.add(key);
        (merged.emails as FullContact['emails']).push(email);
      }
    }
  }

  // Merge phones (dedupe by phone value)
  const phoneSet = new Set<string>();
  merged.phones = [];
  for (const c of contacts) {
    for (const phone of c.phones || []) {
      const key = normalizePhone(phone.phone);
      if (!phoneSet.has(key)) {
        phoneSet.add(key);
        (merged.phones as FullContact['phones']).push(phone);
      }
    }
  }

  // Merge addresses (dedupe by street+city)
  const addrSet = new Set<string>();
  merged.addresses = [];
  for (const c of contacts) {
    for (const addr of c.addresses || []) {
      const key = `${addr.street || ''}|${addr.city || ''}`.toLowerCase();
      if (!addrSet.has(key)) {
        addrSet.add(key);
        (merged.addresses as FullContact['addresses']).push(addr);
      }
    }
  }

  // Merge URLs (dedupe)
  const urlSet = new Set<string>();
  merged.urls = [];
  for (const c of contacts) {
    for (const url of c.urls || []) {
      if (!urlSet.has(url.url.toLowerCase())) {
        urlSet.add(url.url.toLowerCase());
        (merged.urls as FullContact['urls']).push(url);
      }
    }
  }

  // Merge notes (concatenate, dedupe exact)
  const noteSet = new Set<string>();
  merged.notes = [];
  for (const c of contacts) {
    for (const note of c.notes || []) {
      if (!noteSet.has(note.note)) {
        noteSet.add(note.note);
        (merged.notes as FullContact['notes']).push(note);
      }
    }
  }

  // Merge events (dedupe by type+date)
  const eventSet = new Set<string>();
  merged.events = [];
  for (const c of contacts) {
    for (const event of c.events || []) {
      const key = `${event.type}|${event.event_date}`;
      if (!eventSet.has(key)) {
        eventSet.add(key);
        (merged.events as FullContact['events']).push(event);
      }
    }
  }

  // Merge labels (dedupe by name)
  const labelSet = new Set<string>();
  merged.labels = [];
  for (const c of contacts) {
    for (const label of c.labels || []) {
      const key = label.name.toLowerCase();
      if (!labelSet.has(key)) {
        labelSet.add(key);
        (merged.labels as FullContact['labels']).push(label);
      }
    }
  }

  return merged;
}
