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
import { useTranslation } from "@/hooks/useTranslation";
import DarkModeToggle from "@/components/DarkModeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AdminPage() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{open: boolean; title: string; message: string; type: 'success' | 'error';}>({ open: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("admin", JSON.stringify(data.admin));
        window.location.href = "/admin/dashboard";
      } else {
        const error = await response.json();
        setModal({ open: true, title: t('admin.loginFailed'), message: error.error || t('admin.loginFailed'), type: 'error' });
      }
    } catch (error) {
      setModal({ open: true, title: t('common.error'), message: t('common.networkError'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Admin Login</CardTitle>
            <CardDescription className="dark:text-gray-300">Loading...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <LanguageSwitcher />
        <DarkModeToggle />
      </div>
      <Card className="w-full max-w-md dark:bg-gray-800 dark:border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.loginTitle')}</CardTitle>
          <CardDescription className="dark:text-gray-300">{t('admin.loginDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder={t('admin.username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder={t('admin.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('admin.signingIn') : t('admin.signIn')}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* Error Modal */}
      <Dialog open={modal.open} onOpenChange={(open) => setModal(prev => ({ ...prev, open }))}>
        <DialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">{modal.title}</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              {modal.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setModal(prev => ({ ...prev, open: false }))}>
              {t('common.ok')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}