"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import DarkModeToggle from "@/components/DarkModeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
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
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
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
    } catch {
      console.error("Failed to fetch admins");
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
        setModal({ open: true, title: t('common.success'), message: t('admin.adminCreated'), type: 'success' });
      } else {
        const errorData = await response.json() as { error: string };
        setModal({ open: true, title: t('common.error'), message: errorData.error || t('admin.failedToCreate'), type: 'error' });
      }
    } catch {
      setModal({ open: true, title: t('common.error'), message: t('common.networkError'), type: 'error' });
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
        setModal({ open: true, title: t('common.success'), message: t('admin.adminDeleted'), type: 'success' });
      } else {
        const errorData = await response.json() as { error: string };
        setModal({ open: true, title: t('common.error'), message: errorData.error || t('admin.failedToDelete'), type: 'error' });
      }
    } catch {
      setModal({ open: true, title: t('common.error'), message: t('common.networkError'), type: 'error' });
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    setMounted(true);
    void fetchAdmins();
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-gray-100">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <DarkModeToggle />
      </div>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.manageAdmins')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('admin.manageDescription')}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Admin Form */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('admin.createAdmin')}</CardTitle>
              <CardDescription className="dark:text-gray-300">{t('admin.createDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createAdmin} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder={t('admin.usernamePlaceholder')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    placeholder={t('admin.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? t('admin.creating') : t('admin.createAdmin')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Admin List */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">{t('admin.existingAdmins')}</CardTitle>
              <CardDescription className="dark:text-gray-300">{t('admin.manageExisting')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {admins.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between rounded-lg border dark:border-gray-700 p-3 dark:bg-gray-700"
                  >
                    <div>
                      <div className="font-medium dark:text-white">{admin.username}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('admin.created')}: {new Date(admin.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(admin)}
                      disabled={deleteLoading === admin.username}
                    >
                      {deleteLoading === admin.username ? t('admin.deleting') : t('admin.deleteAdmin')}
                    </Button>
                  </div>
                ))}
                {admins.length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    {t('admin.noAdmins')}
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
            className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {t('admin.backToDashboard')}
          </Button>
        </div>
      </div>

      {/* Success/Error Modal */}
      <Dialog open={modal.open} onOpenChange={(open) => setModal(prev => ({ ...prev, open }))}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{modal.title}</DialogTitle>
            <DialogDescription className="dark:text-gray-300">
              {modal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setModal(prev => ({ ...prev, open: false }))}>{t('common.ok')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">{t('admin.deleteAdmin')}</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-300">
              {t('admin.confirmDelete')} &quot;{deleteDialog.admin?.username}&quot;? {t('admin.cannotUndo')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteAdmin()}>{t('admin.deleteAdmin')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}