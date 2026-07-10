import { useState, useMemo } from 'react';
import { Download, X, FileText, Package, FileSpreadsheet, FileJson, HardDrive, Hash } from 'lucide-react';
import { exportContacts, downloadChunks, formatBytes } from '../lib/exporter';
import type { ExportFormat, ExportChunk, ChunkOptions } from '../lib/exporter';
import type { FullContact } from '../lib/types';

interface ExportModalProps {
  contacts: FullContact[];
  onClose: () => void;
}

export function ExportModal({ contacts, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('vcf');
  const [chunkMode, setChunkMode] = useState<'single' | 'count' | 'size'>('single');
  const [count, setCount] = useState(100);
  const [sizeMB, setSizeMB] = useState(20);
  const [preview, setPreview] = useState<ExportChunk[]>([]);

  const totalSize = useMemo(() => {
    if (contacts.length === 0) return 0;
    const sample = exportContacts(contacts, format, { mode: 'single' });
    return sample[0]?.sizeBytes || 0;
  }, [contacts, format]);

  const handlePreview = () => {
    const options: ChunkOptions = {
      mode: chunkMode,
      count: count,
      sizeMB: sizeMB,
    };
    const chunks = exportContacts(contacts, format, options);
    setPreview(chunks);
  };

  const handleDownload = () => {
    const options: ChunkOptions = {
      mode: chunkMode,
      count: count,
      sizeMB: sizeMB,
    };
    const chunks = exportContacts(contacts, format, options);
    downloadChunks(chunks);
  };

  const formatIcons: Record<ExportFormat, React.ComponentType<{ className?: string }>> = {
    vcf: FileText,
    csv: FileSpreadsheet,
    json: FileJson,
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            Export Contacts
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="flex items-center gap-4 px-4 py-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-2xl font-bold text-slate-800">{contacts.length}</p>
              <p className="text-xs text-slate-400">Contacts</p>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div>
              <p className="text-2xl font-bold text-slate-800">{formatBytes(totalSize)}</p>
              <p className="text-xs text-slate-400">Estimated size</p>
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Export Format</label>
            <div className="grid grid-cols-3 gap-3">
              {(['vcf', 'csv', 'json'] as ExportFormat[]).map((fmt) => {
                const Icon = formatIcons[fmt];
                return (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
                      format === fmt
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium uppercase">{fmt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chunking Options */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Export Mode</label>
            <div className="grid grid-cols-3 gap-3">
              <ChunkButton active={chunkMode === 'single'} onClick={() => setChunkMode('single')} icon={Package} label="Single File" desc="All in one file" />
              <ChunkButton active={chunkMode === 'count'} onClick={() => setChunkMode('count')} icon={Hash} label="By Count" desc="N contacts per file" />
              <ChunkButton active={chunkMode === 'size'} onClick={() => setChunkMode('size')} icon={HardDrive} label="By Size" desc="Max MB per file" />
            </div>
          </div>

          {/* Chunk Parameters */}
          {chunkMode === 'count' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Contacts per file</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-300"
                />
                <div className="flex gap-2">
                  {[50, 100, 500, 1000].map((n) => (
                    <button key={n} onClick={() => setCount(n)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 transition-colors">
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Will produce {Math.ceil(contacts.length / count)} file(s)
              </p>
            </div>
          )}

          {chunkMode === 'size' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Max file size (MB)</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={sizeMB}
                  onChange={(e) => setSizeMB(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-300"
                />
                <div className="flex gap-2">
                  {[10, 20, 50, 100].map((n) => (
                    <button key={n} onClick={() => setSizeMB(n)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 transition-colors">
                      {n} MB
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Preview ({preview.length} file(s))</label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {preview.map((chunk, i) => (
                  <div key={i} className="px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-700 font-mono">{chunk.filename}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {chunk.contactCount} contacts · {formatBytes(chunk.sizeBytes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-2 pt-2">
            <button
              onClick={handlePreview}
              disabled={contacts.length === 0}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Preview Files
            </button>
            <button
              onClick={handleDownload}
              disabled={contacts.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {preview.length > 1 ? `Download ${preview.length} Files` : 'Download'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChunkButton({ active, onClick, icon: Icon, label, desc }: {
  active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors ${
        active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-slate-400">{desc}</span>
    </button>
  );
}
