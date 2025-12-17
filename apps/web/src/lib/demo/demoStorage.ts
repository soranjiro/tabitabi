/**
 * Demo Local Storage Manager
 * All demo data is stored in a single localStorage key.
 * Mimics the actual database table structure for demo purposes.
 * No backend requests are made - all data is stored locally.
 */

import type {
  Itinerary,
  Step,
  ItinerarySecretRecord,
  ItineraryWalicaSettingsRecord,
} from '@tabitabi/types';

const DEMO_KEY = 'tabitabi_demo';

export interface DemoData {
  itinerary: Itinerary;
  steps: Step[];
  itinerary_secrets?: ItinerarySecretRecord | null;
  itinerary_walica_settings?: ItineraryWalicaSettingsRecord | null;
}

interface StoredDemoData {
  itinerary: Itinerary;
  steps: Step[];
  itinerary_secrets?: ItinerarySecretRecord | null;
  itinerary_walica_settings?: ItineraryWalicaSettingsRecord | null;
}

export const demoStorage = {
  /**
   * Get all demo data
   */
  getData(): StoredDemoData | null {
    try {
      const data = localStorage.getItem(DEMO_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  /**
   * Save all demo data
   */
  saveData(data: StoredDemoData): void {
    localStorage.setItem(DEMO_KEY, JSON.stringify(data));
  },

  /**
   * Get demo itinerary from local storage
   * Returns itinerary with walica_id and secret_settings merged for UI compatibility
   */
  getItinerary(): Itinerary | null {
    const data = this.getData();
    if (!data) return null;

    const itinerary: Itinerary = { ...data.itinerary };

    if (data.itinerary_secrets) {
      itinerary.secret_settings = {
        enabled: data.itinerary_secrets.enabled,
        offset_minutes: data.itinerary_secrets.offset_minutes,
      };
    }

    if (data.itinerary_walica_settings) {
      itinerary.walica_id = data.itinerary_walica_settings.walica_id;
    }

    return itinerary;
  },

  /**
   * Get demo steps from local storage
   */
  getSteps(): Step[] {
    const data = this.getData();
    if (!data?.steps) return [];
    return data.steps.map((step) => ({ ...step }));
  },

  /**
   * Get demo itinerary secrets
   */
  getItinerarySecrets(): ItinerarySecretRecord | null {
    const data = this.getData();
    return data?.itinerary_secrets ?? null;
  },

  /**
   * Get demo itinerary walica settings
   */
  getItineraryWalicaSettings(): ItineraryWalicaSettingsRecord | null {
    const data = this.getData();
    return data?.itinerary_walica_settings ?? null;
  },

  /**
   * Update itinerary
   */
  updateItinerary(updates: Partial<Itinerary>): Itinerary | null {
    const data = this.getData();
    if (!data) return null;

    const { walica_id, secret_settings, ...rest } = updates;
    const now = new Date().toISOString();

    if (secret_settings !== undefined) {
      this.updateItinerarySecrets(secret_settings ?? null);
    }

    if (walica_id !== undefined) {
      this.updateItineraryWalicaSettings(walica_id ?? null);
    }

    const updated = { ...data.itinerary, ...rest, updated_at: now };
    this.saveData({ ...data, itinerary: updated });
    return this.getItinerary();
  },

  /**
   * Update itinerary secrets
   */
  updateItinerarySecrets(
    secretSettings: { enabled: boolean; offset_minutes: number } | null
  ): ItinerarySecretRecord | null {
    const data = this.getData();
    if (!data) return null;

    const now = new Date().toISOString();

    if (secretSettings === null) {
      this.saveData({ ...data, itinerary_secrets: null });
      return null;
    }

    const updated: ItinerarySecretRecord = data.itinerary_secrets
      ? { ...data.itinerary_secrets, ...secretSettings, updated_at: now }
      : {
          itinerary_id: data.itinerary.id,
          enabled: secretSettings.enabled,
          offset_minutes: secretSettings.offset_minutes,
          created_at: now,
          updated_at: now,
        };

    this.saveData({ ...data, itinerary_secrets: updated });
    return updated;
  },

  /**
   * Update itinerary walica settings
   */
  updateItineraryWalicaSettings(walicaId: string | null): ItineraryWalicaSettingsRecord | null {
    const data = this.getData();
    if (!data) return null;

    const now = new Date().toISOString();

    if (walicaId === null) {
      this.saveData({ ...data, itinerary_walica_settings: null });
      return null;
    }

    const updated: ItineraryWalicaSettingsRecord = data.itinerary_walica_settings
      ? { ...data.itinerary_walica_settings, walica_id: walicaId, updated_at: now }
      : {
          itinerary_id: data.itinerary.id,
          walica_id: walicaId,
          created_at: now,
          updated_at: now,
        };

    this.saveData({ ...data, itinerary_walica_settings: updated });
    return updated;
  },

  /**
   * Update a specific step
   */
  updateStep(stepId: string, updates: Partial<Step>): Step | null {
    const data = this.getData();
    if (!data) return null;

    const steps = data.steps;
    const index = steps.findIndex(s => s.id === stepId);
    if (index === -1) return null;

    steps[index] = { ...steps[index], ...updates, updated_at: new Date().toISOString() };
    this.saveData({ ...data, steps });
    return steps[index];
  },

  /**
   * Create a new step
   */
  createStep(step: Omit<Step, 'id' | 'created_at' | 'updated_at'>): Step {
    const data = this.getData();
    if (!data) throw new Error('Demo not initialized');

    const now = new Date().toISOString();
    const newStep: Step = {
      ...step,
      id: `demo-step-${Date.now()}`,
      created_at: now,
      updated_at: now,
    };
    this.saveData({ ...data, steps: [...data.steps, newStep] });
    return newStep;
  },

  /**
   * Delete a step
   */
  deleteStep(stepId: string): boolean {
    const data = this.getData();
    if (!data) return false;

    const filtered = data.steps.filter(s => s.id !== stepId);
    if (filtered.length === data.steps.length) return false;
    this.saveData({ ...data, steps: filtered });
    return true;
  },

  /**
   * Initialize demo with sample data
   */
  initializeDemo(demoData: DemoData): void {
    this.saveData({
      itinerary: demoData.itinerary,
      steps: demoData.steps,
      itinerary_secrets: demoData.itinerary_secrets ?? null,
      itinerary_walica_settings: demoData.itinerary_walica_settings ?? null,
    });
  },

  /**
   * Clear all demo data
   */
  clear(): void {
    localStorage.removeItem(DEMO_KEY);
  },

  /**
   * Check if demo data exists
   */
  hasData(): boolean {
    return this.getData() !== null;
  },
};
