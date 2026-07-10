import { Star, Mail, Phone, Building2 } from 'lucide-react';
import type { FullContact } from '../lib/types';

interface ContactListProps {
  contacts: FullContact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onFavorite: (id: string, value: boolean) => void;
}

function getInitials(contact: FullContact): string {
  const first = contact.first_name?.[0] || '';
  const last = contact.last_name?.[0] || '';
  if (first || last) return (first + last).toUpperCase();
  return (contact.formatted_name?.[0] || '?').toUpperCase();
}

const avatarColors = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-orange-500', 'bg-pink-500',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

export function ContactList({ contacts, selectedId, onSelect, onFavorite }: ContactListProps) {
  return (
    <div>
      {contacts.map((contact) => {
        const primaryEmail = (contact.emails || []).find((e) => e.is_primary) || contact.emails?.[0];
        const primaryPhone = (contact.phones || []).find((p) => p.is_primary) || contact.phones?.[0];
        const isSelected = contact.id === selectedId;

        return (
          <div
            key={contact.id}
            onClick={() => onSelect(contact.id)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 transition-colors ${
              isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
            }`}
          >
            <div className={`w-10 h-10 rounded-full ${getAvatarColor(contact.id)} flex items-center justify-center text-white font-medium text-sm shrink-0`}>
              {getInitials(contact)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-slate-800 truncate">
                  {contact.formatted_name || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unnamed'}
                </span>
                {contact.is_favorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                {primaryEmail && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3" />
                    <span className="truncate">{primaryEmail.email}</span>
                  </span>
                )}
                {primaryPhone && (
                  <span className="flex items-center gap-1 truncate">
                    <Phone className="w-3 h-3" />
                    <span className="truncate">{primaryPhone.phone}</span>
                  </span>
                )}
                {!primaryEmail && !primaryPhone && contact.organization && (
                  <span className="flex items-center gap-1 truncate">
                    <Building2 className="w-3 h-3" />
                    <span className="truncate">{contact.organization}</span>
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavorite(contact.id, !contact.is_favorite);
              }}
              className="p-1 hover:bg-slate-200 rounded transition-colors shrink-0"
            >
              <Star className={`w-4 h-4 ${contact.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
