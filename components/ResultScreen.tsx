import React, { useEffect } from 'react';

interface Event {
  id: string;
  name: string;
  state: string;
  closed: boolean;
}

interface Winner {
  id: string;
  participantName: string;
  drawOrder: number;
  drawnAt: Date;
  eventName: string;
}

interface Participant {
  id: string;
  name: string;
  eventId: string;
}

interface EventStats {
  totalParticipants: number;
  totalWinners: number;
}

interface LotteryStats {
  totalParticipants: number;
  totalWinners: number;
  yourOdds: string;
  drawDuration: string;
}

interface ResultScreenProps {
  event: Event;
  isWinner?: boolean;
  winner?: Winner;
  participant?: Participant;
  eventStats?: EventStats;
  stats?: LotteryStats;
  loading?: boolean;
  loadingMessage?: string;
  showConfetti?: boolean;
  showTimestamp?: boolean;
  showPosition?: boolean;
  showStats?: boolean;
  onShare?: (data: any) => void;
  onNavigateBack?: (path: string) => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  event,
  isWinner = false,
  winner,
  participant,
  eventStats,
  stats,
  loading = false,
  loadingMessage = 'Loading...',
  showConfetti = false,
  showTimestamp = false,
  showPosition = false,
  showStats = false,
  onShare,
  onNavigateBack,
}) => {
  // Trigger confetti for winners
  useEffect(() => {
    if (isWinner && showConfetti && typeof (globalThis as any).confetti === 'function') {
      (globalThis as any).confetti();
    }
  }, [isWinner, showConfetti]);

  if (loading) {
    return (
      <div>
        <p>{loadingMessage}</p>
        <div role="progressbar" aria-label="Loading" />
      </div>
    );
  }

  const getPositionText = (drawOrder: number) => {
    if (drawOrder === 1) return 'first place';
    if (drawOrder === 2) return 'second place';
    if (drawOrder === 3) return 'third place';
    return `${drawOrder}th place`;
  };

  return (
    <div>
      <h2>{event.name}</h2>

      {isWinner && winner ? (
        <div>
          <h1>Congratulations!</h1>
          <h2>{winner.participantName}</h2>

          {showPosition && <p>Position: {getPositionText(winner.drawOrder)}</p>}

          {showTimestamp && winner.drawnAt && (
            <div>
              <p>
                {winner.drawnAt.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p>
                {winner.drawnAt.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}

          {onShare && (
            <button
              onClick={() =>
                onShare({
                  type: 'WINNER',
                  participantName: winner.participantName,
                  eventName: winner.eventName,
                  drawOrder: winner.drawOrder,
                })
              }
            >
              Share
            </button>
          )}
        </div>
      ) : (
        <div>
          <h1>Thank you for participating</h1>
          {participant && <h2>{participant.name}</h2>}
          <p>Better luck next time!</p>
        </div>
      )}

      {eventStats && (
        <div>
          <p>{eventStats.totalParticipants} participants</p>
          <p>{eventStats.totalWinners} winners</p>
        </div>
      )}

      {showStats && stats && (
        <div>
          <p>{stats.totalParticipants} participants</p>
          <p>{stats.totalWinners} winners</p>
          <p>{stats.yourOdds} odds</p>
          <p>{stats.drawDuration}</p>
        </div>
      )}

      {onNavigateBack && <button onClick={() => onNavigateBack('/events')}>Back to events</button>}
    </div>
  );
};
