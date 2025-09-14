'use server';

import { z } from 'zod';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { databaseService } from '@/lib/database';
import { generatePassphrase } from '@/lib/passphrase';
import type { Event, Participant, Winner } from '@/lib/types';

const CreateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name too long'),
  adminId: z.string()
});

const RegisterParticipantSchema = z.object({
  eventId: z.string(),
  name: z.string().min(1).max(50).optional()
});

export async function createEventAction(formData: FormData) {
  try {
    const rawFormData = {
      name: formData.get('name') as string,
      adminId: formData.get('adminId') as string
    };

    const { name, adminId } = CreateEventSchema.parse(rawFormData);

    const eventId = uuidv4();
    const qrData = `${process.env.CORS_ORIGIN || process.env.NEXTAUTH_URL}/register/${eventId}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const event: Event = {
      id: eventId,
      name,
      createdBy: adminId,
      createdAt: new Date(),
      registrationOpen: true,
      closed: false,
      qrCode
    };

    await databaseService.createEvent(event);
    return { success: true, event };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }

    console.error('Create event error:', error);
    return { error: 'Internal server error' };
  }
}

export async function registerParticipantAction(formData: FormData) {
  try {
    const rawFormData = {
      eventId: formData.get('eventId') as string,
      name: formData.get('name') as string
    };

    const { eventId, name } = RegisterParticipantSchema.parse(rawFormData);

    const event = await databaseService.getEvent(eventId);
    if (!event) {
      return { error: 'Event not found' };
    }

    if (!event.registrationOpen) {
      return { error: 'Registration is closed for this event' };
    }

    const participantName = name || generatePassphrase();

    // Check if name is already taken
    const isNameTaken = await databaseService.isParticipantNameTaken(eventId, participantName);
    if (isNameTaken) {
      return { error: 'Name already taken for this event' };
    }

    const participant: Participant = {
      id: uuidv4(),
      eventId,
      name: participantName,
      registeredAt: new Date()
    };

    await databaseService.addParticipant(participant);
    return { success: true, participant };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }

    console.error('Register participant error:', error);
    return { error: 'Internal server error' };
  }
}

export async function toggleEventRegistrationAction(eventId: string, adminId: string) {
  try {
    const event = await databaseService.getEvent(eventId);
    if (!event) {
      return { error: 'Event not found' };
    }

    if (event.createdBy !== adminId) {
      return { error: 'Not authorized to modify this event' };
    }

    const newStatus = !event.registrationOpen;
    await databaseService.updateEventRegistration(eventId, newStatus);

    return { success: true, registrationOpen: newStatus };
  } catch (error) {
    console.error('Toggle registration error:', error);
    return { error: 'Internal server error' };
  }
}

export async function closeEventAction(eventId: string, adminId: string) {
  try {
    const event = await databaseService.getEvent(eventId);
    if (!event) {
      return { error: 'Event not found' };
    }

    if (event.createdBy !== adminId) {
      return { error: 'Not authorized to close this event' };
    }

    await databaseService.updateEventClosed(eventId, true);
    return { success: true, closed: true };
  } catch (error) {
    console.error('Close event error:', error);
    return { error: 'Internal server error' };
  }
}

export async function drawWinnerAction(eventId: string, adminId: string) {
  try {
    const event = await databaseService.getEvent(eventId);
    if (!event) {
      return { error: 'Event not found' };
    }

    if (event.createdBy !== adminId) {
      return { error: 'Not authorized to draw for this event' };
    }

    if (event.registrationOpen) {
      return { error: 'Close registration before drawing' };
    }

    const participants = await databaseService.getEventParticipants(eventId);
    const winners = await databaseService.getEventWinners(eventId);

    // Filter out already drawn participants
    const availableParticipants = participants.filter(
      p => !winners.some(w => w.participantId === p.id)
    );

    if (availableParticipants.length === 0) {
      return { error: 'No participants available to draw' };
    }

    // Random selection
    const randomIndex = Math.floor(Math.random() * availableParticipants.length);
    const selectedParticipant = availableParticipants[randomIndex];

    const winner: Winner = {
      id: uuidv4(),
      eventId,
      participantId: selectedParticipant.id,
      participantName: selectedParticipant.name,
      drawOrder: winners.length + 1,
      drawnAt: new Date()
    };

    await databaseService.addWinner(winner);
    return { success: true, winner };
  } catch (error) {
    console.error('Draw winner error:', error);
    return { error: 'Internal server error' };
  }
}

export async function deleteEventAction(eventId: string, adminId: string) {
  try {
    const event = await databaseService.getEvent(eventId);
    if (!event) {
      return { error: 'Event not found' };
    }

    if (event.createdBy !== adminId) {
      return { error: 'Not authorized to delete this event' };
    }

    await databaseService.deleteEvent(eventId);
    return { success: true };
  } catch (error) {
    console.error('Delete event error:', error);
    return { error: 'Internal server error' };
  }
}