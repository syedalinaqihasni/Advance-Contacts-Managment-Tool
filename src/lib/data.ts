import { supabase } from './supabase';
import type { FullContact, ContactLabel } from './types';

// ── Fetch ────────────────────────────────────────────────────────────────────

export async function fetchAllContacts(): Promise<FullContact[]> {
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  if (!contacts || contacts.length === 0) return [];

  const ids = contacts.map((c) => c.id);

  const [emails, phones, addresses, urls, notes, events, assignments, labels] = await Promise.all([
    supabase.from('contact_emails').select('*').in('contact_id', ids),
    supabase.from('contact_phones').select('*').in('contact_id', ids),
    supabase.from('contact_addresses').select('*').in('contact_id', ids),
    supabase.from('contact_urls').select('*').in('contact_id', ids),
    supabase.from('contact_notes').select('*').in('contact_id', ids),
    supabase.from('contact_events').select('*').in('contact_id', ids),
    supabase.from('contact_label_assignments').select('*').in('contact_id', ids),
    supabase.from('contact_labels').select('*'),
  ]);

  const labelMap = new Map<string, ContactLabel>();
  for (const l of labels.data || []) labelMap.set(l.id, l);

  const emailMap = new Map<string, typeof emails.data>();
  for (const e of emails.data || []) {
    if (!emailMap.has(e.contact_id)) emailMap.set(e.contact_id, []);
    emailMap.get(e.contact_id)!.push(e);
  }

  const phoneMap = new Map<string, typeof phones.data>();
  for (const p of phones.data || []) {
    if (!phoneMap.has(p.contact_id)) phoneMap.set(p.contact_id, []);
    phoneMap.get(p.contact_id)!.push(p);
  }

  const addrMap = new Map<string, typeof addresses.data>();
  for (const a of addresses.data || []) {
    if (!addrMap.has(a.contact_id)) addrMap.set(a.contact_id, []);
    addrMap.get(a.contact_id)!.push(a);
  }

  const urlMap = new Map<string, typeof urls.data>();
  for (const u of urls.data || []) {
    if (!urlMap.has(u.contact_id)) urlMap.set(u.contact_id, []);
    urlMap.get(u.contact_id)!.push(u);
  }

  const noteMap = new Map<string, typeof notes.data>();
  for (const n of notes.data || []) {
    if (!noteMap.has(n.contact_id)) noteMap.set(n.contact_id, []);
    noteMap.get(n.contact_id)!.push(n);
  }

  const eventMap = new Map<string, typeof events.data>();
  for (const ev of events.data || []) {
    if (!eventMap.has(ev.contact_id)) eventMap.set(ev.contact_id, []);
    eventMap.get(ev.contact_id)!.push(ev);
  }

  const assignmentMap = new Map<string, string[]>();
  for (const a of assignments.data || []) {
    if (!assignmentMap.has(a.contact_id)) assignmentMap.set(a.contact_id, []);
    assignmentMap.get(a.contact_id)!.push(a.label_id);
  }

  return contacts.map((c) => ({
    ...c,
    emails: emailMap.get(c.id) || [],
    phones: phoneMap.get(c.id) || [],
    addresses: addrMap.get(c.id) || [],
    urls: urlMap.get(c.id) || [],
    notes: noteMap.get(c.id) || [],
    events: eventMap.get(c.id) || [],
    labels: (assignmentMap.get(c.id) || []).map((lid) => labelMap.get(lid)).filter(Boolean) as ContactLabel[],
  }));
}

// ── Create / Update ──────────────────────────────────────────────────────────

export async function saveContact(contact: Partial<FullContact>): Promise<string> {
  const { id, emails, phones, addresses, urls, notes, events, labels, ...contactFields } = contact;

  let contactId = id || '';

  if (contactId) {
    const { error } = await supabase.from('contacts').update(contactFields).eq('id', contactId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('contacts').insert(contactFields).select('id').single();
    if (error) throw error;
    contactId = data.id;
  }

  // Replace child records
  await Promise.all([
    supabase.from('contact_emails').delete().eq('contact_id', contactId),
    supabase.from('contact_phones').delete().eq('contact_id', contactId),
    supabase.from('contact_addresses').delete().eq('contact_id', contactId),
    supabase.from('contact_urls').delete().eq('contact_id', contactId),
    supabase.from('contact_notes').delete().eq('contact_id', contactId),
    supabase.from('contact_events').delete().eq('contact_id', contactId),
    supabase.from('contact_label_assignments').delete().eq('contact_id', contactId),
  ]);

  if (emails && emails.length > 0) {
    const rows = emails.map((e) => ({ ...e, id: undefined, contact_id: contactId }));
    const { error } = await supabase.from('contact_emails').insert(rows);
    if (error) throw error;
  }
  if (phones && phones.length > 0) {
    const rows = phones.map((p) => ({ ...p, id: undefined, contact_id: contactId }));
    const { error } = await supabase.from('contact_phones').insert(rows);
    if (error) throw error;
  }
  if (addresses && addresses.length > 0) {
    const rows = addresses.map((a) => ({ ...a, id: undefined, contact_id: contactId }));
    const { error } = await supabase.from('contact_addresses').insert(rows);
    if (error) throw error;
  }
  if (urls && urls.length > 0) {
    const rows = urls.map((u) => ({ ...u, id: undefined, contact_id: contactId }));
    const { error } = await supabase.from('contact_urls').insert(rows);
    if (error) throw error;
  }
  if (notes && notes.length > 0) {
    const rows = notes.map((n) => ({ ...n, id: undefined, contact_id: contactId }));
    const { error } = await supabase.from('contact_notes').insert(rows);
    if (error) throw error;
  }
  if (events && events.length > 0) {
    const rows = events.map((e) => ({ ...e, id: undefined, contact_id: contactId }));
    const { error } = await supabase.from('contact_events').insert(rows);
    if (error) throw error;
  }

  // Labels
  if (labels && labels.length > 0) {
    const labelIds: string[] = [];
    for (const label of labels) {
      let labelId = label.id;
      if (!labelId) {
        // Find or create label by name
        const { data: existing } = await supabase
          .from('contact_labels')
          .select('id')
          .eq('name', label.name)
          .maybeSingle();
        if (existing) {
          labelId = existing.id;
        } else {
          const { data: created, error } = await supabase
            .from('contact_labels')
            .insert({ name: label.name, color: label.color || 'slate' })
            .select('id')
            .single();
          if (error) throw error;
          labelId = created.id;
        }
      }
      labelIds.push(labelId);
    }
    const assignmentRows = labelIds.map((lid) => ({ contact_id: contactId, label_id: lid }));
    const { error } = await supabase.from('contact_label_assignments').insert(assignmentRows);
    if (error) throw error;
  }

  return contactId;
}

export async function deleteContact(contactId: string): Promise<void> {
  const { error } = await supabase.from('contacts').delete().eq('id', contactId);
  if (error) throw error;
}

export async function toggleFavorite(contactId: string, value: boolean): Promise<void> {
  const { error } = await supabase.from('contacts').update({ is_favorite: value }).eq('id', contactId);
  if (error) throw error;
}

// ── Labels ────────────────────────────────────────────────────────────────────

export async function fetchLabels(): Promise<ContactLabel[]> {
  const { data, error } = await supabase.from('contact_labels').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function createLabel(name: string, color = 'slate'): Promise<ContactLabel> {
  const { data, error } = await supabase.from('contact_labels').insert({ name, color }).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteLabel(labelId: string): Promise<void> {
  const { error } = await supabase.from('contact_labels').delete().eq('id', labelId);
  if (error) throw error;
}

// ── Merge ────────────────────────────────────────────────────────────────────

export async function mergeAndDelete(
  targetId: string,
  sourceContacts: FullContact[]
): Promise<void> {
  // Save snapshot of merged contacts
  for (const source of sourceContacts) {
    if (source.id === targetId) continue;
    const { error } = await supabase.from('merge_history').insert({
      target_contact_id: targetId,
      merged_contact_id: source.id,
      merged_contact_snapshot: source,
    });
    if (error) throw error;
  }

  // Delete source contacts (cascades to children)
  const sourceIds = sourceContacts.filter((c) => c.id !== targetId).map((c) => c.id);
  if (sourceIds.length > 0) {
    const { error } = await supabase.from('contacts').delete().in('id', sourceIds);
    if (error) throw error;
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────────

export async function fetchStats() {
  const [{ count: total }, { count: favorites }, { count: labels }] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('is_favorite', true),
    supabase.from('contact_labels').select('*', { count: 'exact', head: true }),
  ]);
  return { total: total || 0, favorites: favorites || 0, labels: labels || 0 };
}
