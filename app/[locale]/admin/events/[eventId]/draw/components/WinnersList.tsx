'use client';

interface Winner {
  id: string;
  participantId: string;
  participantName: string;
  drawOrder: number;
  drawnAt: string;
}

interface WinnersListProps {
  winners: Winner[];
}

export function WinnersList({ winners }: WinnersListProps) {
  if (winners.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No winners drawn yet. Start the draw to see winners appear here!
      </div>
    );
  }

  // Sort winners by draw order
  const sortedWinners = [...winners].sort((a, b) => a.drawOrder - b.drawOrder);

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {sortedWinners.map((winner) => (
        <div
          key={winner.id}
          className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">🏆</div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">
                #{winner.drawOrder} {winner.participantName}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(winner.drawnAt).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">Winner</div>
        </div>
      ))}
    </div>
  );
}
