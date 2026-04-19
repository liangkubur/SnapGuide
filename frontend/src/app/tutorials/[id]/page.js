// frontend/src/app/tutorials/[id]/page.js
// Tutorial editor – edit title, description, reorder steps, export
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/UI/Navbar';
import StepList from '@/components/Editor/StepList';
import StepEditor from '@/components/Editor/StepEditor';
import { tutorialsApi, stepsApi, exportApi } from '@/lib/api';

export default function TutorialEditorPage() {
  const router = useRouter();
  const { id } = useParams();

  const [user, setUser]           = useState(null);
  const [tutorial, setTutorial]   = useState(null);
  const [steps, setSteps]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [editingStep, setEditingStep] = useState(null); // { step, index }
  const [editForm, setEditForm]   = useState({ title: '', description: '' });
  const [error, setError]         = useState('');
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('snapguide_token');
    if (!token) { router.replace('/'); return; }
    const u = localStorage.getItem('snapguide_user');
    if (u) setUser(JSON.parse(u));
    fetchData();
  }, [id, router]);

  async function fetchData() {
    setLoading(true);
    try {
      const data = await tutorialsApi.get(id);
      setTutorial(data.tutorial);
      setSteps(data.steps);
      setEditForm({ title: data.tutorial.title, description: data.tutorial.description || '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Save tutorial metadata ─────────────────────────────────────────────────
  const saveTutorial = async () => {
    setSaving(true);
    try {
      const data = await tutorialsApi.update(id, editForm);
      setTutorial(data.tutorial);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Reorder steps (optimistic) ─────────────────────────────────────────────
  const handleReorder = useCallback(async (reordered) => {
    setSteps(reordered);
    try {
      await stepsApi.reorder(id, reordered.map((s) => s.id));
    } catch (err) {
      alert('Failed to save new order: ' + err.message);
      fetchData(); // rollback
    }
  }, [id]);

  // ── Edit step ──────────────────────────────────────────────────────────────
  const handleSaveStep = async (stepId, formData) => {
    try {
      const data = await stepsApi.update(stepId, formData);
      setSteps((prev) => prev.map((s) => (s.id === stepId ? data.step : s)));
      setEditingStep(null);
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Delete step ────────────────────────────────────────────────────────────
  const handleDeleteStep = async (stepId) => {
    if (!confirm('Delete this step?')) return;
    try {
      await stepsApi.delete(stepId);
      setSteps((prev) => prev.filter((s) => s.id !== stepId));
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Toggle public sharing ─────────────────────────────────────────────────
  const handleToggleShare = async () => {
    try {
      const data = await tutorialsApi.toggleShare(id);
      setTutorial(data.tutorial);
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async (format) => {
    setExporting(format);
    try {
      const filename = `${(tutorial.title || 'tutorial').replace(/\s+/g, '_')}.${format}`;
      await exportApi.download(id, format, filename);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting('');
    }
  };

  const shareUrl = tutorial?.share_token
    ? `${window.location.origin}/share/${tutorial.share_token}`
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <div className="flex items-center justify-center py-20 text-gray-400">Loading tutorial…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 text-red-700 rounded-lg p-4">{error}</div>
          <Link href="/dashboard" className="btn-secondary inline-flex mt-4">← Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      {/* Edit step modal */}
      {editingStep && (
        <StepEditor
          step={editingStep.step}
          index={editingStep.index}
          onSave={handleSaveStep}
          onCancel={() => setEditingStep(null)}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
          ← Back to Dashboard
        </Link>

        {/* Tutorial header card */}
        <div className="card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-3">
              <div>
                <label className="label">Title</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="input font-semibold text-base"
                  placeholder="Tutorial title"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="input resize-none"
                  rows={2}
                  placeholder="Short description (optional)"
                />
              </div>
            </div>

            <div className="flex sm:flex-col gap-2 sm:w-32 flex-wrap">
              <button onClick={saveTutorial} disabled={saving} className="btn-primary flex-1 sm:flex-none text-sm text-center">
                {saving ? 'Saving…' : '💾 Save'}
              </button>
              <button onClick={handleToggleShare} className="btn-secondary flex-1 sm:flex-none text-sm text-center">
                {tutorial?.is_public ? '🔒 Unshare' : '🌐 Share'}
              </button>
            </div>
          </div>

          {/* Share link */}
          {shareUrl && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm">
              <span className="text-green-600 flex-1 truncate">🔗 {shareUrl}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(shareUrl); alert('Copied!'); }}
                className="text-green-700 font-medium hover:underline flex-shrink-0"
              >
                Copy
              </button>
            </div>
          )}

          {/* Export row */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-500 self-center">Export as:</span>
            {['html', 'pdf', 'docx'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                disabled={!!exporting}
                className="btn-secondary text-sm py-1.5 px-3 uppercase font-semibold tracking-wide"
              >
                {exporting === fmt ? '…' : fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Steps <span className="text-gray-400 font-normal text-base">({steps.length})</span>
            </h2>
          </div>

          {steps.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🎬</div>
              <p className="font-medium">No steps yet</p>
              <p className="text-sm mt-1">Use the Chrome extension to record steps automatically.</p>
            </div>
          ) : (
            <StepList
              steps={steps}
              onReorder={handleReorder}
              onEditStep={(step, index) => setEditingStep({ step, index })}
              onDeleteStep={handleDeleteStep}
            />
          )}
        </div>
      </main>
    </div>
  );
}
