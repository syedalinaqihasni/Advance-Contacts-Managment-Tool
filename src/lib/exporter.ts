import type { FullContact } from './types';
import { contactsToVCardString } from './vcf';
import { contactsToCSV } from './csv';
import { contactsToJSON } from './jsonFormat';

export type ExportFormat = 'vcf' | 'csv' | 'json';

export interface ChunkOptions {
  mode: 'single' | 'count' | 'size';
  count?: number; // contacts per file
  sizeMB?: number; // target size per file in MB
}

export interface ExportChunk {
  filename: string;
  content: string;
  contactCount: number;
  sizeBytes: number;
}

export function exportContacts(
  contacts: FullContact[],
  format: ExportFormat,
  options: ChunkOptions,
  baseFilename = 'contacts'
): ExportChunk[] {
  const serialize = (items: FullContact[]): string => {
    switch (format) {
      case 'vcf': return contactsToVCardString(items);
      case 'csv': return contactsToCSV(items);
      case 'json': return contactsToJSON(items);
    }
  };

  const ext = format === 'vcf' ? 'vcf' : format === 'csv' ? 'csv' : 'json';

  if (options.mode === 'single' || contacts.length === 0) {
    const content = serialize(contacts);
    return [{
      filename: `${baseFilename}.${ext}`,
      content,
      contactCount: contacts.length,
      sizeBytes: new Blob([content]).size,
    }];
  }

  const chunks: ExportChunk[] = [];

  if (options.mode === 'count') {
    const perFile = options.count || 100;
    for (let i = 0; i < contacts.length; i += perFile) {
      const slice = contacts.slice(i, i + perFile);
      const content = serialize(slice);
      const chunkNum = Math.floor(i / perFile) + 1;
      const totalChunks = Math.ceil(contacts.length / perFile);
      chunks.push({
        filename: totalChunks > 1 ? `${baseFilename}_${chunkNum}_of_${totalChunks}.${ext}` : `${baseFilename}.${ext}`,
        content,
        contactCount: slice.length,
        sizeBytes: new Blob([content]).size,
      });
    }
  } else if (options.mode === 'size') {
    const targetBytes = (options.sizeMB || 20) * 1024 * 1024;
    let currentChunk: FullContact[] = [];
    let chunkNum = 1;

    for (const contact of contacts) {
      const testChunk = [...currentChunk, contact];
      const testContent = serialize(testChunk);
      const testSize = new Blob([testContent]).size;

      if (testSize > targetBytes && currentChunk.length > 0) {
        const content = serialize(currentChunk);
        chunks.push({
          filename: `${baseFilename}_${chunkNum}.${ext}`,
          content,
          contactCount: currentChunk.length,
          sizeBytes: new Blob([content]).size,
        });
        chunkNum++;
        currentChunk = [contact];
      } else {
        currentChunk = testChunk;
      }
    }

    if (currentChunk.length > 0) {
      const content = serialize(currentChunk);
      chunks.push({
        filename: chunks.length > 0 ? `${baseFilename}_${chunkNum}.${ext}` : `${baseFilename}.${ext}`,
        content,
        contactCount: currentChunk.length,
        sizeBytes: new Blob([content]).size,
      });
    }
  }

  return chunks;
}

export function downloadChunk(chunk: ExportChunk): void {
  const blob = new Blob([chunk.content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = chunk.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadChunks(chunks: ExportChunk[], delayMs = 300): void {
  chunks.forEach((chunk, i) => {
    setTimeout(() => downloadChunk(chunk), i * delayMs);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
