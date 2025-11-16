import { Hono } from 'hono';
import { Env } from './utils';
import { corsMiddleware } from './middleware/cors';
import itineraries from './routes/itineraries';
import steps from './routes/steps';

const app = new Hono<{ Bindings: Env }>();

// Apply CORS middleware
app.use('*', corsMiddleware);

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'tabitabi-api' });
});

// API routes
app.route('/api/v1/itineraries', itineraries);
app.route('/api/v1/itineraries', steps);

export default app;
