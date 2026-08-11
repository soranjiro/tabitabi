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
  MoneyData,
  PackingData,
  TripMember,
} from '@tabitabi/types';

const DEMO_KEY = 'tabitabi_demo';

const cloneMoneyData = (money: MoneyData): MoneyData =>
  JSON.parse(JSON.stringify(money)) as MoneyData;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export interface DemoData {
  itinerary: Itinerary;
  steps: Step[];
  itinerary_secrets?: ItinerarySecretRecord | null;
  itinerary_money?: MoneyData | null;
  itinerary_members?: TripMember[];
  itinerary_packing?: PackingData | null;
}

interface StoredDemoData {
  itinerary: Itinerary;
  steps: Step[];
  itinerary_secrets?: ItinerarySecretRecord | null;
  itinerary_money?: MoneyData | null;
  itinerary_members?: TripMember[];
  itinerary_packing?: PackingData | null;
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
   * Returns itinerary with secret settings merged for UI compatibility.
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

  /** Get the demo-only money data. It is deliberately kept in the same localStorage record. */
  getMoneyData(): MoneyData | null {
    const money = this.getData()?.itinerary_money;
    return money ? cloneMoneyData(money) : null;
  },

  setMoneyData(money: MoneyData): void {
    const data = this.getData();
    if (!data) return;
    this.saveData({ ...data, itinerary_money: cloneMoneyData(money) });
  },

  getMembers(): TripMember[] {
    const data = this.getData();
    if (!data) return [];
    return clone(data.itinerary_members ?? data.itinerary_money?.members ?? []);
  },

  setMembers(members: TripMember[]): void {
    const data = this.getData();
    if (!data) return;
    const itineraryMoney = data.itinerary_money
      ? { ...data.itinerary_money, members: clone(members) }
      : data.itinerary_money;
    const itineraryPacking = data.itinerary_packing
      ? { ...data.itinerary_packing, members: clone(members) }
      : data.itinerary_packing;
    this.saveData({ ...data, itinerary_members: clone(members), itinerary_money: itineraryMoney, itinerary_packing: itineraryPacking });
  },

  getPackingData(): PackingData | null {
    const packing = this.getData()?.itinerary_packing;
    return packing ? clone(packing) : null;
  },

  setPackingData(packing: PackingData): void {
    const data = this.getData();
    if (!data) return;
    const itineraryMoney = data.itinerary_money
      ? { ...data.itinerary_money, members: clone(packing.members) }
      : data.itinerary_money;
    this.saveData({ ...data, itinerary_packing: clone(packing), itinerary_members: clone(packing.members), itinerary_money: itineraryMoney });
  },

  /**
   * Update itinerary
   */
  updateItinerary(updates: Partial<Itinerary>): Itinerary | null {
    const data = this.getData();
    if (!data) return null;

    const { secret_settings, ...rest } = updates;
    const now = new Date().toISOString();

    if (secret_settings !== undefined) {
      this.updateItinerarySecrets(secret_settings ?? null);
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
      itinerary_money: demoData.itinerary_money ?? null,
      itinerary_members: demoData.itinerary_members ?? demoData.itinerary_money?.members ?? [],
      itinerary_packing: demoData.itinerary_packing ?? null,
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
