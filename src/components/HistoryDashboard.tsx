import React, { useState } from 'react';
import { SavedDocRecord } from '../types';
import {
  FileText,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Share2,
  Calendar,
  Layers,
  Sparkles,
  Search,
  HardDrive,
  QrCode,
  Mail,
} from 'lucide-react';
import { deleteDocumentRecord } from '../firebase';

interface HistoryDashboardProps {
  documents: SavedDocRecord[];
  onSelectDocument: (doc: SavedDocRecord) => void;
  onRefresh: () => void;
  onOpenEmailShare: (doc: SavedDocRecord) => void;
}

export const HistoryDashboard: React.FC<HistoryDashboardProps> = ({
  documents,
  onSelectDocument,
  onRefresh,
  onOpenEmailShare,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleCopyLink = (id: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (docId: string, title: string) => {
    if (window.confirm(`Remove "${title}" from saved document history? (File on Drive will remain untouched)`)) {
      setIsDeleting(docId);
      try {
        await deleteDocumentRecord(docId);
        onRefresh();
      } catch (err) {
        console.error('Delete error:', err);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const filteredDocs = documents.filter((d) =>
    (d.title || d.fileName).toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.driveLink.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search & Stats Bar */}
      <div className="bg-[#121215] rounded-2xl border border-yellow-500/25 p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-yellow-400" />
            My QR Document Library
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
              {documents.length} Docs
            </span>
          </h2>
          <p className="text-xs text-zinc-400">
            Synced with Google Firebase Firestore & Google Drive
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search documents by title..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-900 border border-zinc-700 focus:border-yellow-400 focus:outline-none text-white"
          />
        </div>
      </div>

      {/* Document Grid / Empty state */}
      {filteredDocs.length === 0 ? (
        <div className="bg-[#121215] rounded-2xl border border-zinc-800 p-12 text-center shadow-lg">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center mx-auto mb-3 border border-yellow-400/20">
            <QrCode className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold text-white">No QR Documents Found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
            Upload your first document in Cover Studio or Batch Processor to automatically derive a Drive link and scannable QR.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const dateStr = new Date(doc.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={doc.id}
                className="bg-[#121215] rounded-2xl border border-zinc-800 hover:border-yellow-500/40 p-4 shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-yellow-400/15 text-yellow-300 border border-yellow-400/30">
                      {doc.coverData.themeId}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">{dateStr}</span>
                  </div>

                  <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug">
                    {doc.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{doc.fileName}</p>

                  {/* Public Link Card */}
                  <div className="mt-3 p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block">
                        Public Drive Viewer
                      </span>
                      <p className="text-[11px] font-mono text-zinc-300 truncate">
                        {doc.driveLink}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(doc.id, doc.driveLink)}
                      className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-yellow-400 transition-colors cursor-pointer"
                      title="Copy link"
                    >
                      {copiedId === doc.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Email share history badge */}
                  {doc.sentEmails && doc.sentEmails.length > 0 && (
                    <div className="mt-2 text-[10px] text-zinc-400 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-yellow-400" />
                      <span>Shared with {doc.sentEmails.length} recipient(s)</span>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectDocument(doc)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400 hover:text-yellow-300 hover:underline cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Load in Studio
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onOpenEmailShare(doc)}
                      className="p-1.5 text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                      title="Share via Email"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    <a
                      href={doc.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors"
                      title="Open in Google Drive"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      disabled={isDeleting === doc.id}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                      title="Delete record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
