import { useState } from 'react';
import { Copy, Mail, Phone, User, Check, ChevronRight, Layers, AlertCircle, Loader2 } from 'lucide-react';
import { findDuplicates, mergeContacts } from '../lib/duplicates';
import { saveContact, mergeAndDelete } from '../lib/data';
import type { FullContact, DuplicateGroup } from '../lib/types';

interface DuplicatesViewProps {
  contacts: FullContact[];
  onMerged: () => void;
}

type MatchOption = 'email' | 'phone' | 'name';

export function DuplicatesView({ contacts, onMerged }: DuplicatesViewProps) {
  const [matchBy, setMatchBy] = useState<Record<MatchOption, boolean>>({ email: true, phone: true, name: true });
  const [scanned, setScanned] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [resolvedGroups, setResolvedGroups] = useState<Set<number>>(new Set());
  const [merging, setMerging] = useState<number | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [selectedPrimary, setSelectedPrimary] = useState<Record<number, number>>({});

  const scan = () => {
    const result = findDuplicates(contacts, {
      matchByEmail: matchBy.email,
      matchByPhone: matchBy.phone,
      matchByName: matchBy.name,
    });
    setGroups(result.groups);
    setScanned(true);
    setResolvedGroups(new Set());
    setExpandedGroup(null);
    setSelectedPrimary({});
  };

  const handleMerge = async (groupIdx: number) => {
    setMerging(groupIdx);
    try {
      const group = groups[groupIdx];
      const primaryIdx = selectedPrimary[groupIdx] ?? 0;
      const sorted = [...group.contacts];
      const [primary] = sorted.splice(primaryIdx, 1);
      const allForMerge = [primary, ...sorted];

      const merged = mergeContacts(allForMerge);
      await saveContact(merged as Partial<FullContact>);
      await mergeAndDelete(primary.id, allForMerge);

      setResolvedGroups(new Set([...resolvedGroups, groupIdx]));
      setMerging(null);
      onMerged();
    } catch (err) {
      console.error('Merge failed:', err);
      setMerging(null);
    }
  };

  const handleSkip = (groupIdx: number) => {
    setResolvedGroups(new Set([...resolvedGroups, groupIdx]));
  };

  const matchTypeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
    email: Mail,
    phone: Phone,
    name: User,
  };

  const matchTypeLabel: Record<string, string> = {
    email: 'Same Email',
    phone: 'Same Phone',
    name: 'Same Name',
  };

  if (!scanned) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
          <Copy className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Find Duplicate Contacts</h2>
        <p className="text-sm text-slate-500 text-center max-w-md mb-6">
          Scan your contacts for potential duplicates based on matching email addresses, phone numbers, or names. You can then review and merge them.
        </p>

        <div className="space-y-2 mb-6 w-full max-w-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Match by</p>
          {(['email', 'phone', 'name'] as MatchOption[]).map((key) => {
            const Icon = matchTypeIcon[key];
            return (
              <label key={key} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={matchBy[key]}
                  onChange={(e) => setMatchBy({ ...matchBy, [key]: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-700">{matchTypeLabel[key]}</span>
              </label>
            );
          })}
        </div>

        <button
          onClick={scan}
          disabled={!matchBy.email && !matchBy.phone && !matchBy.name}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          Scan for Duplicates
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">No Duplicates Found</h2>
        <p className="text-sm text-slate-500 text-center max-w-md mb-6">
          Your contacts are clean. No duplicate entries were detected with the selected criteria.
        </p>
        <button onClick={() => setScanned(false)} className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          Rescan with different criteria
        </button>
      </div>
    );
  }

  const activeGroups = groups.filter((_, i) => !resolvedGroups.has(i));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Duplicate Contacts
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {activeGroups.length} group(s) remaining · {resolvedGroups.size} resolved
          </p>
        </div>
        <button onClick={() => setScanned(false)} className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-medium">
          Rescan
        </button>
      </div>

      <div className="space-y-3 max-w-3xl">
        {groups.map((group, groupIdx) => {
          const isResolved = resolvedGroups.has(groupIdx);
          const isExpanded = expandedGroup === groupIdx;
          const isMerging = merging === groupIdx;
          const MatchIcon = matchTypeIcon[group.matchType] || User;

          if (isResolved) {
            return (
              <div key={groupIdx} className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <Check className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-emerald-700 font-medium">
                  Resolved: {group.contacts.length} contacts merged by {matchTypeLabel[group.matchType]}
                </span>
              </div>
            );
          }

          return (
            <div key={groupIdx} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Group Header */}
              <div
                onClick={() => setExpandedGroup(isExpanded ? null : groupIdx)}
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                  <MatchIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {group.contacts.length} contacts with {matchTypeLabel[group.matchType]}
                  </p>
                  <p className="text-xs text-slate-400">
                    Match: <span className="font-mono">{group.matchValue}</span>
                  </p>
                </div>
                <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>

              {/* Expanded View */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  <div className="p-4 bg-slate-50">
                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Select the primary contact. Other contacts will be merged into it. All emails, phones, addresses, notes, and labels will be combined.
                    </p>

                    <div className="space-y-2">
                      {group.contacts.map((contact, contactIdx) => {
                        const isSelected = (selectedPrimary[groupIdx] ?? 0) === contactIdx;
                        const name = contact.formatted_name || [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Unnamed';
                        return (
                          <div
                            key={contact.id}
                            onClick={() => setSelectedPrimary({ ...selectedPrimary, [groupIdx]: contactIdx })}
                            className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                              isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-800">{name}</span>
                                {isSelected && <span className="text-xs text-blue-600 font-medium">Primary</span>}
                              </div>
                              {contact.organization && <p className="text-xs text-slate-400">{contact.organization}</p>}
                              <div className="mt-1 space-y-0.5">
                                {(contact.emails || []).slice(0, 2).map((e) => (
                                  <p key={e.id} className="text-xs text-slate-500 flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> {e.email}
                                  </p>
                                ))}
                                {(contact.phones || []).slice(0, 2).map((p) => (
                                  <p key={p.id} className="text-xs text-slate-500 flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> {p.phone}
                                  </p>
                                ))}
                                {(contact.labels || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(contact.labels || []).map((l) => (
                                      <span key={l.id} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{l.name}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        onClick={() => handleSkip(groupIdx)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => handleMerge(groupIdx)}
                        disabled={isMerging}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isMerging ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Merging...</>
                        ) : (
                          <><Layers className="w-4 h-4" /> Merge into Primary</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
