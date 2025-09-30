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
      <div className="flex justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">admin management</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary"
        >
          create admin
        </button>
      </div>

      {/* Create Admin Modal */}
      {showCreate && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">create new admin</h3>
            <form onSubmit={handleCreate}>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">username</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div className="form-control mt-4">
                <label className="label">
                  <span className="label-text">password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={submitting}
                />
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowCreate(false)}
                  disabled={submitting}
                >
                  cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="loading loading-spinner"></span> : 'create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {showSetPassword && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">set new password</h3>
            <form onSubmit={handleSetPassword}>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">new password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={submitting}
                />
              </div>
              <div className="modal-action">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowSetPassword(null)}
                  disabled={submitting}
                >
                  cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="loading loading-spinner"></span> : 'update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admins Table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>username</th>
                  <th>created at</th>
                  <th>actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      {admin.username}
                      {admin.id === currentAdminId && (
                        <span className="badge badge-primary ml-2">you</span>
                      )}
                    </td>
                    <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowSetPassword(admin.id)}
                          className="btn btn-sm btn-ghost"
                        >
                          set password
                        </button>
                        {admin.id !== currentAdminId && (
                          <button
                            onClick={() => handleDelete(admin.id)}
                            className="btn btn-sm btn-error"
                          >
                            delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}