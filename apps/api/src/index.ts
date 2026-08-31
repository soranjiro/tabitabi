import { Hono } from 'hono';
import { Env } from './utils';
import { corsMiddleware } from './middleware/cors';
import auth from './routes/auth';
import itineraries from './routes/itineraries';
import steps from './routes/steps';
import users from './routes/users';
import favorites from './routes/favorites';
import money from './routes/money';
import members from './routes/members';
import packing from './routes/packing';

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware);

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'tabitabi-api' });
});

app.route('/api/v1/auth', auth);
app.route('/api/v1/itineraries', itineraries);
app.route('/api/v1/steps', steps);
app.route('/api/v1/users', users);
app.route('/api/v1/favorites', favorites);
app.route('/api/v1', money);
app.route('/api/v1', members);
app.route('/api/v1', packing);

export default app;