import { useState } from 'react';
import { Plus, Trash2, Star, Save, X } from 'lucide-react';
import { saveContact } from '../lib/data';
import type { FullContact, ContactEmail, ContactPhone, ContactAddress, ContactUrl, ContactNote, ContactEvent } from '../lib/types';

interface ContactEditorProps {
  contact?: FullContact;
  onSave: () => void;
  onCancel: () => void;
  labels: { id: string; name: string; color: string }[];
}

const typeOptions = ['home', 'work', 'cell', 'other', 'fax', 'pager', 'main'];
const eventTypeOptions = ['anniversary', 'birthday', 'custom'];

export function ContactEditor({ contact, onSave, onCancel, labels }: ContactEditorProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prefix, setPrefix] = useState(contact?.prefix || '');
  const [firstName, setFirstName] = useState(contact?.first_name || '');
  const [middleName, setMiddleName] = useState(contact?.middle_name || '');
  const [lastName, setLastName] = useState(contact?.last_name || '');
  const [suffix, setSuffix] = useState(contact?.suffix || '');
  const [nickname, setNickname] = useState(contact?.nickname || '');
  const [organization, setOrganization] = useState(contact?.organization || '');
  const [title, setTitle] = useState(contact?.title || '');
  const [department, setDepartment] = useState(contact?.department || '');
  const [birthday, setBirthday] = useState(contact?.birthday || '');
  const [gender, setGender] = useState(contact?.gender || '');
  const [language, setLanguage] = useState(contact?.language || '');
  const [timezone, setTimezone] = useState(contact?.timezone || '');
  const [photoUrl, setPhotoUrl] = useState(contact?.photo_url || '');
  const [isFavorite, setIsFavorite] = useState(contact?.is_favorite || false);

  const [emails, setEmails] = useState<ContactEmail[]>(contact?.emails || []);
  const [phones, setPhones] = useState<ContactPhone[]>(contact?.phones || []);
  const [addresses, setAddresses] = useState<ContactAddress[]>(contact?.addresses || []);
  const [urls, setUrls] = useState<ContactUrl[]>(contact?.urls || []);
  const [notes, setNotes] = useState<ContactNote[]>(contact?.notes || []);
  const [events, setEvents] = useState<ContactEvent[]>(contact?.events || []);
  const [selectedLabels, setSelectedLabels] = useState<{ id: string; name: string; color: string; created_at?: string }[]>(contact?.labels || []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const formattedName = [firstName, lastName].filter(Boolean).join(' ') || 'Unnamed';
      await saveContact({
        id: contact?.id,
        prefix: prefix || null,
        first_name: firstName || null,
        middle_name: middleName || null,
        last_name: lastName || null,
        suffix: suffix || null,
        nickname: nickname || null,
        formatted_name: formattedName,
        organization: organization || null,
        title: title || null,
        department: department || null,
        photo_url: photoUrl || null,
        birthday: birthday || null,
        gender: gender || null,
        language: language || null,
        timezone: timezone || null,
        is_favorite: isFavorite,
        emails: emails.filter((e) => e.email.trim()),
        phones: phones.filter((p) => p.phone.trim()),
        addresses: addresses.filter((a) => a.street || a.city),
        urls: urls.filter((u) => u.url.trim()),
        notes: notes.filter((n) => n.note.trim()),
        events: events.filter((e) => e.event_date),
        labels: selectedLabels,
      } as Partial<FullContact>);
      onSave();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">{contact ? 'Edit Contact' : 'New Contact'}</h1>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-rose-50 text-rose-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Name Section */}
      <Card title="Name">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prefix"><Input value={prefix} onChange={setPrefix} placeholder="Dr." /></Field>
          <Field label="Suffix"><Input value={suffix} onChange={setSuffix} placeholder="Jr." /></Field>
          <Field label="First Name"><Input value={firstName} onChange={setFirstName} placeholder="John" /></Field>
          <Field label="Last Name"><Input value={lastName} onChange={setLastName} placeholder="Doe" /></Field>
          <Field label="Middle Name"><Input value={middleName} onChange={setMiddleName} placeholder="Edward" /></Field>
          <Field label="Nickname"><Input value={nickname} onChange={setNickname} placeholder="Johnny" /></Field>
        </div>
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className={`mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isFavorite ? 'bg-amber-50 text-amber-600' : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
          {isFavorite ? 'Favorited' : 'Add to Favorites'}
        </button>
      </Card>

      {/* Organization */}
      <Card title="Organization">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Organization"><Input value={organization} onChange={setOrganization} placeholder="Acme Inc." /></Field>
          <Field label="Title"><Input value={title} onChange={setTitle} placeholder="Software Engineer" /></Field>
          <Field label="Department"><Input value={department} onChange={setDepartment} placeholder="Engineering" /></Field>
        </div>
      </Card>

      {/* Emails */}
      <Card title="Emails" onAdd={() => setEmails([...emails, { email: '', type: 'other', is_primary: false, label: null, contact_id: '', id: '' }])}>
        {emails.map((email, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Input value={email.email} onChange={(v) => { const e = [...emails]; e[i] = { ...e[i], email: v }; setEmails(e); }} placeholder="email@example.com" className="flex-1" />
            <Select value={email.type} onChange={(v) => { const e = [...emails]; e[i] = { ...e[i], type: v }; setEmails(e); }} options={typeOptions} />
            <button onClick={() => setEmails(emails.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </Card>

      {/* Phones */}
      <Card title="Phones" onAdd={() => setPhones([...phones, { phone: '', type: 'cell', is_primary: false, label: null, contact_id: '', id: '' }])}>
        {phones.map((phone, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Input value={phone.phone} onChange={(v) => { const p = [...phones]; p[i] = { ...p[i], phone: v }; setPhones(p); }} placeholder="+1 555-0100" className="flex-1" />
            <Select value={phone.type} onChange={(v) => { const p = [...phones]; p[i] = { ...p[i], type: v }; setPhones(p); }} options={typeOptions} />
            <button onClick={() => setPhones(phones.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </Card>

      {/* Addresses */}
      <Card title="Addresses" onAdd={() => setAddresses([...addresses, { type: 'home', label: null, po_box: null, extended_address: null, street: '', city: '', region: null, postal_code: null, country: null, is_primary: false, contact_id: '', id: '' }])}>
        {addresses.map((addr, i) => (
          <div key={i} className="mb-3 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Select value={addr.type} onChange={(v) => { const a = [...addresses]; a[i] = { ...a[i], type: v }; setAddresses(a); }} options={typeOptions} />
              <button onClick={() => setAddresses(addresses.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input value={addr.street || ''} onChange={(v) => { const a = [...addresses]; a[i] = { ...a[i], street: v }; setAddresses(a); }} placeholder="Street" />
              <Input value={addr.city || ''} onChange={(v) => { const a = [...addresses]; a[i] = { ...a[i], city: v }; setAddresses(a); }} placeholder="City" />
              <Input value={addr.region || ''} onChange={(v) => { const a = [...addresses]; a[i] = { ...a[i], region: v }; setAddresses(a); }} placeholder="State/Region" />
              <Input value={addr.postal_code || ''} onChange={(v) => { const a = [...addresses]; a[i] = { ...a[i], postal_code: v }; setAddresses(a); }} placeholder="Postal Code" />
              <Input value={addr.country || ''} onChange={(v) => { const a = [...addresses]; a[i] = { ...a[i], country: v }; setAddresses(a); }} placeholder="Country" />
            </div>
          </div>
        ))}
      </Card>

      {/* URLs */}
      <Card title="Websites" onAdd={() => setUrls([...urls, { url: '', type: 'other', label: null, contact_id: '', id: '' }])}>
        {urls.map((url, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Input value={url.url} onChange={(v) => { const u = [...urls]; u[i] = { ...u[i], url: v }; setUrls(u); }} placeholder="https://example.com" className="flex-1" />
            <Select value={url.type} onChange={(v) => { const u = [...urls]; u[i] = { ...u[i], type: v }; setUrls(u); }} options={typeOptions} />
            <button onClick={() => setUrls(urls.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </Card>

      {/* Events */}
      <Card title="Events" onAdd={() => setEvents([...events, { type: 'anniversary', label: null, event_date: '', contact_id: '', id: '' }])}>
        {events.map((event, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <Input type="date" value={event.event_date} onChange={(v) => { const e = [...events]; e[i] = { ...e[i], event_date: v }; setEvents(e); }} className="flex-1" />
            <Select value={event.type} onChange={(v) => { const e = [...events]; e[i] = { ...e[i], type: v }; setEvents(e); }} options={eventTypeOptions} />
            <button onClick={() => setEvents(events.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </Card>

      {/* Birthday */}
      <Card title="Personal Details">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Birthday"><Input type="date" value={birthday} onChange={setBirthday} /></Field>
          <Field label="Gender"><Input value={gender} onChange={setGender} placeholder="Male/Female/Other" /></Field>
          <Field label="Language"><Input value={language} onChange={setLanguage} placeholder="English" /></Field>
          <Field label="Timezone"><Input value={timezone} onChange={setTimezone} placeholder="America/New_York" /></Field>
          <Field label="Photo URL"><Input value={photoUrl} onChange={setPhotoUrl} placeholder="https://..." /></Field>
        </div>
      </Card>

      {/* Notes */}
      <Card title="Notes" onAdd={() => setNotes([...notes, { note: '', contact_id: '', id: '' }])}>
        {notes.map((note, i) => (
          <div key={i} className="flex items-start gap-2 mb-2">
            <textarea
              value={note.note}
              onChange={(e) => { const n = [...notes]; n[i] = { ...n[i], note: e.target.value }; setNotes(n); }}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-300 focus:bg-white transition-all resize-none"
              rows={2}
            />
            <button onClick={() => setNotes(notes.filter((_, idx) => idx !== i))} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors mt-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </Card>

      {/* Labels */}
      <Card title="Labels">
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => {
            const isSelected = selectedLabels.some((sl) => sl.id === label.id || sl.name === label.name);
            return (
              <button
                key={label.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedLabels(selectedLabels.filter((sl) => sl.id !== label.id && sl.name !== label.name));
                  } else {
                    setSelectedLabels([...selectedLabels, { id: label.id, name: label.name, color: label.color, created_at: '' }]);
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label.name}
              </button>
            );
          })}
          {labels.length === 0 && <p className="text-sm text-slate-400">No labels yet. Import contacts with categories to create labels.</p>}
        </div>
      </Card>
    </div>
  );
}

function Card({ title, onAdd, children }: { title: string; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-5 bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{title}</h3>
        {onAdd && (
          <button onClick={onAdd} className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-300 focus:bg-white transition-all ${className}`}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-300 transition-all capitalize"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}
