import { useState } from 'react';
import {
  Star, Mail, Phone, MapPin, Globe, Calendar, StickyNote, Building2,
  Edit2, Trash2, Tag, Cake, Award, User,
} from 'lucide-react';
import type { FullContact } from '../lib/types';

interface ContactDetailProps {
  contact: FullContact;
  onEdit: () => void;
  onDelete: () => void;
}

const typeLabels: Record<string, string> = {
  home: 'Home', work: 'Work', cell: 'Mobile', other: 'Other', fax: 'Fax', pager: 'Pager', main: 'Main', car: 'Car',
};

export function ContactDetail({ contact, onEdit, onDelete }: ContactDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fullName = [contact.prefix, contact.first_name, contact.middle_name, contact.last_name, contact.suffix]
    .filter(Boolean).join(' ');
  const displayName = contact.formatted_name || fullName || 'Unnamed';

  const avatarColors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500'];
  const colorIdx = contact.id.charCodeAt(0) % avatarColors.length;

  return (
    <div className="max-w-2xl mx-auto p-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className={`w-20 h-20 rounded-full ${avatarColors[colorIdx]} flex items-center justify-center text-white text-2xl font-medium shrink-0`}>
          {displayName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 pt-1">
          <h1 className="text-2xl font-semibold text-slate-800">{displayName}</h1>
          {contact.nickname && <p className="text-sm text-slate-500 mt-0.5">"{contact.nickname}"</p>}
          {contact.organization && (
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {contact.organization}{contact.title ? ` — ${contact.title}` : ''}
            </p>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
            <button
              onClick={() => {}}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                contact.is_favorite
                  ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${contact.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
              {contact.is_favorite ? 'Favorited' : 'Favorite'}
            </button>
          </div>
        </div>
      </div>

      {/* Labels */}
      {contact.labels && contact.labels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {contact.labels.map((label) => (
            <span key={label.id} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              <Tag className="w-3 h-3" />
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Contact Info Sections */}
      <div className="space-y-6">
        {/* Emails */}
        {contact.emails && contact.emails.length > 0 && (
          <Section icon={Mail} title="Email">
            {contact.emails.map((email) => (
              <div key={email.id} className="flex items-center gap-3 py-1.5">
                <div className="flex-1">
                  <a href={`mailto:${email.email}`} className="text-sm text-blue-600 hover:underline">{email.email}</a>
                  <p className="text-xs text-slate-400">{typeLabels[email.type] || email.type}{email.label ? ` · ${email.label}` : ''}{email.is_primary ? ' · Primary' : ''}</p>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Phones */}
        {contact.phones && contact.phones.length > 0 && (
          <Section icon={Phone} title="Phone">
            {contact.phones.map((phone) => (
              <div key={phone.id} className="flex items-center gap-3 py-1.5">
                <div className="flex-1">
                  <a href={`tel:${phone.phone}`} className="text-sm text-blue-600 hover:underline">{phone.phone}</a>
                  <p className="text-xs text-slate-400">{typeLabels[phone.type] || phone.type}{phone.label ? ` · ${phone.label}` : ''}{phone.is_primary ? ' · Primary' : ''}</p>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Addresses */}
        {contact.addresses && contact.addresses.length > 0 && (
          <Section icon={MapPin} title="Address">
            {contact.addresses.map((addr) => (
              <div key={addr.id} className="py-1.5">
                <p className="text-sm text-slate-700">
                  {[addr.po_box && `PO Box ${addr.po_box}`, addr.extended_address, addr.street, addr.city, addr.region, addr.postal_code, addr.country]
                    .filter(Boolean).join(', ')}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{typeLabels[addr.type] || addr.type}{addr.label ? ` · ${addr.label}` : ''}{addr.is_primary ? ' · Primary' : ''}</p>
              </div>
            ))}
          </Section>
        )}

        {/* URLs */}
        {contact.urls && contact.urls.length > 0 && (
          <Section icon={Globe} title="Website">
            {contact.urls.map((url) => (
              <div key={url.id} className="py-1.5">
                <a href={url.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  {url.url}
                </a>
                <p className="text-xs text-slate-400">{typeLabels[url.type] || url.type}{url.label ? ` · ${url.label}` : ''}</p>
              </div>
            ))}
          </Section>
        )}

        {/* Events */}
        {contact.events && contact.events.length > 0 && (
          <Section icon={Calendar} title="Events">
            {contact.events.map((event) => (
              <div key={event.id} className="flex items-center gap-3 py-1.5">
                {event.type === 'anniversary' ? <Award className="w-4 h-4 text-slate-400" /> : <Calendar className="w-4 h-4 text-slate-400" />}
                <div>
                  <p className="text-sm text-slate-700">{new Date(event.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-xs text-slate-400 capitalize">{event.type}{event.label ? ` · ${event.label}` : ''}</p>
                </div>
              </div>
            ))}
          </Section>
        )}

        {/* Birthday */}
        {contact.birthday && (
          <Section icon={Cake} title="Birthday">
            <p className="text-sm text-slate-700">
              {new Date(contact.birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </Section>
        )}

        {/* Notes */}
        {contact.notes && contact.notes.length > 0 && (
          <Section icon={StickyNote} title="Notes">
            {contact.notes.map((note) => (
              <div key={note.id} className="py-1.5">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.note}</p>
              </div>
            ))}
          </Section>
        )}

        {/* Other Details */}
        {(contact.gender || contact.language || contact.timezone || contact.department) && (
          <Section icon={User} title="Other Details">
            {contact.gender && <DetailRow label="Gender" value={contact.gender} />}
            {contact.language && <DetailRow label="Language" value={contact.language} />}
            {contact.timezone && <DetailRow label="Timezone" value={contact.timezone} />}
            {contact.department && <DetailRow label="Department" value={contact.department} />}
          </Section>
        )}
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-semibold text-slate-800">Delete contact?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              This will permanently delete "{displayName}" and all associated data. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={onDelete} className="px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-slate-400">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <div className="pl-6 border-l border-slate-200 ml-1.5">
        {children}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm text-slate-700">{value}</span>
    </div>
  );
}
