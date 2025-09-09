"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Admin {
  id: string;
  username: string;
  createdAt: string;
}

export default function ManageAdminPage(): JSX.Element {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [modal, setModal] = useState<{open: boolean; title: string; message: string; type: 'success' | 'error';}>({ open: false, title: '', message: '', type: 'success' });
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean; admin: Admin | null;}>({ open: false, admin: null });

  const fetchAdmins = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json() as Admin[];
        setAdmins(data);
      }
    } catch (error) {
      console.error("Failed to fetch admins:", error);
    }
  };

  const createAdmin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        setUsername("");
        setPassword("");
        await fetchAdmins();
        setModal({ open: true, title: 'Success', message: 'Admin created successfully', type: 'success' });
      } else {
        const error = await response.json() as { error: string };
        setModal({ open: true, title: 'Error', message: error.error || 'Failed to create admin', type: 'error' });
      }
    } catch (error) {
      setModal({ open: true, title: 'Error', message: 'Network error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (admin: Admin): void => {
    setDeleteDialog({ open: true, admin });
  };

  const confirmDeleteAdmin = async (): Promise<void> => {
    const admin = deleteDialog.admin;
    if (!admin) return;

    setDeleteDialog({ open: false, admin: null });
    setDeleteLoading(admin.username);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/${admin.username}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchAdmins();
        setModal({ open: true, title: 'Success', message: 'Admin deleted successfully', type: 'success' });
      } else {
        const error = await response.json() as { error: string };
        setModal({ open: true, title: 'Error', message: error.error || 'Failed to delete admin', type: 'error' });
      }
    } catch (error) {
      setModal({ open: true, title: 'Error', message: 'Network error', type: 'error' });
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    void fetchAdmins();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Manage Admins</h1>
          <p className="text-gray-600">Create and manage administrator accounts</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Admin Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Admin</CardTitle>
              <CardDescription>Add a new administrator account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createAdmin} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="Username (min 3 chars)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder="Password (min 6 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating..." : "Create Admin"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Admin List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Admins</CardTitle>
              <CardDescription>Manage existing administrator accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{admin.username}</div>
                      <div className="text-sm text-gray-500">
                        Created: {new Date(admin.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(admin)}
                      disabled={deleteLoading === admin.username}
                    >
                      {deleteLoading === admin.username ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                ))}
                {admins.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No admins found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Success/Error Modal */}
      <Dialog open={modal.open} onOpenChange={(open) => setModal(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal.title}</DialogTitle>
            <DialogDescription>
              {modal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setModal(prev => ({ ...prev, open: false }))}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Admin</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete admin "{deleteDialog.admin?.username}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteAdmin()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}