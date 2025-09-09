import { Router } from 'express';
import { z } from 'zod';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { redisService } from '../services/redis';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import type { Event, Participant, Winner } from '../types';
import { generatePassphrase } from '../utils/passphrase';

const router = Router();

const CreateEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name too long')
});

const RegisterParticipantSchema = z.object({
  name: z.string().min(1).max(50).optional()
});

// Get all events for admin
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const events = await redisService.getAdminEvents(req.admin!.adminId);
    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new event
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { name } = CreateEventSchema.parse(req.body);
    
    const eventId = uuidv4();
    const qrData = `${process.env.CORS_ORIGIN}/register/${eventId}`;
    const qrCode = await QRCode.toDataURL(qrData);
    
    const event: Event = {
      id: eventId,
      name,
      createdBy: req.admin!.adminId,
      createdAt: new Date(),
      registrationOpen: true,
      qrCode
    };
    
    await redisService.createEvent(event);
    
    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event details
router.get('/:eventId', async (req, res) => {
  try {
    const event = await redisService.getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete event
router.delete('/:eventId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const event = await redisService.getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.createdBy !== req.admin!.adminId) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }
    
    await redisService.deleteEvent(req.params.eventId);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle event registration
router.patch('/:eventId/registration', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const event = await redisService.getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.createdBy !== req.admin!.adminId) {
      return res.status(403).json({ error: 'Not authorized to modify this event' });
    }
    
    const newStatus = !event.registrationOpen;
    await redisService.updateEventRegistration(req.params.eventId, newStatus);
    
    // Emit real-time update
    const io = (req.app as any).get('io');
    io?.to(`event:${req.params.eventId}`).emit('registrationToggled', { 
      registrationOpen: newStatus 
    });
    
    res.json({ registrationOpen: newStatus });
  } catch (error) {
    console.error('Toggle registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event participants
router.get('/:eventId/participants', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const event = await redisService.getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.createdBy !== req.admin!.adminId) {
      return res.status(403).json({ error: 'Not authorized to view participants' });
    }
    
    const participants = await redisService.getEventParticipants(req.params.eventId);
    res.json(participants);
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get participant details (public endpoint for waiting page)
router.get('/:eventId/participants/:participantId', async (req, res) => {
  try {
    const { eventId, participantId } = req.params;
    
    const event = await redisService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const participants = await redisService.getEventParticipants(eventId);
    const participant = participants.find(p => p.id === participantId);
    
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    // Return only safe participant data
    res.json({
      id: participant.id,
      name: participant.name,
      eventId: participant.eventId,
      registeredAt: participant.registeredAt
    });
  } catch (error) {
    console.error('Get participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if participant is winner (public endpoint)
router.get('/:eventId/participants/:participantId/winner', async (req, res) => {
  try {
    const { eventId, participantId } = req.params;
    
    const event = await redisService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const winners = await redisService.getEventWinners(eventId);
    const winner = winners.find(w => w.participantId === participantId);
    
    if (winner) {
      res.json(winner);
    } else {
      res.json({ isWinner: false });
    }
  } catch (error) {
    console.error('Check winner error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if name is available (public endpoint)
router.get('/:eventId/check-name/:name', async (req, res) => {
  try {
    const { eventId, name } = req.params;
    
    const event = await redisService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (!event.registrationOpen) {
      return res.json({ available: false, reason: 'Registration closed' });
    }
    
    const isNameTaken = await redisService.isParticipantNameTaken(eventId, name);
    
    res.json({ 
      available: !isNameTaken,
      reason: isNameTaken ? 'Name already taken' : null
    });
  } catch (error) {
    console.error('Check name availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if user already registered by name (public endpoint)
router.get('/:eventId/find-participant/:name', async (req, res) => {
  try {
    const { eventId, name } = req.params;
    
    const event = await redisService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const participants = await redisService.getEventParticipants(eventId);
    const participant = participants.find(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (participant) {
      res.json({
        found: true,
        participantId: participant.id,
        name: participant.name
      });
    } else {
      res.json({ found: false });
    }
  } catch (error) {
    console.error('Find participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register participant
router.post('/:eventId/participants', async (req, res) => {
  try {
    const event = await redisService.getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (!event.registrationOpen) {
      return res.status(400).json({ error: 'Registration is closed for this event' });
    }
    
    const { name } = RegisterParticipantSchema.parse(req.body);
    const participantName = name || generatePassphrase();
    
    // Check if name is already taken
    const isNameTaken = await redisService.isParticipantNameTaken(req.params.eventId, participantName);
    if (isNameTaken) {
      return res.status(400).json({ error: 'Name already taken for this event' });
    }
    
    const participant: Participant = {
      id: uuidv4(),
      eventId: req.params.eventId,
      name: participantName,
      registeredAt: new Date()
    };
    
    await redisService.addParticipant(participant);
    
    // Emit real-time update
    const io = (req.app as any).get('io');
    io?.to(`event:${req.params.eventId}`).emit('participantRegistered', participant);
    
    res.status(201).json(participant);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    
    console.error('Register participant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Draw winner
router.post('/:eventId/draw', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const event = await redisService.getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.createdBy !== req.admin!.adminId) {
      return res.status(403).json({ error: 'Not authorized to draw for this event' });
    }
    
    if (event.registrationOpen) {
      return res.status(400).json({ error: 'Close registration before drawing' });
    }
    
    const participants = await redisService.getEventParticipants(req.params.eventId);
    const winners = await redisService.getEventWinners(req.params.eventId);
    
    // Filter out already drawn participants
    const availableParticipants = participants.filter(
      p => !winners.some(w => w.participantId === p.id)
    );
    
    if (availableParticipants.length === 0) {
      return res.status(400).json({ error: 'No participants available to draw' });
    }
    
    // Random selection
    const randomIndex = Math.floor(Math.random() * availableParticipants.length);
    const selectedParticipant = availableParticipants[randomIndex];
    
    const winner: Winner = {
      id: uuidv4(),
      eventId: req.params.eventId,
      participantId: selectedParticipant.id,
      participantName: selectedParticipant.name,
      drawOrder: winners.length + 1,
      drawnAt: new Date()
    };
    
    await redisService.addWinner(winner);
    
    // Emit real-time update
    const io = (req.app as any).get('io');
    io?.to(`event:${req.params.eventId}`).emit('winnerDrawn', winner);
    
    res.json(winner);
  } catch (error) {
    console.error('Draw winner error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get event winners
router.get('/:eventId/winners', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const event = await redisService.getEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    if (event.createdBy !== req.admin!.adminId) {
      return res.status(403).json({ error: 'Not authorized to view winners' });
    }
    
    const winners = await redisService.getEventWinners(req.params.eventId);
    res.json(winners);
  } catch (error) {
    console.error('Get winners error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;