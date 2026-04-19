// frontend/src/app/share/[token]/page.js
// Public shareable view of a tutorial (no authentication required)
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { tutorialsApi, exportApi } from '@/lib/api';
import { API_URL } from '@/lib/api';

export default function SharePage() {
  const { token } = useParams();
  const [tutorial, setTutorial] = useState(null);
  const [steps, setSteps]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [exporting, setExporting] = useState('');
  const [active, setActive]     = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await tutorialsApi.getPublic(token);
        setTutorial(data.tutorial);
        setSteps(data.steps);
      } catch {
        setError('This tutorial is not available or the link is invalid.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const handleExport = async (format) => {
    setExporting(format);
    try {
      const filename = `${(tutorial.title || 'tutorial').replace(/\s+/g, '_')}.${format}`;
      await exportApi.download(tutorial.id, format, filename);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">
        Loading tutorial…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-gray-700 mb-2">Tutorial Not Found</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  const currentStep = steps[active];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-primary-600 text-sm mb-1">
              <span>📸</span> SnapGuide
            </div>
            <h1 className="text-xl font-bold text-gray-900 truncate">{tutorial.title}</h1>
            {tutorial.description && (
              <p className="text-sm text-gray-500 truncate">{tutorial.description}</p>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {['html', 'pdf', 'docx'].map((fmt) => (
              <button
                key={fmt}
                onClick={() => handleExport(fmt)}
                disabled={!!exporting}
                className="btn-secondary text-xs py-1.5 px-2.5 uppercase font-semibold"
              >
                {exporting === fmt ? '…' : fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Step progress bar */}
        <div className="max-w-5xl mx-auto px-4 pb-3 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === active ? 'bg-primary-600 w-8' : i < active ? 'bg-primary-300 w-5' : 'bg-gray-200 w-5'
                }`}
                title={`Step ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {steps.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-gray-400">No steps in this tutorial.</div>
      ) : (
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Step sidebar */}
            <aside className="lg:col-span-1 space-y-1 hidden lg:block">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Steps</p>
              {steps.map((step, i) => (
                <button
                  key={step.id}
                  onClick={() => setActive(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    i === active
                      ? 'bg-primary-600 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="font-semibold mr-2">{i + 1}.</span>
                  <span className="line-clamp-1">{step.instruction || 'Step'}</span>
                </button>
              ))}
            </aside>

            {/* Main content */}
            <div className="lg:col-span-3 space-y-5">
              <div className="card p-6">
                {/* Step header */}
                <div className="flex items-start gap-3 mb-5">
                  <span className="flex-shrink-0 w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-base">
                    {active + 1}
                  </span>
                  <h2 className="text-xl font-semibold text-gray-900 pt-1">
                    {currentStep.instruction}
                  </h2>
                </div>

                {/* Screenshot */}
                {currentStep.screenshot_url && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 mb-4">
                    <img
                      src={`${API_URL}${currentStep.screenshot_url}`}
                      alt={`Step ${active + 1}`}
                      className="w-full object-contain max-h-[500px]"
                    />
                  </div>
                )}

                {/* Meta */}
                {currentStep.page_url && (
                  <p className="text-xs text-gray-400">🌐 {currentStep.page_url}</p>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActive((a) => Math.max(0, a - 1))}
                  disabled={active === 0}
                  className="btn-secondary"
                >
                  ← Previous
                </button>

                <span className="text-sm text-gray-400">
                  {active + 1} / {steps.length}
                </span>

                <button
                  onClick={() => setActive((a) => Math.min(steps.length - 1, a + 1))}
                  disabled={active === steps.length - 1}
                  className="btn-primary"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
