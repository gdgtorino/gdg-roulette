import { AdminSettings } from '@/components/admin/AdminSettings';

export const metadata = {
  title: 'Settings - Admin Dashboard',
  description: 'Configure system settings and preferences',
};

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      <AdminSettings />
    </div>
  );
}
