import { Hono } from 'hono';
import { Env } from '../utils';
import { ItineraryService } from '../services/itinerary.service';
import { generateToken, verifyToken, extractBearerToken } from '../utils/jwt';
import type { PasswordAuthRequest } from '@tabitabi/types';

const auth = new Hono<{ Bindings: Env }>();

auth.post('/verify', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Token is required' }
    }, 400);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
    }, 401);
  }

  return c.json({
    success: true,
    data: { shioriId: payload.shioriId, valid: true }
  });
});

auth.post('/password', async (c) => {
  const { shioriId, password }: PasswordAuthRequest = await c.req.json();

  if (!shioriId) {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'shioriId is required' }
    }, 400);
  }

  const service = new ItineraryService(c.env.DB);
  const itinerary = await service.get(shioriId);

  if (!itinerary) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Itinerary not found' }
    }, 404);
  }

  // If itinerary has a password, verify it
  if (itinerary.password && itinerary.password !== password) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid password' }
    }, 401);
  }

  // If itinerary has no password, allow access (password can be anything or empty)
  if (!itinerary.password) {
    // No check needed
  }

  const token = await generateToken(shioriId, c.env.JWT_SECRET);

  return c.json({
    success: true,
    data: { token }
  });
});

export default auth;
