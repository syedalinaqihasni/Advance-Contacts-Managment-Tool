import type { FullContact } from './types';

// ── VCF Parser ──────────────────────────────────────────────────────────────

interface VCardProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

function unfoldLines(text: string): string[] {
  const lines = text.split(/\r\n|\r|\n/);
  const unfolded: string[] = [];
  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (unfolded.length > 0) {
        unfolded[unfolded.length - 1] += line.substring(1);
      }
    } else {
      unfolded.push(line);
    }
  }
  return unfolded;
}

function parseProperty(line: string): VCardProperty | null {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;
  const left = line.substring(0, colonIdx);
  const value = line.substring(colonIdx + 1);

  const parts = left.split(';');
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const eqIdx = parts[i].indexOf('=');
    if (eqIdx !== -1) {
      const key = parts[i].substring(0, eqIdx).toLowerCase();
      const val = parts[i].substring(eqIdx + 1);
      params[key] = val;
    } else {
      // vCard 2.1 style: TYPE=VALUE is just VALUE
      params['type'] = (params['type'] ? params['type'] + ',' : '') + parts[i];
    }
  }
  return { name, params, value };
}

function decodeValue(value: string, encoding?: string): string {
  if (!encoding) return value;
  const enc = encoding.toLowerCase();
  if (enc === 'quoted-printable') {
    return value
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/=\r?\n/g, '');
  }
  if (enc === 'b' || enc === 'base64') {
    try {
      return atob(value.replace(/\s/g, ''));
    } catch {
      return value;
    }
  }
  return value;
}

function splitMulti(value: string): string[] {
  return value.split(';').map((v) => v.trim());
}

function getTypes(params: Record<string, string>): string[] {
  const t = params['type'] || '';
  return t.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function pickType(types: string[], fallback = 'other'): string {
  const known = ['home', 'work', 'cell', 'mobile', 'fax', 'pager', 'main', 'other', 'iphone', 'car'];
  for (const t of types) {
    if (known.includes(t)) return t === 'mobile' ? 'cell' : t;
  }
  return fallback;
}

export function parseVCF(text: string): Partial<FullContact>[] {
  const lines = unfoldLines(text);
  const contacts: Partial<FullContact>[] = [];
  let currentProps: VCardProperty[] = [];

  for (const line of lines) {
    if (line.toUpperCase().startsWith('BEGIN:VCARD')) {
      currentProps = [];
      continue;
    }
    if (line.toUpperCase().startsWith('END:VCARD')) {
      if (currentProps.length > 0) {
        contacts.push(buildContactFromProps(currentProps));
      }
      currentProps = [];
      continue;
    }
    const prop = parseProperty(line);
    if (prop) currentProps.push(prop);
  }
  return contacts;
}

function buildContactFromProps(props: VCardProperty[]): Partial<FullContact> {
  const contact: Partial<FullContact> = {
    emails: [],
    phones: [],
    addresses: [],
    urls: [],
    notes: [],
    events: [],
    labels: [],
  };

  for (const prop of props) {
    const encoding = prop.params['encoding'];
    const decoded = decodeValue(prop.value, encoding);

    switch (prop.name) {
      case 'FN':
        contact.formatted_name = decoded;
        break;
      case 'N': {
        const [last, first, middle, prefix, suffix] = splitMulti(decoded);
        contact.last_name = last || null;
        contact.first_name = first || null;
        contact.middle_name = middle || null;
        contact.prefix = prefix || null;
        contact.suffix = suffix || null;
        break;
      }
      case 'NICKNAME':
        contact.nickname = decoded;
        break;
      case 'ORG': {
        const parts = splitMulti(decoded);
        contact.organization = parts[0] || null;
        if (parts[1]) contact.department = parts.slice(1).join('; ');
        break;
      }
      case 'TITLE':
        contact.title = decoded;
        break;
      case 'PHOTO':
        if (prop.params['url']) {
          contact.photo_url = decoded;
        } else {
          contact.photo_data = decoded;
        }
        break;
      case 'GENDER':
        contact.gender = decoded;
        break;
      case 'BDAY': {
        const date = decoded.replace(/-/g, '').replace(/\//g, '');
        if (date.length === 8) {
          contact.birthday = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
        } else if (decoded.length === 10) {
          contact.birthday = decoded;
        }
        break;
      }
      case 'LANG':
        contact.language = decoded;
        break;
      case 'TZ':
        contact.timezone = decoded;
        break;
      case 'UID':
        contact.uid = decoded;
        break;
      case 'REV':
        contact.revision = decoded;
        break;
      case 'CATEGORIES': {
        const cats = splitMulti(decoded);
        contact.labels = cats.filter(Boolean).map((name) => ({ name, color: 'slate', id: '', created_at: '' }));
        break;
      }
      case 'X-FAVORITE':
        contact.is_favorite = decoded.toLowerCase() === 'true' || decoded === '1';
        break;
      case 'EMAIL': {
        const types = getTypes(prop.params);
        (contact.emails as FullContact['emails']).push({
          email: decoded,
          type: pickType(types),
          is_primary: types.includes('pref'),
          label: types.find((t) => !['home', 'work', 'cell', 'other'].includes(t)) || null,
          contact_id: '', id: '',
        });
        break;
      }
      case 'TEL': {
        const types = getTypes(prop.params);
        const phoneType = pickType(types);
        (contact.phones as FullContact['phones']).push({
          phone: decoded,
          type: phoneType === 'mobile' ? 'cell' : phoneType,
          is_primary: types.includes('pref'),
          label: types.find((t) => !['home', 'work', 'cell', 'mobile', 'fax', 'other'].includes(t)) || null,
          contact_id: '', id: '',
        });
        break;
      }
      case 'ADR': {
        const types = getTypes(prop.params);
        const [po, ext, street, city, region, postal, country] = splitMulti(decoded);
        (contact.addresses as FullContact['addresses']).push({
          po_box: po || null,
          extended_address: ext || null,
          street: street || null,
          city: city || null,
          region: region || null,
          postal_code: postal || null,
          country: country || null,
          type: pickType(types),
          label: types.find((t) => !['home', 'work', 'postal', 'parcel', 'intl', 'dom'].includes(t)) || null,
          is_primary: types.includes('pref'),
          contact_id: '', id: '',
        });
        break;
      }
      case 'URL': {
        const types = getTypes(prop.params);
        (contact.urls as FullContact['urls']).push({
          url: decoded,
          type: pickType(types),
          label: types.find((t) => !['home', 'work', 'other'].includes(t)) || null,
          contact_id: '', id: '',
        });
        break;
      }
      case 'NOTE':
        (contact.notes as FullContact['notes']).push({ note: decoded, contact_id: '', id: '' });
        break;
      case 'ANNIVERSARY':
      case 'X-ANNIVERSARY':
      case 'X-ABDATE':
      case 'X-EVENT': {
        const types = getTypes(prop.params);
        const date = decoded.replace(/-/g, '');
        let eventDate: string | null = null;
        if (date.length === 8) {
          eventDate = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
        } else if (decoded.length === 10) {
          eventDate = decoded;
        }
        if (eventDate) {
          (contact.events as FullContact['events']).push({
            type: prop.name === 'ANNIVERSARY' ? 'anniversary' : (types[0] || 'custom'),
            label: prop.params['label'] || null,
            event_date: eventDate,
            contact_id: '', id: '',
          });
        }
        break;
      }
      case 'X-MS-CARTELEPHONE':
      case 'X-GOOGLE-TALK':
      case 'X-JABBER':
      case 'X-ICQ':
      case 'X-MSN':
      case 'X-YAHOO':
      case 'X-SKYPE':
      case 'X-AIM':
      case 'X-MSN-HOME':
      case 'X-MSN-WORK': {
        // Handle as custom phone/email
        (contact.phones as FullContact['phones']).push({
          phone: decoded,
          type: 'other',
          is_primary: false,
          label: prop.name.replace('X-', '').replace('-HOME', '').replace('-WORK', ''),
          contact_id: '', id: '',
        });
        break;
      }
      default:
        // Store unknown X- props as notes if they have interesting values
        if (prop.name.startsWith('X-') && decoded && decoded.length > 0 && decoded.length < 500) {
          // skip noisy metadata props
          if (!['X-ABLABEL', 'X-ABADR', 'X-ABUID', 'X-ADDRESSBOOKSERVER-KIND', 'X-ADDRESSBOOKSERVER-PRIVATE-COMMENT'].includes(prop.name)) {
            // Don't add empty or binary data
          }
        }
        break;
    }
  }

  // Derive name parts from FN if N was missing
  if (!contact.first_name && !contact.last_name && contact.formatted_name) {
    const parts = contact.formatted_name.trim().split(/\s+/);
    if (parts.length === 1) {
      contact.first_name = parts[0];
    } else if (parts.length >= 2) {
      contact.first_name = parts[0];
      contact.last_name = parts[parts.length - 1];
      if (parts.length > 2) {
        contact.middle_name = parts.slice(1, -1).join(' ');
      }
    }
  }

  return contact;
}

// ── VCF Serializer ──────────────────────────────────────────────────────────

function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatType(type: string, label?: string | null): string {
  let result = type.toUpperCase();
  if (label && label !== type) result += `,${label}`;
  return result;
}

export function contactToVCard(contact: FullContact): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

  // UID
  lines.push(`UID:${contact.uid || contact.id}`);

  // N and FN
  const nParts = [
    escapeVCard(contact.last_name || ''),
    escapeVCard(contact.first_name || ''),
    escapeVCard(contact.middle_name || ''),
    escapeVCard(contact.prefix || ''),
    escapeVCard(contact.suffix || ''),
  ];
  lines.push(`N:${nParts.join(';')}`);
  lines.push(`FN:${escapeVCard(contact.formatted_name || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unnamed')}`);

  if (contact.nickname) lines.push(`NICKNAME:${escapeVCard(contact.nickname)}`);
  if (contact.organization) {
    const org = escapeVCard(contact.organization) + (contact.department ? `;${escapeVCard(contact.department)}` : '');
    lines.push(`ORG:${org}`);
  }
  if (contact.title) lines.push(`TITLE:${escapeVCard(contact.title)}`);
  if (contact.photo_data) lines.push(`PHOTO;ENCODING=b:${contact.photo_data}`);
  else if (contact.photo_url) lines.push(`PHOTO;URL=${escapeVCard(contact.photo_url)}`);
  if (contact.gender) lines.push(`GENDER:${contact.gender}`);
  if (contact.birthday) lines.push(`BDAY:${contact.birthday}`);
  if (contact.language) lines.push(`LANG:${contact.language}`);
  if (contact.timezone) lines.push(`TZ:${escapeVCard(contact.timezone)}`);

  // Emails
  for (const email of contact.emails) {
    const types = formatType(email.type, email.label);
    const pref = email.is_primary ? ';TYPE=pref' : '';
    lines.push(`EMAIL;TYPE=${types}${pref}:${escapeVCard(email.email)}`);
  }

  // Phones
  for (const phone of contact.phones) {
    const types = formatType(phone.type, phone.label);
    const pref = phone.is_primary ? ';TYPE=pref' : '';
    lines.push(`TEL;TYPE=${types}${pref}:${escapeVCard(phone.phone)}`);
  }

  // Addresses
  for (const addr of contact.addresses) {
    const types = formatType(addr.type, addr.label);
    const pref = addr.is_primary ? ';TYPE=pref' : '';
    const parts = [
      escapeVCard(addr.po_box || ''),
      escapeVCard(addr.extended_address || ''),
      escapeVCard(addr.street || ''),
      escapeVCard(addr.city || ''),
      escapeVCard(addr.region || ''),
      escapeVCard(addr.postal_code || ''),
      escapeVCard(addr.country || ''),
    ];
    lines.push(`ADR;TYPE=${types}${pref}:${parts.join(';')}`);
  }

  // URLs
  for (const url of contact.urls) {
    const types = formatType(url.type, url.label);
    lines.push(`URL;TYPE=${types}:${escapeVCard(url.url)}`);
  }

  // Notes
  for (const note of contact.notes) {
    lines.push(`NOTE:${escapeVCard(note.note)}`);
  }

  // Events
  for (const event of contact.events) {
    if (event.type === 'anniversary') {
      lines.push(`ANNIVERSARY:${event.event_date}`);
    } else {
      lines.push(`X-ABDATE;TYPE=${escapeVCard(event.type)}${event.label ? `;LABEL=${escapeVCard(event.label)}` : ''}:${event.event_date}`);
    }
  }

  // Labels as categories
  if (contact.labels && contact.labels.length > 0) {
    lines.push(`CATEGORIES:${contact.labels.map((l) => escapeVCard(l.name)).join(',')}`);
  }

  if (contact.is_favorite) lines.push('X-FAVORITE:true');

  lines.push(`REV:${new Date().toISOString()}`);
  lines.push('END:VCARD');

  return lines.join('\r\n');
}

export function contactsToVCardString(contacts: FullContact[]): string {
  return contacts.map(contactToVCard).join('\r\n') + '\r\n';
}
