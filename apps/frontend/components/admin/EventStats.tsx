import { getEventStats } from '@/lib/events/queries';

export async function EventStats() {
  const stats = await getEventStats();

  const statItems = [
    {
      label: 'Total Events',
      value: stats.totalEvents,
      color: 'text-blue-600',
    },
    {
      label: 'Active Events',
      value: stats.activeEvents,
      color: 'text-green-600',
    },
    {
      label: 'Total Participants',
      value: stats.totalParticipants,
      color: 'text-purple-600',
    },
    {
      label: 'Completed Draws',
      value: stats.completedDraws,
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {stat.label}
              </p>
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}