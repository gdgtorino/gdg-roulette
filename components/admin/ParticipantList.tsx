'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Search, Users, Trophy, Clock, Download, Filter } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  registeredAt: Date | string;
}

interface Winner {
  id: string;
  participantId: string;
  participantName: string;
  drawOrder: number;
  drawnAt: Date | string;
}

interface ParticipantListProps {
  participants: Participant[];
  winners?: Winner[];
  eventId?: string;
  showSearch?: boolean;
  showExport?: boolean;
  className?: string;
}

export function ParticipantList({
  participants,
  winners = [],
  eventId,
  showSearch = true,
  showExport = true,
  className
}: ParticipantListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'winners' | 'remaining'>('all');

  const winnerIds = useMemo(() =>
    new Set(winners.map(w => w.participantId)),
    [winners]
  );

  const filteredParticipants = useMemo(() => {
    let filtered = participants.filter(participant =>
      participant.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterStatus === 'winners') {
      filtered = filtered.filter(p => winnerIds.has(p.id));
    } else if (filterStatus === 'remaining') {
      filtered = filtered.filter(p => !winnerIds.has(p.id));
    }

    return filtered;
  }, [participants, searchTerm, filterStatus, winnerIds]);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString();
  };

  const getWinnerInfo = (participantId: string) => {
    return winners.find(w => w.participantId === participantId);
  };

  const exportParticipants = () => {
    const csvContent = [
      ['Name', 'Registered At', 'Status', 'Winner Order', 'Won At'],
      ...filteredParticipants.map(participant => {
        const winner = getWinnerInfo(participant.id);
        return [
          participant.name,
          formatDate(participant.registeredAt),
          winner ? 'Winner' : 'Participant',
          winner ? winner.drawOrder.toString() : '',
          winner ? formatDate(winner.drawnAt) : ''
        ];
      })
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participants-${eventId || 'export'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>
              Participants ({filteredParticipants.length} / {participants.length})
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {showExport && participants.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportParticipants}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {showSearch && (
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                All ({participants.length})
              </Button>
              <Button
                variant={filterStatus === 'winners' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('winners')}
              >
                <Trophy className="h-4 w-4 mr-1" />
                Winners ({winners.length})
              </Button>
              <Button
                variant={filterStatus === 'remaining' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('remaining')}
              >
                Remaining ({participants.length - winners.length})
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filteredParticipants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? (
              <div>
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No participants found matching &quot;{searchTerm}&quot;</p>
              </div>
            ) : participants.length === 0 ? (
              <div>
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No participants registered yet</p>
              </div>
            ) : (
              <div>
                <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No participants match the current filter</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredParticipants.map((participant, index) => {
              const winner = getWinnerInfo(participant.id);
              return (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    winner
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border">
                      <span className="text-sm font-medium text-gray-600">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{participant.name}</span>
                        {winner && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Trophy className="h-3 w-3 mr-1" />
                            Winner #{winner.drawOrder}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        Registered: {formatDate(participant.registeredAt)}
                      </div>
                      {winner && (
                        <div className="flex items-center gap-1 text-sm text-yellow-600">
                          <Trophy className="h-3 w-3" />
                          Won: {formatDate(winner.drawnAt)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}