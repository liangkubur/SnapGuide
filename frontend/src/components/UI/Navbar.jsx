// frontend/src/components/UI/Navbar.jsx
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navbar({ user }) {
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem('snapguide_token');
    localStorage.removeItem('snapguide_user');
    router.replace('/');
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary-700 text-lg">
          <span className="text-2xl">📸</span> SnapGuide
        </Link>

        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-gray-500 hidden sm:block">
              {user.name || user.email}
            </span>
          )}
          <button onClick={logout} className="btn-secondary text-sm py-1.5 px-3">
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
