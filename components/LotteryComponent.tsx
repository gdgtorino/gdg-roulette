import React, { useEffect } from 'react';

interface Event {
  id: string;
  name: string;
  state: string;
  participantCount: number;
  winnerCount: number;
}

interface Winner {
  id: string;
  participantName: string;
  drawOrder: number;
  drawnAt: Date;
}

interface LotteryComponentProps {
  event: Event;
  winners?: Winner[];
  onDrawWinner?: (eventId: string) => Promise<any>;
  onDrawAll?: (eventId: string) => Promise<any>;
}

export const LotteryComponent: React.FC<LotteryComponentProps> = ({
  event,
  winners = [],
  onDrawWinner,
  onDrawAll
}) => {
  const canDraw = event.participantCount > event.winnerCount;

  const handleDrawWinner = async () => {
    if (onDrawWinner && canDraw) {
      const result = await onDrawWinner(event.id);

      if (result?.success && result?.winner) {
        // Trigger confetti if available
        if (typeof (globalThis as any).confetti === 'function') {
          (globalThis as any).confetti();
        }
      }
    }
  };

  const handleDrawAll = async () => {
    if (onDrawAll && canDraw) {
      await onDrawAll(event.id);
    }
  };

  return (
    <div>
      <h2>{event.name} - Lottery Draw</h2>

      <div>
        <p>{event.participantCount} participants registered</p>
        <p>{event.winnerCount} winners drawn</p>
      </div>

      {canDraw ? (
        <div>
          <button onClick={handleDrawWinner}>
            Draw Winner
          </button>

          <button onClick={handleDrawAll}>
            Draw All
          </button>
        </div>
      ) : (
        <p>All participants have been drawn</p>
      )}

      {winners.length > 0 && (
        <div>
          <h3>Winners:</h3>
          <ul>
            {winners
              .sort((a, b) => a.drawOrder - b.drawOrder)
              .map((winner) => (
                <li key={winner.id} data-testid="winner-item">
                  {winner.drawOrder}. {winner.participantName}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Show latest winner if available */}
      {winners.length > 0 && (
        <div>
          <p>Winner: {winners[winners.length - 1]?.participantName}</p>
          <p>Position: {winners[winners.length - 1]?.drawOrder}</p>
        </div>
      )}
    </div>
  );
};