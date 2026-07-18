import { Users, Copy, Star, Tag } from 'lucide-react';

interface SidebarProps {
  view: 'contacts' | 'duplicates';
  onView: (v: 'contacts' | 'duplicates') => void;
  favFilter: boolean;
  onFavFilter: (v: boolean) => void;
  labelFilter: string | null;
  onLabelFilter: (v: string | null) => void;
  labels: { id: string; name: string; color: string }[];
  stats: { total: number; favorites: number; labels: number };
  contacts: { labels?: { id: string; name: string }[] }[];
}

const labelColors: Record<string, string> = {
  slate: 'bg-slate-400',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  teal: 'bg-teal-500',
  violet: 'bg-violet-500',
};

export function Sidebar({
  view, onView, favFilter, onFavFilter, labelFilter, onLabelFilter, labels, stats, contacts,
}: SidebarProps) {
  const labelCounts = new Map<string, number>();
  for (const c of contacts) {
    for (const l of c.labels || []) {
      labelCounts.set(l.id, (labelCounts.get(l.id) || 0) + 1);
    }
  }

  return (
    <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
      <nav className="p-3 space-y-1">
        <button
          onClick={() => { onView('contacts'); onLabelFilter(null); onFavFilter(false); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'contacts' && !favFilter && !labelFilter
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          All Contacts
          <span className="ml-auto text-xs text-slate-400">{stats.total}</span>
        </button>

        <button
          onClick={() => { onView('contacts'); onFavFilter(!favFilter); onLabelFilter(null); }}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            favFilter ? 'bg-amber-50 text-amber-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Star className="w-4 h-4" />
          Favorites
          <span className="ml-auto text-xs text-slate-400">{stats.favorites}</span>
        </button>

        <button
          onClick={() => onView('duplicates')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'duplicates' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Copy className="w-4 h-4" />
          Find Duplicates
        </button>
      </nav>

      {labels.length > 0 && (
        <div className="px-3 pb-3">
          <div className="flex items-center gap-1.5 px-3 mb-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Tag className="w-3 h-3" />
            Labels
          </div>
          {labels.map((label) => (
            <button
              key={label.id}
              onClick={() => {
                onView('contacts');
                onFavFilter(false);
                onLabelFilter(labelFilter === label.id ? null : label.id);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                labelFilter === label.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${labelColors[label.color] || labelColors.slate}`} />
              <span className="truncate">{label.name}</span>
              <span className="ml-auto text-xs text-slate-400">{labelCounts.get(label.id) || 0}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
