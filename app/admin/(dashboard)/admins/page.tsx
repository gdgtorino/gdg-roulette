'use client';

import { useState, useEffect } from 'react';

interface Admin {
  id: string;
  username: string;
  createdAt: string;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showSetPassword, setShowSetPassword] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentAdminId, setCurrentAdminId] = useState('');

  useEffect(() => {
    fetchAdmins();
    fetchCurrentAdmin();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/admins');
      const data = await res.json();
      setAdmins(data);
    } catch {
      alert('failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentAdmin = async () => {
    try {
      const res = await fetch('/api/admin/me');
      const data = await res.json();
      setCurrentAdminId(data.id);
    } catch {
      // ignore
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'failed to create admin');
        return;
      }

      setUsername('');
      setPassword('');
      setShowCreate(false);
      fetchAdmins();
    } catch {
      alert('failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSetPassword) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/admins/${showSetPassword}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'failed to set password');
        return;
      }

      setNewPassword('');
      setShowSetPassword(null);
      alert('password updated successfully');
    } catch {
      alert('failed to set password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentAdminId) {
      alert('cannot delete yourself');
      return;
    }

    if (!confirm('are you sure you want to delete this admin?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/admins/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'failed to delete admin');
        return;
      }

      fetchAdmins();
    } catch {
      alert('failed to delete admin');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          Admin Management
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-2xl transform hover:scale-[1.05] active:scale-[0.98] transition-all duration-300"
        >
          + Create Admin
        </button>
      </div>

      {/* Create Admin Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 p-8">
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create New Admin
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Username</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-2xl bg-white/70 dark:bg-gray-800/70 border-2 border-transparent focus:border-purple-500 outline-none transition-all text-gray-900 dark:text-white"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={submitting}
                  placeholder="admin_username"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-2xl bg-white/70 dark:bg-gray-800/70 border-2 border-transparent focus:border-purple-500 outline-none transition-all text-gray-900 dark:text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={submitting}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="flex-1 py-3 px-4 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                  onClick={() => setShowCreate(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {showSetPassword && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30 p-8">
            <h3 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Set New Password
            </h3>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">New Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 rounded-2xl bg-white/70 dark:bg-gray-800/70 border-2 border-transparent focus:border-purple-500 outline-none transition-all text-gray-900 dark:text-white"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={submitting}
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="flex-1 py-3 px-4 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                  onClick={() => setShowSetPassword(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admins Grid */}
      <div className="grid gap-4">
        {admins.map((admin) => (
          <div
            key={admin.id}
            className="backdrop-blur-xl bg-white/50 dark:bg-gray-900/40 rounded-3xl shadow-2xl shadow-purple-200/50 dark:shadow-none border border-white/20 dark:border-gray-700/30 p-6 hover:scale-[1.01] transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                  {admin.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{admin.username}</h3>
                    {admin.id === currentAdminId && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Created {new Date(admin.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSetPassword(admin.id)}
                  className="py-2 px-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Set Password
                </button>
                {admin.id !== currentAdminId && (
                  <button
                    onClick={() => handleDelete(admin.id)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {admins.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">👤</div>
          <p className="text-xl text-gray-600 dark:text-gray-400">No admins yet. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}