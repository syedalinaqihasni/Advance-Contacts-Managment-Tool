import type { FullContact } from './types';

// ── CSV Parser ──────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

function splitCSVRows(text: string): string[] {
  const rows: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      if (current.trim()) {
        rows.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }
  if (current.trim()) rows.push(current);
  return rows;
}

// Common CSV header variations for each field
const headerMap: Record<string, string[]> = {
  first_name: ['first_name', 'first name', 'given_name', 'given name', 'firstname', 'fname'],
  last_name: ['last_name', 'last name', 'family_name', 'family name', 'lastname', 'lname', 'surname'],
  middle_name: ['middle_name', 'middle name', 'middlename'],
  prefix: ['prefix', 'name_prefix', 'honorific_prefix'],
  suffix: ['suffix', 'name_suffix', 'honorific_suffix'],
  nickname: ['nickname', 'nick_name', 'nick name'],
  formatted_name: ['name', 'full_name', 'full name', 'formatted_name', 'formatted name', 'display_name', 'display name', 'contact_name'],
  organization: ['organization', 'organisation', 'org', 'company'],
  title: ['title', 'job_title', 'job title', 'position'],
  department: ['department', 'dept'],
  birthday: ['birthday', 'bday', 'birth_date', 'birth date', 'dob'],
  gender: ['gender', 'sex'],
  language: ['language', 'lang'],
  timezone: ['timezone', 'time_zone', 'tz'],
  photo_url: ['photo_url', 'photo url', 'photo', 'avatar', 'avatar_url'],
  email: ['email', 'email_address', 'email address', 'e-mail', 'email_1', 'email1'],
  email2: ['email_2', 'email2', 'email address 2', 'secondary_email'],
  email3: ['email_3', 'email3', 'email address 3'],
  phone: ['phone', 'phone_number', 'phone number', 'tel', 'telephone', 'mobile', 'cell', 'cell_phone', 'cell phone', 'phone_1', 'phone1'],
  phone2: ['phone_2', 'phone2', 'phone number 2', 'secondary_phone', 'home_phone', 'home phone'],
  phone3: ['phone_3', 'phone3', 'phone number 3', 'work_phone', 'work phone'],
  street: ['street', 'address', 'street_address', 'street address', 'address_1', 'address1'],
  city: ['city', 'locality'],
  region: ['region', 'state', 'province', 'administrative_area'],
  postal_code: ['postal_code', 'postal code', 'zip', 'zip_code', 'zip code', 'postcode', 'postal'],
  country: ['country', 'country_name', 'country name'],
  url: ['url', 'website', 'web', 'homepage', 'website_url'],
  note: ['note', 'notes', 'description', 'comment', 'comments'],
  label: ['label', 'labels', 'category', 'categories', 'group', 'groups', 'tags'],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, '_');
}

function findColumnIndex(headers: string[], field: string): number {
  const aliases = headerMap[field] || [field];
  for (let i = 0; i < headers.length; i++) {
    const norm = normalizeHeader(headers[i]);
    if (aliases.includes(norm)) return i;
  }
  return -1;
}

export function parseCSV(text: string): Partial<FullContact>[] {
  const rows = splitCSVRows(text);
  if (rows.length < 2) return [];

  const headerRow = rows[0];
  const headers = parseCSVLine(headerRow);
  const contacts: Partial<FullContact>[] = [];

  const colMap: Record<string, number> = {};
  for (const field of Object.keys(headerMap)) {
    const idx = findColumnIndex(headers, field);
    if (idx !== -1) colMap[field] = idx;
  }

  for (let i = 1; i < rows.length; i++) {
    const values = parseCSVLine(rows[i]);
    if (values.every((v) => !v.trim())) continue;

    const contact: Partial<FullContact> = {
      emails: [],
      phones: [],
      addresses: [],
      urls: [],
      notes: [],
      events: [],
      labels: [],
    };

    const get = (field: string): string | null => {
      const idx = colMap[field];
      if (idx === undefined || idx >= values.length) return null;
      const val = values[idx]?.trim();
      return val || null;
    };

    contact.first_name = get('first_name');
    contact.last_name = get('last_name');
    contact.middle_name = get('middle_name');
    contact.prefix = get('prefix');
    contact.suffix = get('suffix');
    contact.nickname = get('nickname');
    contact.formatted_name = get('formatted_name');
    contact.organization = get('organization');
    contact.title = get('title');
    contact.department = get('department');
    contact.birthday = get('birthday');
    contact.gender = get('gender');
    contact.language = get('language');
    contact.timezone = get('timezone');
    contact.photo_url = get('photo_url');

    // Emails
    const email1 = get('email');
    if (email1) (contact.emails as FullContact['emails']).push({ email: email1, type: 'other', is_primary: true, label: null, contact_id: '', id: '' });
    const email2 = get('email2');
    if (email2) (contact.emails as FullContact['emails']).push({ email: email2, type: 'other', is_primary: false, label: null, contact_id: '', id: '' });
    const email3 = get('email3');
    if (email3) (contact.emails as FullContact['emails']).push({ email: email3, type: 'other', is_primary: false, label: null, contact_id: '', id: '' });

    // Phones
    const phone1 = get('phone');
    if (phone1) (contact.phones as FullContact['phones']).push({ phone: phone1, type: 'cell', is_primary: true, label: null, contact_id: '', id: '' });
    const phone2 = get('phone2');
    if (phone2) (contact.phones as FullContact['phones']).push({ phone: phone2, type: 'home', is_primary: false, label: null, contact_id: '', id: '' });
    const phone3 = get('phone3');
    if (phone3) (contact.phones as FullContact['phones']).push({ phone: phone3, type: 'work', is_primary: false, label: null, contact_id: '', id: '' });

    // Address
    const street = get('street');
    const city = get('city');
    if (street || city) {
      (contact.addresses as FullContact['addresses']).push({
        street,
        city,
        region: get('region'),
        postal_code: get('postal_code'),
        country: get('country'),
        type: 'home',
        label: null,
        po_box: null,
        extended_address: null,
        is_primary: true,
        contact_id: '', id: '',
      });
    }

    // URL
    const url = get('url');
    if (url) (contact.urls as FullContact['urls']).push({ url, type: 'other', label: null, contact_id: '', id: '' });

    // Notes
    const note = get('note');
    if (note) (contact.notes as FullContact['notes']).push({ note, contact_id: '', id: '' });

    // Labels
    const label = get('label');
    if (label) {
      const labels = label.split(/[,;]/).map((l) => l.trim()).filter(Boolean);
      (contact.labels as FullContact['labels']) = labels.map((name) => ({ name, color: 'slate', id: '', created_at: '' }));
    }

    // Derive formatted name if missing
    if (!contact.formatted_name) {
      contact.formatted_name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unnamed';
    }

    contacts.push(contact);
  }

  return contacts;
}

// ── CSV Serializer ──────────────────────────────────────────────────────────

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function contactsToCSV(contacts: FullContact[]): string {
  const headers = [
    'First Name', 'Last Name', 'Middle Name', 'Prefix', 'Suffix', 'Nickname',
    'Formatted Name', 'Organization', 'Title', 'Department', 'Birthday', 'Gender',
    'Language', 'Timezone', 'Photo URL',
    'Email 1', 'Email 1 Type', 'Email 2', 'Email 2 Type', 'Email 3', 'Email 3 Type',
    'Phone 1', 'Phone 1 Type', 'Phone 2', 'Phone 2 Type', 'Phone 3', 'Phone 3 Type',
    'Street', 'City', 'Region', 'Postal Code', 'Country',
    'URL 1', 'URL 2',
    'Note 1', 'Note 2',
    'Labels',
  ];

  const rows: string[] = [headers.map(escapeCSV).join(',')];

  for (const c of contacts) {
    const emails = c.emails || [];
    const phones = c.phones || [];
    const addresses = c.addresses || [];
    const urls = c.urls || [];
    const notes = c.notes || [];
    const labels = (c.labels || []).map((l) => l.name).join('; ');

    const values = [
      c.first_name || '', c.last_name || '', c.middle_name || '', c.prefix || '', c.suffix || '', c.nickname || '',
      c.formatted_name || '', c.organization || '', c.title || '', c.department || '', c.birthday || '', c.gender || '',
      c.language || '', c.timezone || '', c.photo_url || '',
      emails[0]?.email || '', emails[0]?.type || '',
      emails[1]?.email || '', emails[1]?.type || '',
      emails[2]?.email || '', emails[2]?.type || '',
      phones[0]?.phone || '', phones[0]?.type || '',
      phones[1]?.phone || '', phones[1]?.type || '',
      phones[2]?.phone || '', phones[2]?.type || '',
      addresses[0]?.street || '', addresses[0]?.city || '', addresses[0]?.region || '', addresses[0]?.postal_code || '', addresses[0]?.country || '',
      urls[0]?.url || '', urls[1]?.url || '',
      notes[0]?.note || '', notes[1]?.note || '',
      labels,
    ];
    rows.push(values.map(escapeCSV).join(','));
  }

  return rows.join('\n') + '\n';
}
