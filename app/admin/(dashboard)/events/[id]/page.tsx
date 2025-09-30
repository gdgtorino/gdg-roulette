'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { EventStatus } from '@prisma/client';
import { QRCodeSVG } from 'qrcode.react';

interface Participant {
  id: string;
  name: string;
  registeredAt: string;
  isWinner: boolean;
}

interface Winner {
  id: string;
  drawOrder: number;
  participant: {
    name: string;
  };
}

interface Event {
  id: string;
  name: string;
  description: string | null;
  status: EventStatus;
  participants: Participant[];
  winners: Winner[];
  _count: {
    participants: number;
    winners: number;
  };
}

export default function EventDetailPage() {
  const params = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [drawing, setDrawing] = useState(false);

  const registrationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3004'}/events/${params.id}/register`;

  useEffect(() => {
    fetchEvent();
  }, []);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/admin/events/${params.id}`);
      const data = await res.json();
      setEvent(data);
    } catch {
      alert('failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: EventStatus) => {
    try {
      const res = await fetch(`/api/admin/events/${params.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'failed to update status');
        return;
      }

      fetchEvent();
    } catch {
      alert('failed to update status');
    }
  };

  const handleDrawWinner = async () => {
    setDrawing(true);
    try {
      const res = await fetch(`/api/admin/events/${params.id}/draw`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'failed to draw winner');
        return;
      }

      fetchEvent();
    } catch {
      alert('failed to draw winner');
    } finally {
      setDrawing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(registrationUrl);
    alert('registration link copied!');
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm('are you sure you want to remove this participant?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/events/${params.id}/participants/${participantId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        alert('failed to remove participant');
        return;
      }

      fetchEvent();
    } catch {
      alert('failed to remove participant');
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    const badges = {
      INIT: 'badge-neutral',
      REGISTRATION_OPEN: 'badge-success',
      REGISTRATION_CLOSED: 'badge-warning',
      DRAWING: 'badge-info',
      CLOSED: 'badge-error',
    };
    return badges[status];
  };

  if (loading) {
    return (
      <div className="flex justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!event) {
    return <div className="text-center">event not found</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">{event.name}</h1>
          {event.description && (
            <p className="text-lg opacity-70 mt-2">{event.description}</p>
          )}
          <div className={`badge ${getStatusBadge(event.status)} mt-2`}>
            {event.status}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats stats-horizontal shadow mb-6 w-full">
        <div className="stat">
          <div className="stat-title">participants</div>
          <div className="stat-value">{event._count.participants}</div>
        </div>
        <div className="stat">
          <div className="stat-title">winners drawn</div>
          <div className="stat-value">{event._count.winners}</div>
        </div>
      </div>

      {/* Status Transition Buttons */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h2 className="card-title">event controls</h2>
          <div className="flex gap-2 flex-wrap">
            {event.status === EventStatus.INIT && (
              <button
                onClick={() => handleStatusChange(EventStatus.REGISTRATION_OPEN)}
                className="btn btn-success"
              >
                open registration
              </button>
            )}
            {event.status === EventStatus.REGISTRATION_OPEN && (
              <button
                onClick={() => handleStatusChange(EventStatus.REGISTRATION_CLOSED)}
                className="btn btn-warning"
              >
                close registration
              </button>
            )}
            {event.status === EventStatus.REGISTRATION_CLOSED && (
              <>
                <button
                  onClick={() => handleStatusChange(EventStatus.REGISTRATION_OPEN)}
                  className="btn btn-success"
                >
                  reopen registration
                </button>
                <button
                  onClick={() => handleStatusChange(EventStatus.DRAWING)}
                  className="btn btn-info"
                >
                  start drawing
                </button>
              </>
            )}
            {event.status === EventStatus.DRAWING && (
              <button
                onClick={() => handleStatusChange(EventStatus.CLOSED)}
                className="btn btn-error"
              >
                close event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Section */}
      {event.status === EventStatus.REGISTRATION_OPEN && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">registration</h2>
            <div className="flex gap-4 items-center">
              <QRCodeSVG value={registrationUrl} size={150} />
              <div>
                <p className="mb-2">scan QR code or share link:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={registrationUrl}
                    readOnly
                    className="input input-bordered flex-1"
                  />
                  <button onClick={copyToClipboard} className="btn btn-primary">
                    copy link
                  </button>
                  <button onClick={() => setShowQR(true)} className="btn btn-secondary">
                    fullscreen QR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drawing Interface */}
      {event.status === EventStatus.DRAWING && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">drawing</h2>
            <button
              onClick={handleDrawWinner}
              disabled={drawing || event._count.participants === event._count.winners}
              className="btn btn-primary btn-lg"
            >
              {drawing ? (
                <span className="loading loading-spinner"></span>
              ) : (
                'draw next winner'
              )}
            </button>
            {event._count.participants === event._count.winners && (
              <p className="text-center mt-2">all participants have been drawn!</p>
            )}
          </div>
        </div>
      )}

      {/* Winners List */}
      {event.winners.length > 0 && (
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title">winners</h2>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>order</th>
                    <th>name</th>
                  </tr>
                </thead>
                <tbody>
                  {event.winners.map((winner) => (
                    <tr key={winner.id}>
                      <td>
                        <div className="badge badge-primary">{winner.drawOrder}</div>
                      </td>
                      <td>{winner.participant.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Participants List */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">participants ({event.participants.length})</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>name</th>
                  <th>registered at</th>
                  <th>status</th>
                  <th>actions</th>
                </tr>
              </thead>
              <tbody>
                {event.participants.map((participant) => (
                  <tr key={participant.id}>
                    <td>{participant.name}</td>
                    <td>{new Date(participant.registeredAt).toLocaleString()}</td>
                    <td>
                      {participant.isWinner ? (
                        <div className="badge badge-success">winner</div>
                      ) : (
                        <div className="badge badge-ghost">waiting</div>
                      )}
                    </td>
                    <td>
                      {event.status === EventStatus.REGISTRATION_OPEN && !participant.isWinner && (
                        <button
                          onClick={() => handleRemoveParticipant(participant.id)}
                          className="btn btn-sm btn-error"
                        >
                          remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {event.participants.length === 0 && (
              <p className="text-center py-4 opacity-70">no participants yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen QR Modal */}
      {showQR && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <h3 className="font-bold text-lg mb-4 text-center">scan to register</h3>
            <div className="flex justify-center">
              <QRCodeSVG value={registrationUrl} size={400} />
            </div>
            <div className="modal-action">
              <button onClick={() => setShowQR(false)} className="btn">
                close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}