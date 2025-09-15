import type { SSEEventData } from '../types';

interface SSEClient {
  eventId: string;
  controller: ReadableStreamDefaultController;
  clientId: string;
}

class SSEService {
  private clients: Map<string, SSEClient[]> = new Map();

  // Add client to an event room
  addClient(eventId: string, controller: ReadableStreamDefaultController, clientId: string) {
    if (!this.clients.has(eventId)) {
      this.clients.set(eventId, []);
    }

    const clients = this.clients.get(eventId)!;
    clients.push({ eventId, controller, clientId });

    console.log(`Client ${clientId} joined event ${eventId}. Total clients: ${clients.length}`);
  }

  // Remove client from an event room
  removeClient(eventId: string, clientId: string) {
    const clients = this.clients.get(eventId);
    if (!clients) return;

    const index = clients.findIndex((client) => client.clientId === clientId);
    if (index !== -1) {
      clients.splice(index, 1);
      console.log(`Client ${clientId} left event ${eventId}. Remaining clients: ${clients.length}`);

      if (clients.length === 0) {
        this.clients.delete(eventId);
      }
    }
  }

  // Send event to all clients in a room
  send(eventId: string, data: SSEEventData) {
    const clients = this.clients.get(eventId);
    if (!clients || clients.length === 0) {
      console.log(`No clients connected to event ${eventId}`);
      return;
    }

    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const chunk = encoder.encode(message);

    // Send to all clients, removing any that are closed
    const activeClients = clients.filter((client) => {
      try {
        client.controller.enqueue(chunk);
        return true;
      } catch {
        console.log(`Client ${client.clientId} disconnected`);
        return false;
      }
    });

    // Update the clients list with only active clients
    if (activeClients.length !== clients.length) {
      if (activeClients.length === 0) {
        this.clients.delete(eventId);
      } else {
        this.clients.set(eventId, activeClients);
      }
    }

    console.log(`Sent ${data.type} event to ${activeClients.length} clients in event ${eventId}`);
  }

  // Get number of clients in an event
  getClientCount(eventId: string): number {
    const clients = this.clients.get(eventId);
    return clients ? clients.length : 0;
  }

  // Get all active events
  getActiveEvents(): string[] {
    return Array.from(this.clients.keys());
  }

  // Close all connections for an event
  closeEvent(eventId: string) {
    const clients = this.clients.get(eventId);
    if (!clients) return;

    clients.forEach((client) => {
      try {
        client.controller.close();
      } catch (error) {
        console.log(`Error closing client ${client.clientId}:`, error);
      }
    });

    this.clients.delete(eventId);
    console.log(`Closed all connections for event ${eventId}`);
  }
}

export const sse = new SSEService();
