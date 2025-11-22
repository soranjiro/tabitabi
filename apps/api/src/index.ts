import { Hono } from 'hono';
import { Env } from './utils';
import { corsMiddleware } from './middleware/cors';
import auth from './routes/auth';
import itineraries from './routes/itineraries';
import steps from './routes/steps';

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware);

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'tabitabi-api' });
});

app.route('/api/v1/auth', auth);
app.route('/api/v1/itineraries', itineraries);
app.route('/api/v1/steps', steps);

export default app;
