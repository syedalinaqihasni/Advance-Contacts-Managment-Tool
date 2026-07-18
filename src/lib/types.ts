export interface Contact {
  id: string;
  prefix: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  nickname: string | null;
  formatted_name: string | null;
  organization: string | null;
  title: string | null;
  department: string | null;
  photo_url: string | null;
  photo_data: string | null;
  gender: string | null;
  birthday: string | null;
  language: string | null;
  timezone: string | null;
  preferred_contact_method: string | null;
  is_favorite: boolean;
  source: string | null;
  uid: string | null;
  revision: string | null;
  raw_vcard: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactEmail {
  id: string;
  contact_id: string;
  email: string;
  type: string;
  is_primary: boolean;
  label: string | null;
}

export interface ContactPhone {
  id: string;
  contact_id: string;
  phone: string;
  type: string;
  is_primary: boolean;
  label: string | null;
}

export interface ContactAddress {
  id: string;
  contact_id: string;
  type: string;
  label: string | null;
  po_box: string | null;
  extended_address: string | null;
  street: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  is_primary: boolean;
}

export interface ContactUrl {
  id: string;
  contact_id: string;
  url: string;
  type: string;
  label: string | null;
}

export interface ContactNote {
  id: string;
  contact_id: string;
  note: string;
}

export interface ContactEvent {
  id: string;
  contact_id: string;
  type: string;
  label: string | null;
  event_date: string;
}

export interface ContactLabel {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface FullContact extends Contact {
  emails: ContactEmail[];
  phones: ContactPhone[];
  addresses: ContactAddress[];
  urls: ContactUrl[];
  notes: ContactNote[];
  events: ContactEvent[];
  labels: ContactLabel[];
}

export interface MergeRecord {
  id: string;
  target_contact_id: string;
  merged_contact_id: string;
  merged_contact_snapshot: Record<string, unknown>;
  merged_at: string;
}

export interface DuplicateGroup {
  contacts: FullContact[];
  matchType: 'email' | 'phone' | 'name' | 'name+email';
  matchValue: string;
}
