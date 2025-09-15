'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Trophy, Calendar, Crown, Medal, Award } from 'lucide-react';

interface Winner {
  id: string;
  participantName: string;
  drawOrder: number;
  drawnAt: Date | string;
}

interface WinnersListProps {
  winners: Winner[];
  eventName?: string;
  showEventName?: boolean;
  maxWinners?: number;
  className?: string;
}

export function WinnersList({
  winners,
  eventName,
  showEventName = false,
  maxWinners,
  className
}: WinnersListProps) {
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString() + ' at ' + dateObj.toLocaleTimeString();
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <Trophy className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPositionBg = (position: number) => {
    switch (position) {
      case 1:
        return 'from-yellow-50 to-yellow-100 border-yellow-200';
      case 2:
        return 'from-gray-50 to-gray-100 border-gray-200';
      case 3:
        return 'from-amber-50 to-amber-100 border-amber-200';
      default:
        return 'from-blue-50 to-blue-100 border-blue-200';
    }
  };

  const sortedWinners = winners.sort((a, b) => a.drawOrder - b.drawOrder);
  const displayWinners = maxWinners ? sortedWinners.slice(0, maxWinners) : sortedWinners;

  if (winners.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <Trophy className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-500">No winners announced yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {showEventName && eventName ? `${eventName} - Winners` : 'Winners'}
          {winners.length > 1 && (
            <Badge variant="secondary">
              {winners.length} winner{winners.length > 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayWinners.map((winner) => (
            <div
              key={winner.id}
              className={`flex items-center justify-between p-4 bg-gradient-to-r ${getPositionBg(winner.drawOrder)} border rounded-lg`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border shadow-sm">
                  {getPositionIcon(winner.drawOrder)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {winner.participantName}
                    </h3>
                    {winner.drawOrder <= 3 && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          winner.drawOrder === 1
                            ? 'border-yellow-400 text-yellow-700'
                            : winner.drawOrder === 2
                            ? 'border-gray-400 text-gray-700'
                            : 'border-amber-400 text-amber-700'
                        }`}
                      >
                        {winner.drawOrder === 1 ? '1st Place' :
                         winner.drawOrder === 2 ? '2nd Place' : '3rd Place'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="h-3 w-3" />
                    <span>Won on {formatDate(winner.drawnAt)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-700">
                  #{winner.drawOrder}
                </div>
                <div className="text-xs text-gray-500">
                  Draw Order
                </div>
              </div>
            </div>
          ))}

          {maxWinners && winners.length > maxWinners && (
            <div className="text-center py-2">
              <Badge variant="outline" className="text-xs">
                +{winners.length - maxWinners} more winner{winners.length - maxWinners > 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}