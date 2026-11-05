import { Hono } from 'hono';
import { Env } from './utils';
import { corsMiddleware } from './middleware/cors';
import { protectApiWrites } from './middleware/write-guard';
import { protectPublicApiReads } from './middleware/read-guard';
import auth from './routes/auth';
import itineraries from './routes/itineraries';
import backgrounds from './routes/backgrounds';
import steps from './routes/steps';
import users from './routes/users';
import favorites from './routes/favorites';
import money from './routes/money';
import members from './routes/members';
import packing from './routes/packing';
import passkeys from './routes/passkeys';
import mcp from './routes/mcp';
import mcpAuth from './routes/mcp-auth';

const app = new Hono<{ Bindings: Env }>();

app.use('*', corsMiddleware);
// Sensitive account, editor-grant and itinerary responses must never be cached by
// an intermediate proxy, even if it uses aggressive default cache rules.
app.use('/api/v1/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'private, no-store');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
});
app.use('/api/v1/*', protectPublicApiReads);
app.use('/api/v1/*', protectApiWrites);
app.use('/oauth/*', protectApiWrites);
app.use('/mcp', protectApiWrites);

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'tabitabi-api' });
});

app.route('/', mcpAuth);
app.route('/', mcp);

app.route('/api/v1/auth', auth);
app.route('/api/v1/passkeys', passkeys);
app.route('/api/v1/itineraries', itineraries);
app.route('/api/v1/backgrounds', backgrounds);
app.route('/api/v1/steps', steps);
app.route('/api/v1/users', users);
app.route('/api/v1/favorites', favorites);
app.route('/api/v1', money);
app.route('/api/v1', members);
app.route('/api/v1', packing);

export default app;