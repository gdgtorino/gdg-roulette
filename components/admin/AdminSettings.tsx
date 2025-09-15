'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, User, Lock, Globe } from 'lucide-react';

export function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600 mt-1">Manage your admin preferences and account settings</p>
      </div>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Username</label>
            <Input type="text" defaultValue="admin" className="max-w-md" disabled />
            <p className="text-xs text-gray-500 mt-1">
              Username changes are not currently supported
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
            <Input type="email" placeholder="admin@example.com" className="max-w-md" />
            <p className="text-xs text-gray-500 mt-1">
              Used for notifications and account recovery
            </p>
          </div>

          <Button className="mt-4">Update Account</Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
            <Input type="password" placeholder="Enter current password" className="max-w-md" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <Input type="password" placeholder="Enter new password" className="max-w-md" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm New Password
            </label>
            <Input type="password" placeholder="Confirm new password" className="max-w-md" />
          </div>

          <Button className="mt-4">Change Password</Button>
        </CardContent>
      </Card>

      {/* Application Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Application Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email Notifications</label>
              <p className="text-xs text-gray-500">
                Receive email alerts for new registrations and winners
              </p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Auto-close Registration
              </label>
              <p className="text-xs text-gray-500">
                Automatically close registration after drawing starts
              </p>
            </div>
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Language</label>
              <p className="text-xs text-gray-500">Default language for new events</p>
            </div>
            <select className="mt-1 block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
              <option value="en">English</option>
              <option value="it">Italiano</option>
            </select>
          </div>

          <Button className="mt-4">Save Settings</Button>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Version:</span>
            <span className="text-sm text-gray-600">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Last Updated:</span>
            <span className="text-sm text-gray-600">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm font-medium text-gray-700">Environment:</span>
            <span className="text-sm text-gray-600">
              {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
