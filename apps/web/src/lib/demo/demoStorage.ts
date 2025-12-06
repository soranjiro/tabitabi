/**
 * Demo Local Storage Manager
 * All demo data is stored in a single localStorage key.
 * Mimics the actual database table structure for demo purposes.
 * No backend requests are made - all data is stored locally.
 */

import type { Itinerary, Step } from '@tabitabi/types';

const DEMO_KEY = 'tabitabi_demo';

export interface DemoData {
  itinerary: Itinerary;
  steps: Step[];
}

interface StoredDemoData {
  itinerary: Itinerary;
  steps: Step[];
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
   */
  getItinerary(): Itinerary | null {
    const data = this.getData();
    return data?.itinerary ?? null;
  },

  /**
   * Get demo steps from local storage
   */
  getSteps(): Step[] {
    const data = this.getData();
    return data?.steps ?? [];
  },

  /**
   * Update itinerary
   */
  updateItinerary(updates: Partial<Itinerary>): Itinerary | null {
    const data = this.getData();
    if (!data) return null;

    const updated = { ...data.itinerary, ...updates, updated_at: new Date().toISOString() };
    this.saveData({ ...data, itinerary: updated });
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
