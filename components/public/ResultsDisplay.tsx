'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trophy, Search, Calendar, RefreshCw } from 'lucide-react';

interface Winner {
  id: string;
  participantName: string;
  drawOrder: number;
  drawnAt: Date | string;
}

interface Event {
  id: string;
  name: string;
  createdAt: Date | string;
  closed: boolean;
  registrationOpen: boolean;
}

interface ResultsDisplayProps {
  events?: Event[];
  onEventSelect?: (eventId: string) => void;
  selectedEvent?: Event | null;
  winners?: Winner[];
  isLoading?: boolean;
}

export function ResultsDisplay({
  events = [],
  onEventSelect,
  selectedEvent,
  winners = [],
  isLoading = false
}: ResultsDisplayProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEvents, setFilteredEvents] = useState(events);

  useEffect(() => {
    const filtered = events.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (event.closed || !event.registrationOpen)
    );
    setFilteredEvents(filtered);
  }, [events, searchTerm]);

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString() + ' at ' + dateObj.toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Event Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No completed events found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventSelect?.(event.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedEvent?.id === event.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{event.name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(event.createdAt)}</span>
                        </div>
                      </div>
                      <Badge
                        variant={event.closed ? 'default' : 'outline'}
                        className={event.closed ? 'bg-green-100 text-green-800' : ''}
                      >
                        {event.closed ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Event Results */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {selectedEvent.name} - Winners
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {winners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No winners drawn yet</p>
                {!selectedEvent.closed && (
                  <p className="text-sm mt-1">Check back later for results</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {winners
                  .sort((a, b) => a.drawOrder - b.drawOrder)
                  .map((winner) => (
                    <div
                      key={winner.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 text-white font-bold text-sm">
                          #{winner.drawOrder}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {winner.participantName}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>Won on {formatDate(winner.drawnAt)}</span>
                          </div>
                        </div>
                      </div>
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}