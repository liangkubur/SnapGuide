// frontend/src/components/Dashboard/TutorialCard.jsx
'use client';

import Link from 'next/link';
import { exportApi } from '@/lib/api';
import { useState } from 'react';

const FORMAT_LABELS = { html: 'HTML', pdf: 'PDF', docx: 'DOCX' };

export default function TutorialCard({ tutorial, onDelete, onToggleShare }) {
  const [exporting, setExporting] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleExport = async (format) => {
    setExporting(format);
    setMenuOpen(false);
    try {
      const ext = format;
      const filename = `${tutorial.title.replace(/\s+/g, '_') || 'tutorial'}.${ext}`;
      await exportApi.download(tutorial.id, format, filename);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting('');
    }
  };

  const shareUrl = tutorial.share_token
    ? `${window.location.origin}/share/${tutorial.share_token}`
    : null;

  return (
    <div className="card p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/tutorials/${tutorial.id}`} className="font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-2 block">
            {tutorial.title}
          </Link>
          {tutorial.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{tutorial.description}</p>
          )}
        </div>

        {tutorial.is_public && (
          <span className="flex-shrink-0 text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
            Public
          </span>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>📋 {tutorial.step_count ?? 0} steps</span>
        <span>🕐 {new Date(tutorial.updated_at).toLocaleDateString()}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
        <Link href={`/tutorials/${tutorial.id}`} className="btn-primary text-sm py-1.5 px-3">
          Edit
        </Link>

        <button
          onClick={() => onToggleShare(tutorial.id)}
          className="btn-secondary text-sm py-1.5 px-3"
        >
          {tutorial.is_public ? 'Unshare' : 'Share'}
        </button>

        {shareUrl && (
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); alert('Link copied!'); }}
            className="btn-secondary text-sm py-1.5 px-3"
            title="Copy share link"
          >
            🔗 Copy Link
          </button>
        )}

        {/* Export dropdown */}
        <div className="relative ml-auto">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            disabled={!!exporting}
            className="btn-secondary text-sm py-1.5 px-3"
          >
            {exporting ? `Exporting…` : '⬇ Export'}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              {Object.entries(FORMAT_LABELS).map(([fmt, label]) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => onDelete(tutorial.id)}
          className="btn-danger text-sm py-1.5 px-3"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
