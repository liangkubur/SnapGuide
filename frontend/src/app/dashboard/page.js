// frontend/src/app/dashboard/page.js
// Main dashboard – lists all tutorials for the logged-in user
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/UI/Navbar';
import TutorialCard from '@/components/Dashboard/TutorialCard';
import { tutorialsApi } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tutorials, setTutorials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Auth guard
  useEffect(() => {
    const token = localStorage.getItem('snapguide_token');
    if (!token) { router.replace('/'); return; }
    const u = localStorage.getItem('snapguide_user');
    if (u) setUser(JSON.parse(u));
    fetchTutorials();
  }, [router]);

  async function fetchTutorials() {
    setLoading(true);
    try {
      const data = await tutorialsApi.list();
      setTutorials(data.tutorials);
    } catch (err) {
      if (err.message.includes('401')) { router.replace('/'); return; }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const data = await tutorialsApi.create(newTitle.trim());
      setTutorials((prev) => [{ ...data.tutorial, step_count: 0 }, ...prev]);
      setNewTitle('');
      setShowCreate(false);
      router.push(`/tutorials/${data.tutorial.id}`);
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this tutorial? This cannot be undone.')) return;
    try {
      await tutorialsApi.delete(id);
      setTutorials((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleToggleShare(id) {
    try {
      const data = await tutorialsApi.toggleShare(id);
      setTutorials((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...data.tutorial } : t))
      );
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tutorials</h1>
            <p className="text-gray-500 text-sm mt-1">{tutorials.length} tutorial{tutorials.length !== 1 ? 's' : ''}</p>
          </div>

          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <span className="text-lg leading-none">+</span> New Tutorial
          </button>
        </div>

        {/* Create modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="card w-full max-w-md p-6">
              <h2 className="text-lg font-semibold mb-4">Create New Tutorial</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="label">Tutorial Title</label>
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. How to reset your password"
                    className="input"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={creating} className="btn-primary">
                    {creating ? 'Creating…' : 'Create & Edit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <svg className="animate-spin h-8 w-8 mr-3 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading…
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 rounded-lg p-4">{error}</div>
        ) : tutorials.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No tutorials yet</h2>
            <p className="text-gray-400 mb-6">Create your first tutorial or use the Chrome extension to record one.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              Create Tutorial
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tutorials.map((t) => (
              <TutorialCard
                key={t.id}
                tutorial={t}
                onDelete={handleDelete}
                onToggleShare={handleToggleShare}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
