import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { fetchAllContacts, fetchStats, deleteContact, toggleFavorite } from './lib/data';
import type { FullContact } from './lib/types';
import { ContactList } from './components/ContactList';
import { ContactDetail } from './components/ContactDetail';
import { ContactEditor } from './components/ContactEditor';
import { ImportModal } from './components/ImportModal';
import { ExportModal } from './components/ExportModal';
import { DuplicatesView } from './components/DuplicatesView';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Users, LayoutGrid, UserPlus, Loader2 } from 'lucide-react';

type View = 'contacts' | 'duplicates';

export default function App() {
  const [contacts, setContacts] = useState<FullContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('contacts');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [favFilter, setFavFilter] = useState(false);
  const [stats, setStats] = useState({ total: 0, favorites: 0, labels: 0 });
  const [labels, setLabels] = useState<{ id: string; name: string; color: string }[]>([]);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllContacts();
      setContacts(data);
      const s = await fetchStats();
      setStats(s);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLabels = useCallback(async () => {
    try {
      const { data } = await supabase.from('contact_labels').select('*').order('name');
      setLabels(data || []);
    } catch (err) {
      console.error('Failed to load labels:', err);
    }
  }, []);

  useEffect(() => {
    loadContacts();
    loadLabels();
  }, [loadContacts, loadLabels]);

  const selected = contacts.find((c) => c.id === selectedId) || null;

  const filtered = contacts.filter((c) => {
    if (favFilter && !c.is_favorite) return false;
    if (labelFilter) {
      if (!c.labels || !c.labels.some((l) => l.id === labelFilter)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const name = [c.first_name, c.last_name, c.formatted_name].filter(Boolean).join(' ').toLowerCase();
      const email = (c.emails || []).map((e) => e.email).join(' ').toLowerCase();
      const phone = (c.phones || []).map((p) => p.phone).join(' ');
      const org = (c.organization || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || org.includes(q);
    }
    return true;
  });

  const handleSaved = () => {
    setEditing(false);
    setCreating(false);
    loadContacts();
    loadLabels();
  };

  const handleDelete = async (id: string) => {
    await deleteContact(id);
    setSelectedId(null);
    loadContacts();
    loadLabels();
  };

  const handleFavorite = async (id: string, value: boolean) => {
    await toggleFavorite(id, value);
    loadContacts();
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        search={search}
        onSearch={setSearch}
        onImport={() => setShowImport(true)}
        onExport={() => setShowExport(true)}
        onNew={() => { setCreating(true); setEditing(false); setSelectedId(null); }}
        stats={stats}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          view={view}
          onView={setView}
          favFilter={favFilter}
          onFavFilter={setFavFilter}
          labelFilter={labelFilter}
          onLabelFilter={setLabelFilter}
          labels={labels}
          stats={stats}
          contacts={contacts}
        />

        <main className="flex-1 flex overflow-hidden">
          {view === 'contacts' && (
            <>
              <div className="w-96 border-r border-slate-200 overflow-y-auto bg-white">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <Users className="w-12 h-12 mb-3" />
                    <p className="text-sm">No contacts found</p>
                  </div>
                ) : (
                  <ContactList
                    contacts={filtered}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onFavorite={handleFavorite}
                  />
                )}
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50">
                {creating ? (
                  <ContactEditor onSave={handleSaved} onCancel={() => setCreating(false)} labels={labels} />
                ) : editing && selected ? (
                  <ContactEditor
                    contact={selected}
                    onSave={handleSaved}
                    onCancel={() => setEditing(false)}
                    labels={labels}
                  />
                ) : selected ? (
                  <ContactDetail
                    contact={selected}
                    onEdit={() => setEditing(true)}
                    onDelete={() => handleDelete(selected.id)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <LayoutGrid className="w-16 h-16 mb-4" />
                    <p className="text-lg font-medium">Select a contact</p>
                    <p className="text-sm mt-1">or create a new one to get started</p>
                    <button
                      onClick={() => setCreating(true)}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <UserPlus className="w-4 h-4" />
                      New Contact
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {view === 'duplicates' && (
            <DuplicatesView
              contacts={contacts}
              onMerged={loadContacts}
            />
          )}
        </main>
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            loadContacts();
            loadLabels();
          }}
        />
      )}

      {showExport && (
        <ExportModal
          contacts={contacts}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
