import { Server as SocketIOServer } from 'socket.io';

declare global {
  var io: SocketIOServer | undefined;
}

export function getIO(): SocketIOServer | undefined {
  return global.io;
}

export function emitToEvent(eventId: string, event: string, data?: unknown) {
  const io = getIO();
  if (io) {
    io.to(`event-${eventId}`).emit(event, data);
    console.log(`Emitted ${event} to event-${eventId}:`, data);
  }
}

export function emitGlobal(event: string, data?: unknown) {
  const io = getIO();
  if (io) {
    io.emit(event, data);
    console.log(`Emitted ${event} globally:`, data);
  }
}