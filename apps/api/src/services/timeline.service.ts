import type { TimelineStep, CreateTimelineStepInput, UpdateTimelineStepInput } from '@tabitabi/types';
import type { D1Database } from '@cloudflare/workers-types';
import { generateId, getCurrentTimestamp } from '../utils';

export class TimelineService {
  constructor(private db: D1Database) {}

  async list(itineraryId: string): Promise<TimelineStep[]> {
    const result = await this.db
      .prepare('SELECT * FROM timeline_steps WHERE itinerary_id = ? ORDER BY step_order ASC')
      .bind(itineraryId)
      .all();

    return (result.results || []).map(row => this.mapToTimelineStep(row));
  }

  async create(itineraryId: string, input: CreateTimelineStepInput): Promise<TimelineStep> {
    const id = generateId();
    const now = getCurrentTimestamp();

    // Get the next step order
    const maxOrder = await this.db
      .prepare('SELECT MAX(step_order) as max_order FROM timeline_steps WHERE itinerary_id = ?')
      .bind(itineraryId)
      .first<{ max_order: number | null }>();

    const stepOrder = (maxOrder?.max_order || 0) + 1;

    const step: TimelineStep = {
      id,
      itineraryId,
      stepOrder,
      title: input.title,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: input.durationMinutes,
      location: input.location,
      latitude: input.latitude,
      longitude: input.longitude,
      notes: input.notes,
      createdAt: now,
    };

    await this.db
      .prepare(
        `INSERT INTO timeline_steps
        (id, itinerary_id, step_order, title, start_time, end_time, duration_minutes, location, latitude, longitude, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        step.id,
        step.itineraryId,
        step.stepOrder,
        step.title,
        step.startTime,
        step.endTime,
        step.durationMinutes,
        step.location,
        step.latitude,
        step.longitude,
        step.notes,
        step.createdAt
      )
      .run();

    return step;
  }

  async update(stepId: string, input: UpdateTimelineStepInput): Promise<TimelineStep | null> {
    const existing = await this.db
      .prepare('SELECT * FROM timeline_steps WHERE id = ?')
      .bind(stepId)
      .first();

    if (!existing) return null;

    const updated: TimelineStep = {
      ...this.mapToTimelineStep(existing),
      ...input,
    };

    await this.db
      .prepare(
        `UPDATE timeline_steps
        SET title = ?, start_time = ?, end_time = ?, duration_minutes = ?, location = ?, latitude = ?, longitude = ?, notes = ?
        WHERE id = ?`
      )
      .bind(
        updated.title,
        updated.startTime,
        updated.endTime,
        updated.durationMinutes,
        updated.location,
        updated.latitude,
        updated.longitude,
        updated.notes,
        stepId
      )
      .run();

    return updated;
  }

  async delete(stepId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM timeline_steps WHERE id = ?')
      .bind(stepId)
      .run();

    return result.success;
  }

  async reorder(stepId: string, newOrder: number): Promise<boolean> {
    const step = await this.db
      .prepare('SELECT * FROM timeline_steps WHERE id = ?')
      .bind(stepId)
      .first();

    if (!step) return false;

    await this.db
      .prepare('UPDATE timeline_steps SET step_order = ? WHERE id = ?')
      .bind(newOrder, stepId)
      .run();

    return true;
  }

  private mapToTimelineStep(row: any): TimelineStep {
    return {
      id: row.id,
      itineraryId: row.itinerary_id,
      stepOrder: row.step_order,
      title: row.title,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: row.duration_minutes,
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }
}
