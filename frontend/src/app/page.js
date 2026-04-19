// frontend/src/app/page.js
// Landing / auth page – redirects to dashboard when logged in
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/Auth/AuthForm';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('snapguide_token');
    if (token) router.replace('/dashboard');
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-600 to-indigo-800 px-4">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="text-4xl">📸</span>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">SnapGuide</h1>
        </div>
        <p className="text-indigo-200 text-lg max-w-md">
          Record your web interactions and automatically generate beautiful, shareable step-by-step tutorials.
        </p>
      </div>

      <AuthForm />

      {/* Features strip */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full text-center">
        {[
          { icon: '🎯', title: 'Auto-Capture', desc: 'Record clicks, typing & navigation' },
          { icon: '✨', title: 'Smart Instructions', desc: 'AI-generated human-readable steps' },
          { icon: '📤', title: 'Export Anywhere', desc: 'PDF, HTML, or DOCX in one click' },
        ].map((f) => (
          <div key={f.title} className="bg-white/10 backdrop-blur rounded-xl p-5">
            <div className="text-3xl mb-2">{f.icon}</div>
            <h3 className="font-semibold text-white">{f.title}</h3>
            <p className="text-indigo-200 text-sm mt-1">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
