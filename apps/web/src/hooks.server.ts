import { error } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { hasUnsafeLeadingDoubleSlash } from '$lib/server/security';

export const handle: Handle = async ({ event, resolve }) => {
  if (hasUnsafeLeadingDoubleSlash(event.url.pathname)) {
    throw error(400, 'Invalid request path');
  }

  return resolve(event);
};
