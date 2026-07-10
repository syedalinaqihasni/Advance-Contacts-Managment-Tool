import { Search, Upload, Download, UserPlus, Contact } from 'lucide-react';

interface TopBarProps {
  search: string;
  onSearch: (v: string) => void;
  onImport: () => void;
  onExport: () => void;
  onNew: () => void;
  stats: { total: number; favorites: number; labels: number };
}

export function TopBar({ search, onSearch, onImport, onExport, onNew, stats }: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Contact className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-lg text-slate-800">Contacts</span>
        <span className="text-sm text-slate-400 ml-1">{stats.total} total</span>
      </div>

      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm border border-transparent focus:border-blue-300 focus:bg-white focus:outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <UserPlus className="w-4 h-4" />
          New
        </button>
        <button
          onClick={onImport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
        >
          <Upload className="w-4 h-4" />
          Import
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </header>
  );
}
