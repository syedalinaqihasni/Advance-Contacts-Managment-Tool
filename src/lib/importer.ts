import { supabase } from './supabase';
import { parseVCF } from './vcf';
import { parseCSV } from './csv';
import { parseJSON } from './jsonFormat';
import type { FullContact } from './types';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export type ImportFormat = 'vcf' | 'csv' | 'json';

export function detectFormat(filename: string): ImportFormat {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'vcf' || ext === 'vcard') return 'vcf';
  if (ext === 'csv') return 'csv';
  if (ext === 'json') return 'json';
  return 'vcf';
}

export function parseFile(text: string, format: ImportFormat): Partial<FullContact>[] {
  switch (format) {
    case 'vcf':
      return parseVCF(text);
    case 'csv':
      return parseCSV(text);
    case 'json':
      return parseJSON(text);
    default:
      return parseVCF(text);
  }
}

export async function importContacts(
  contacts: Partial<FullContact>[],
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < contacts.length; i++) {
    try {
      onProgress?.(i + 1, contacts.length);
      const c = contacts[i];

      // Skip if no name or email
      const hasName = c.first_name || c.last_name || c.formatted_name;
      const hasEmail = c.emails && c.emails.length > 0;
      const hasPhone = c.phones && c.phones.length > 0;
      if (!hasName && !hasEmail && !hasPhone) {
        skipped++;
        continue;
      }

      const contactFields: Record<string, unknown> = {
        prefix: c.prefix || null,
        first_name: c.first_name || null,
        middle_name: c.middle_name || null,
        last_name: c.last_name || null,
        suffix: c.suffix || null,
        nickname: c.nickname || null,
        formatted_name: c.formatted_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed',
        organization: c.organization || null,
        title: c.title || null,
        department: c.department || null,
        photo_url: c.photo_url || null,
        photo_data: c.photo_data || null,
        gender: c.gender || null,
        birthday: c.birthday || null,
        language: c.language || null,
        timezone: c.timezone || null,
        source: c.source || 'import',
        uid: c.uid || null,
      };

      const { data: inserted, error: contactError } = await supabase
        .from('contacts')
        .insert(contactFields)
        .select('id')
        .single();
      if (contactError) throw new Error(contactError.message);
      const contactId = inserted.id;

      // Insert emails
      if (c.emails && c.emails.length > 0) {
        const rows = c.emails.map((e) => ({
          contact_id: contactId,
          email: e.email,
          type: e.type || 'other',
          is_primary: e.is_primary || false,
          label: e.label || null,
        }));
        const { error } = await supabase.from('contact_emails').insert(rows);
        if (error) errors.push(`Contact ${i + 1}: emails - ${error.message}`);
      }

      // Insert phones
      if (c.phones && c.phones.length > 0) {
        const rows = c.phones.map((p) => ({
          contact_id: contactId,
          phone: p.phone,
          type: p.type || 'other',
          is_primary: p.is_primary || false,
          label: p.label || null,
        }));
        const { error } = await supabase.from('contact_phones').insert(rows);
        if (error) errors.push(`Contact ${i + 1}: phones - ${error.message}`);
      }

      // Insert addresses
      if (c.addresses && c.addresses.length > 0) {
        const rows = c.addresses.map((a) => ({
          contact_id: contactId,
          type: a.type || 'other',
          label: a.label || null,
          po_box: a.po_box || null,
          extended_address: a.extended_address || null,
          street: a.street || null,
          city: a.city || null,
          region: a.region || null,
          postal_code: a.postal_code || null,
          country: a.country || null,
          is_primary: a.is_primary || false,
        }));
        const { error } = await supabase.from('contact_addresses').insert(rows);
        if (error) errors.push(`Contact ${i + 1}: addresses - ${error.message}`);
      }

      // Insert URLs
      if (c.urls && c.urls.length > 0) {
        const rows = c.urls.map((u) => ({
          contact_id: contactId,
          url: u.url,
          type: u.type || 'other',
          label: u.label || null,
        }));
        const { error } = await supabase.from('contact_urls').insert(rows);
        if (error) errors.push(`Contact ${i + 1}: urls - ${error.message}`);
      }

      // Insert notes
      if (c.notes && c.notes.length > 0) {
        const rows = c.notes.map((n) => ({
          contact_id: contactId,
          note: n.note,
        }));
        const { error } = await supabase.from('contact_notes').insert(rows);
        if (error) errors.push(`Contact ${i + 1}: notes - ${error.message}`);
      }

      // Insert events
      if (c.events && c.events.length > 0) {
        const rows = c.events.map((e) => ({
          contact_id: contactId,
          type: e.type || 'custom',
          label: e.label || null,
          event_date: e.event_date,
        }));
        const { error } = await supabase.from('contact_events').insert(rows);
        if (error) errors.push(`Contact ${i + 1}: events - ${error.message}`);
      }

      // Insert labels
      if (c.labels && c.labels.length > 0) {
        const labelIds: string[] = [];
        for (const label of c.labels) {
          const { data: existing } = await supabase
            .from('contact_labels')
            .select('id')
            .eq('name', label.name)
            .maybeSingle();
          if (existing) {
            labelIds.push(existing.id);
          } else {
            const { data: created } = await supabase
              .from('contact_labels')
              .insert({ name: label.name, color: 'slate' })
              .select('id')
              .single();
            if (created) labelIds.push(created.id);
          }
        }
        if (labelIds.length > 0) {
          const rows = labelIds.map((lid) => ({ contact_id: contactId, label_id: lid }));
          const { error } = await supabase.from('contact_label_assignments').insert(rows);
          if (error) errors.push(`Contact ${i + 1}: labels - ${error.message}`);
        }
      }

      imported++;
    } catch (err) {
      errors.push(`Contact ${i + 1}: ${(err as Error).message}`);
      skipped++;
    }
  }

  return { imported, skipped, errors };
}
