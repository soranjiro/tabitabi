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

  if (!shioriId || !password) {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'shioriId and password are required' }
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

  if (itinerary.password !== password) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid password' }
    }, 401);
  }

  const token = await generateToken(shioriId, c.env.JWT_SECRET);

  return c.json({
    success: true,
    data: { token }
  });
});

export default auth;
