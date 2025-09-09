import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  eventId?: string;
  onParticipantRegistered?: (participant: unknown) => void;
  onRegistrationToggled?: (data: { registrationOpen: boolean }) => void;
  onWinnerDrawn?: (winner: unknown) => void;
}

export function useSocket(options: UseSocketOptions = {}): Socket | null {
  const socketRef = useRef<Socket | null>(null);
  const { eventId, onParticipantRegistered, onRegistrationToggled, onWinnerDrawn } = options;

  useEffect(() => {
    // Only connect if we don't have a socket or it's disconnected
    if (!socketRef.current || socketRef.current.disconnected) {
      socketRef.current = io(process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:3001'
      );
    }

    const socket = socketRef.current;

    // Join event room if eventId is provided
    if (eventId && socket.connected) {
      socket.emit('joinEvent', eventId);
    }

    // Handle connection events
    const handleConnect = (): void => {
      console.log('Connected to server');
      if (eventId) {
        socket.emit('joinEvent', eventId);
      }
    };

    const handleDisconnect = (): void => {
      console.log('Disconnected from server');
    };

    // Event-specific listeners
    const handleParticipantRegistered = (participant: unknown): void => {
      console.log('Participant registered:', participant);
      onParticipantRegistered?.(participant);
    };

    const handleRegistrationToggled = (data: { registrationOpen: boolean }): void => {
      console.log('Registration toggled:', data);
      onRegistrationToggled?.(data);
    };

    const handleWinnerDrawn = (winner: unknown): void => {
      console.log('Winner drawn:', winner);
      onWinnerDrawn?.(winner);
    };

    // Add event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    
    if (onParticipantRegistered) {
      socket.on('participantRegistered', handleParticipantRegistered);
    }
    
    if (onRegistrationToggled) {
      socket.on('registrationToggled', handleRegistrationToggled);
    }
    
    if (onWinnerDrawn) {
      socket.on('winnerDrawn', handleWinnerDrawn);
    }

    // Join event room on connect if not already connected
    if (socket.connected && eventId) {
      socket.emit('joinEvent', eventId);
    }

    return () => {
      // Clean up event listeners
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('participantRegistered', handleParticipantRegistered);
      socket.off('registrationToggled', handleRegistrationToggled);
      socket.off('winnerDrawn', handleWinnerDrawn);
      
      // Leave event room
      if (eventId) {
        socket.emit('leaveEvent', eventId);
      }
    };
  }, [eventId, onParticipantRegistered, onRegistrationToggled, onWinnerDrawn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return socketRef.current;
}

export default useSocket;