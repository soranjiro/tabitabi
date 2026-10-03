import { beforeEach, describe, expect, it, vi } from 'vitest';
import { load } from './+page';
import { itineraryApi } from '$lib/api/itinerary';
import { stepApi } from '$lib/api/step';

vi.mock('$lib/api/itinerary', () => ({ itineraryApi: { get: vi.fn() } }));
vi.mock('$lib/api/step', () => ({ stepApi: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock('$lib/themes', () => ({ loadTheme: vi.fn().mockResolvedValue({ id: 'planning-draft' }) }));

// The page only consumes params; the other SvelteKit event fields are irrelevant here.
const event = { params: { id: 'snapshot-id' } } as Parameters<typeof load>[0];

describe('shared snapshot routing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects a snapshot using the public marker without a private source ID', async () => {
    vi.mocked(itineraryApi.get).mockResolvedValue({
      id: 'snapshot-id', title: 'Shared trip', theme_id: 'planning-draft', memo: '',
      is_password_protected: false, is_shared_snapshot: true, created_at: '', updated_at: '',
    });
    await expect(load(event)).rejects.toMatchObject({ status: 308, location: '/s/snapshot-id' });
    expect(stepApi.list).not.toHaveBeenCalled();
  });

  it('continues to load an editable source itinerary', async () => {
    vi.mocked(itineraryApi.get).mockResolvedValue({
      id: 'snapshot-id', title: 'My trip', theme_id: 'planning-draft', memo: '',
      is_password_protected: false, is_shared_snapshot: false, created_at: '', updated_at: '',
    });
    await expect(load(event)).resolves.toMatchObject({ itinerary: { is_shared_snapshot: false }, steps: [] });
    expect(stepApi.list).toHaveBeenCalledWith('snapshot-id');
  });
});
