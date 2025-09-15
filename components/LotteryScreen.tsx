import React from 'react';

interface Event {
  id: string;
  name: string;
  state: string;
}

interface Winner {
  id: string;
  participantName: string;
  drawOrder: number;
}

interface LotteryScreenProps {
  event: Event;
  isLive?: boolean;
  currentWinners?: Winner[];
  showAnimation?: boolean;
}

export const LotteryScreen: React.FC<LotteryScreenProps> = ({
  event,
  isLive = false,
  currentWinners = [],
  showAnimation = false,
}) => {
  return (
    <div>
      <h2>Live Draw - {event.name}</h2>

      {currentWinners.length > 0 && (
        <div>
          <h3>Current Winners</h3>
          <ul>
            {currentWinners.map((winner) => (
              <li key={winner.id}>
                {winner.drawOrder}. {winner.participantName}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAnimation && (
        <div data-testid="lottery-animation">
          <p>Drawing in progress...</p>
        </div>
      )}
    </div>
  );
};
