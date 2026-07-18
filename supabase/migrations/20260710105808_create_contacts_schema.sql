/*
# Create contacts management schema

1. Overview
A single-tenant (no-auth) contacts management system supporting full vCard 3.0/4.0 fields.
Contacts have multiple emails, phones, addresses, URLs, notes, events, and labels.
Supports duplicate detection and merging with a merge history audit trail.

2. New Tables
- `contacts`: core contact record (name, org, title, photo, birthday, etc.)
- `contact_emails`: multiple email addresses per contact with type labels
- `contact_phones`: multiple phone numbers per contact with type labels
- `contact_addresses`: multiple structured postal addresses per contact with type labels
- `contact_urls`: multiple URLs per contact with type labels
- `contact_notes`: multiple notes per contact
- `contact_events`: multiple events (anniversary, custom) per contact with type labels
- `contact_labels`: user-defined labels/groups for organizing contacts (e.g. Work, Family)
- `contact_label_assignments`: many-to-many between contacts and labels
- `merge_history`: audit trail of merged contacts

3. Security
- Single-tenant no-auth app. RLS enabled on all tables with anon+authenticated full CRUD.
- Data is intentionally shared/public within this app instance.
*/

-- Labels (groups/categories)
CREATE TABLE IF NOT EXISTS contact_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text DEFAULT 'slate',
  created_at timestamptz DEFAULT now()
);

-- Core contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix text,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  nickname text,
  formatted_name text,
  organization text,
  title text,
  department text,
  photo_url text,
  photo_data text,
  gender text,
  birthday date,
  language text,
  timezone text,
  preferred_contact_method text,
  is_favorite boolean NOT NULL DEFAULT false,
  source text DEFAULT 'manual',
  uid text,
  revision timestamptz,
  raw_vcard text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Emails
CREATE TABLE IF NOT EXISTS contact_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email text NOT NULL,
  type text DEFAULT 'other',
  is_primary boolean DEFAULT false,
  label text,
  created_at timestamptz DEFAULT now()
);

-- Phones
CREATE TABLE IF NOT EXISTS contact_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  phone text NOT NULL,
  type text DEFAULT 'other',
  is_primary boolean DEFAULT false,
  label text,
  created_at timestamptz DEFAULT now()
);

-- Addresses
CREATE TABLE IF NOT EXISTS contact_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type text DEFAULT 'other',
  label text,
  po_box text,
  extended_address text,
  street text,
  city text,
  region text,
  postal_code text,
  country text,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- URLs
CREATE TABLE IF NOT EXISTS contact_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  url text NOT NULL,
  type text DEFAULT 'other',
  label text,
  created_at timestamptz DEFAULT now()
);

-- Notes
CREATE TABLE IF NOT EXISTS contact_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Events (anniversary, custom dates)
CREATE TABLE IF NOT EXISTS contact_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'anniversary',
  label text,
  event_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Label assignments (many-to-many)
CREATE TABLE IF NOT EXISTS contact_label_assignments (
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES contact_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, label_id)
);

-- Merge history audit trail
CREATE TABLE IF NOT EXISTS merge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  merged_contact_id uuid NOT NULL,
  merged_contact_snapshot jsonb NOT NULL,
  merged_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_first_name ON contacts(first_name);
CREATE INDEX IF NOT EXISTS idx_contacts_last_name ON contacts(last_name);
CREATE INDEX IF NOT EXISTS idx_contacts_organization ON contacts(organization);
CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON contacts(updated_at);
CREATE INDEX IF NOT EXISTS idx_emails_contact_id ON contact_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_emails_email ON contact_emails(email);
CREATE INDEX IF NOT EXISTS idx_phones_contact_id ON contact_phones(contact_id);
CREATE INDEX IF NOT EXISTS idx_phones_phone ON contact_phones(phone);
CREATE INDEX IF NOT EXISTS idx_addresses_contact_id ON contact_addresses(contact_id);
CREATE INDEX IF NOT EXISTS idx_urls_contact_id ON contact_urls(contact_id);
CREATE INDEX IF NOT EXISTS idx_notes_contact_id ON contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_events_contact_id ON contact_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_label_assignments_contact_id ON contact_label_assignments(contact_id);
CREATE INDEX IF NOT EXISTS idx_label_assignments_label_id ON contact_label_assignments(label_id);
CREATE INDEX IF NOT EXISTS idx_merge_history_target ON merge_history(target_contact_id);

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_label_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE merge_history ENABLE ROW LEVEL SECURITY;

-- Policies: anon+authenticated full CRUD (single-tenant, no-auth app)
-- contacts
DROP POLICY IF EXISTS "anon_select_contacts" ON contacts;
CREATE POLICY "anon_select_contacts" ON contacts FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_contacts" ON contacts;
CREATE POLICY "anon_insert_contacts" ON contacts FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_contacts" ON contacts;
CREATE POLICY "anon_update_contacts" ON contacts FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_contacts" ON contacts;
CREATE POLICY "anon_delete_contacts" ON contacts FOR DELETE TO anon, authenticated USING (true);

-- contact_emails
DROP POLICY IF EXISTS "anon_select_emails" ON contact_emails;
CREATE POLICY "anon_select_emails" ON contact_emails FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_emails" ON contact_emails;
CREATE POLICY "anon_insert_emails" ON contact_emails FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_emails" ON contact_emails;
CREATE POLICY "anon_update_emails" ON contact_emails FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_emails" ON contact_emails;
CREATE POLICY "anon_delete_emails" ON contact_emails FOR DELETE TO anon, authenticated USING (true);

-- contact_phones
DROP POLICY IF EXISTS "anon_select_phones" ON contact_phones;
CREATE POLICY "anon_select_phones" ON contact_phones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_phones" ON contact_phones;
CREATE POLICY "anon_insert_phones" ON contact_phones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_phones" ON contact_phones;
CREATE POLICY "anon_update_phones" ON contact_phones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_phones" ON contact_phones;
CREATE POLICY "anon_delete_phones" ON contact_phones FOR DELETE TO anon, authenticated USING (true);

-- contact_addresses
DROP POLICY IF EXISTS "anon_select_addresses" ON contact_addresses;
CREATE POLICY "anon_select_addresses" ON contact_addresses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_addresses" ON contact_addresses;
CREATE POLICY "anon_insert_addresses" ON contact_addresses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_addresses" ON contact_addresses;
CREATE POLICY "anon_update_addresses" ON contact_addresses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_addresses" ON contact_addresses;
CREATE POLICY "anon_delete_addresses" ON contact_addresses FOR DELETE TO anon, authenticated USING (true);

-- contact_urls
DROP POLICY IF EXISTS "anon_select_urls" ON contact_urls;
CREATE POLICY "anon_select_urls" ON contact_urls FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_urls" ON contact_urls;
CREATE POLICY "anon_insert_urls" ON contact_urls FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_urls" ON contact_urls;
CREATE POLICY "anon_update_urls" ON contact_urls FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_urls" ON contact_urls;
CREATE POLICY "anon_delete_urls" ON contact_urls FOR DELETE TO anon, authenticated USING (true);

-- contact_notes
DROP POLICY IF EXISTS "anon_select_notes" ON contact_notes;
CREATE POLICY "anon_select_notes" ON contact_notes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notes" ON contact_notes;
CREATE POLICY "anon_insert_notes" ON contact_notes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_notes" ON contact_notes;
CREATE POLICY "anon_update_notes" ON contact_notes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notes" ON contact_notes;
CREATE POLICY "anon_delete_notes" ON contact_notes FOR DELETE TO anon, authenticated USING (true);

-- contact_events
DROP POLICY IF EXISTS "anon_select_events" ON contact_events;
CREATE POLICY "anon_select_events" ON contact_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_events" ON contact_events;
CREATE POLICY "anon_insert_events" ON contact_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_events" ON contact_events;
CREATE POLICY "anon_update_events" ON contact_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_events" ON contact_events;
CREATE POLICY "anon_delete_events" ON contact_events FOR DELETE TO anon, authenticated USING (true);

-- contact_labels
DROP POLICY IF EXISTS "anon_select_labels" ON contact_labels;
CREATE POLICY "anon_select_labels" ON contact_labels FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_labels" ON contact_labels;
CREATE POLICY "anon_insert_labels" ON contact_labels FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_labels" ON contact_labels;
CREATE POLICY "anon_update_labels" ON contact_labels FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_labels" ON contact_labels;
CREATE POLICY "anon_delete_labels" ON contact_labels FOR DELETE TO anon, authenticated USING (true);

-- contact_label_assignments
DROP POLICY IF EXISTS "anon_select_assignments" ON contact_label_assignments;
CREATE POLICY "anon_select_assignments" ON contact_label_assignments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_assignments" ON contact_label_assignments;
CREATE POLICY "anon_insert_assignments" ON contact_label_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_assignments" ON contact_label_assignments;
CREATE POLICY "anon_delete_assignments" ON contact_label_assignments FOR DELETE TO anon, authenticated USING (true);

-- merge_history
DROP POLICY IF EXISTS "anon_select_merge_history" ON merge_history;
CREATE POLICY "anon_select_merge_history" ON merge_history FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_merge_history" ON merge_history;
CREATE POLICY "anon_insert_merge_history" ON merge_history FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_merge_history" ON merge_history;
CREATE POLICY "anon_delete_merge_history" ON merge_history FOR DELETE TO anon, authenticated USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
