import { useState, useCallback } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, FileUp } from 'lucide-react';
import { importContacts, detectFormat, parseFile } from '../lib/importer';
import type { ImportResult } from '../lib/importer';
import type { FullContact } from '../lib/types';

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [parsedContacts, setParsedContacts] = useState<Partial<FullContact>[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(async (fileList: File[]) => {
    setParsing(true);
    setResult(null);
    const allContacts: Partial<FullContact>[] = [];

    for (const file of fileList) {
      const detectedFormat = detectFormat(file.name);
      const text = await file.text();
      try {
        const parsed = parseFile(text, detectedFormat);
        allContacts.push(...parsed);
      } catch (err) {
        console.error(`Failed to parse ${file.name}:`, err);
      }
    }

    setParsedContacts(allContacts);
    setFiles(fileList);
    setParsing(false);
  }, []);

  const handleImport = async () => {
    setImporting(true);
    const res = await importContacts(parsedContacts, (current, total) => setProgress({ current, total }));
    setResult(res);
    setImporting(false);
    if (res.imported > 0) {
      setTimeout(() => onImported(), 1500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Import Contacts
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Drop Zone */}
          {parsedContacts.length === 0 && !importing && !result && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const dropped = Array.from(e.dataTransfer.files);
                  handleFiles(dropped);
                }}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                <FileUp className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600 font-medium mb-1">Drop files here or click to browse</p>
                <p className="text-sm text-slate-400 mb-4">Supports VCF, CSV, and JSON formats</p>
                <input
                  type="file"
                  multiple
                  accept=".vcf,.vcard,.csv,.json"
                  onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  Select Files
                </label>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <FormatInfo title="VCF / vCard" desc="Google Contacts, Outlook, Apple Contacts export format" ext=".vcf" />
                <FormatInfo title="CSV" desc="Spreadsheet-compatible format with columns for each field" ext=".csv" />
                <FormatInfo title="JSON" desc="Structured data format preserving all nested fields" ext=".json" />
              </div>
            </>
          )}

          {/* Parsing */}
          {parsing && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-slate-600 font-medium">Parsing files...</p>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedContacts.length > 0 && !importing && !result && (
            <div>
              <div className="mb-4">
                <p className="text-slate-600">
                  Found <span className="font-semibold text-blue-600">{parsedContacts.length}</span> contacts in {files.length} file(s)
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((f, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs text-slate-600">
                      <FileText className="w-3 h-3" />
                      {f.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview list */}
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {parsedContacts.slice(0, 50).map((c, i) => (
                  <div key={i} className="px-3 py-2 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {c.formatted_name || [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed'}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {(c.emails || []).map((e) => e.email).join(', ') || (c.phones || []).map((p) => p.phone).join(', ') || 'No contact info'}
                      </p>
                    </div>
                    {(c.labels || []).length > 0 && (
                      <span className="text-xs text-blue-600">{(c.labels || []).length} label(s)</span>
                    )}
                  </div>
                ))}
                {parsedContacts.length > 50 && (
                  <div className="px-3 py-2 text-center text-xs text-slate-400">
                    ...and {parsedContacts.length - 50} more
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setParsedContacts([]); setFiles([]); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import {parsedContacts.length} Contacts
                </button>
              </div>
            </div>
          )}

          {/* Importing Progress */}
          {importing && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-600 font-medium mb-2">Importing contacts...</p>
              <div className="w-64 bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-sm text-slate-400 mt-2">{progress.current} / {progress.total}</p>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Import Complete</h3>
              <div className="flex justify-center gap-6 mb-4">
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{result.imported}</p>
                  <p className="text-xs text-slate-400">Imported</p>
                </div>
                {result.skipped > 0 && (
                  <div>
                    <p className="text-2xl font-bold text-amber-500">{result.skipped}</p>
                    <p className="text-xs text-slate-400">Skipped</p>
                  </div>
                )}
              </div>
              {result.errors.length > 0 && (
                <div className="text-left max-h-32 overflow-y-auto bg-amber-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-700 font-medium mb-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {result.errors.length} warning(s)
                  </p>
                  {result.errors.slice(0, 5).map((err, i) => (
                    <p key={i} className="text-xs text-amber-600">{err}</p>
                  ))}
                </div>
              )}
              <button onClick={onImported} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormatInfo({ title, desc, ext }: { title: string; desc: string; ext: string }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <p className="text-sm font-semibold text-slate-700 mb-1">{title}</p>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
      <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-500 font-mono">{ext}</span>
    </div>
  );
}
