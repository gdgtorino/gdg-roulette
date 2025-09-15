'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EventManagement } from './EventManagement';
import { EventList } from './EventList';
import { EventStats } from './EventStats';
import { AdminNavigation } from './AdminNavigation';
import { Admin, Event } from '@/lib/types';

interface AdminDashboardProps {
  admin: Admin;
  data?: {
    totalEvents: number;
    activeEvents: number;
    totalParticipants: number;
    completedDraws: number;
    recentEvents: Event[];
  };
}

interface DashboardData {
  totalEvents: number;
  activeEvents: number;
  totalParticipants: number;
  completedDraws: number;
  recentEvents: Event[];
}

interface ParticipantManagementProps {
  eventId?: string;
  participants?: any[];
  onParticipantUpdate?: () => void;
}

interface LotteryControlProps {
  eventId?: string;
  onDrawStart?: () => void;
  onDrawComplete?: () => void;
}

export function ParticipantManagement({
  eventId,
  participants,
  onParticipantUpdate,
}: ParticipantManagementProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Participant Management</h3>
      <p className="text-gray-600">Manage participants for event {eventId}</p>
      {participants && (
        <div className="mt-4">
          <p className="text-sm text-gray-500">{participants.length} participants registered</p>
        </div>
      )}
    </Card>
  );
}

export function LotteryControl({ eventId, onDrawStart, onDrawComplete }: LotteryControlProps) {
  const [isDrawing, setIsDrawing] = useState(false);

  const handleDrawStart = () => {
    setIsDrawing(true);
    if (onDrawStart) {
      onDrawStart();
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Lottery Control</h3>
      <div className="space-y-4">
        <Button onClick={handleDrawStart} disabled={isDrawing} className="w-full">
          {isDrawing ? 'Drawing in Progress...' : 'Start Lottery Draw'}
        </Button>
      </div>
    </Card>
  );
}

export function AdminDashboard({ admin, data }: AdminDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(data || null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'participants' | 'lottery'>(
    'overview',
  );

  useEffect(() => {
    if (!data) {
      loadDashboardData();
    }
  }, [data]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/dashboard');
      if (!response.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const result = await response.json();
      setDashboardData(result.data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="text-center">
            <LoadingSpinner className="mb-4 mx-auto" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-4">Dashboard Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadDashboardData}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'events', label: 'Events', icon: '🎟️' },
    { id: 'participants', label: 'Participants', icon: '👥' },
    { id: 'lottery', label: 'Lottery', icon: '🎲' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {admin.username}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">Admin</Badge>
              <AdminNavigation />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Statistics Cards */}
            {dashboardData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">📊</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Events</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData.totalEvents}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-green-600 font-semibold">🟢</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Events</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData.activeEvents}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 font-semibold">👥</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Participants</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData.totalParticipants}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <span className="text-orange-600 font-semibold">🏆</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Completed Draws</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {dashboardData.completedDraws}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Recent Events */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Events</h3>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>
              {dashboardData?.recentEvents ? (
                <EventList events={dashboardData.recentEvents} compact />
              ) : (
                <p className="text-gray-500 text-center py-4">No recent events</p>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Event Management</h2>
              <Button>Create New Event</Button>
            </div>
            <EventManagement />
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Participant Management</h2>
            <ParticipantManagement />
          </div>
        )}

        {activeTab === 'lottery' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Lottery Control</h2>
            <LotteryControl />
          </div>
        )}
      </div>
    </div>
  );
}
