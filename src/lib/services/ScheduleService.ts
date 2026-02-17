// src/lib/services/ScheduleService.ts
import { supabaseAdmin } from "@/lib/supabase/server";
import { NotFoundError, ValidationError, InternalError } from "./errors";
import type {
  Schedule,
  ScheduleType,
  ScheduleStatus,
  ScheduleFilters,
  ScheduleUpdate,
  TimeSlot,
  Paginated,
} from "./types";

const VALID_KINDS: ScheduleType[] = ["hes_visit", "inspection", "follow_up", "other"];
const VALID_STATUSES: ScheduleStatus[] = ["pending", "confirmed", "completed", "canceled"];

export class ScheduleService {
  /** Schedule an HES visit for a job. */
  async scheduleHESVisit(
    jobId: string,
    startAt: Date,
    endAt: Date,
    assignee: string
  ): Promise<Schedule> {
    return this.createSchedule(jobId, "hes_visit", startAt, endAt, assignee);
  }

  /** Schedule an inspection for a job. */
  async scheduleInspection(
    jobId: string,
    startAt: Date,
    endAt: Date,
    assignee: string
  ): Promise<Schedule> {
    return this.createSchedule(jobId, "inspection", startAt, endAt, assignee);
  }

  /** List appointments with optional filters and pagination. */
  async getSchedules(filters: ScheduleFilters = {}): Promise<Paginated<Schedule>> {
    const page = Math.max(1, filters.page ?? 1);
    const perPage = Math.min(100, Math.max(1, filters.per_page ?? 25));
    const offset = (page - 1) * perPage;

    let query = supabaseAdmin
      .from("admin_job_appointments")
      .select("*", { count: "exact" })
      .order("start_at", { ascending: true })
      .range(offset, offset + perPage - 1);

    if (filters.job_id) query = query.eq("job_id", filters.job_id);
    if (filters.type) query = query.eq("kind", filters.type);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.after) query = query.gte("start_at", filters.after);
    if (filters.before) query = query.lte("start_at", filters.before);

    const { data, error, count } = await query;

    if (error) {
      console.error("ScheduleService.getSchedules error:", error);
      throw new InternalError(error.message);
    }

    return {
      items: (data ?? []) as Schedule[],
      total: count ?? 0,
      page,
      per_page: perPage,
    };
  }

  /** Update an appointment's fields. */
  async updateSchedule(id: string, updates: ScheduleUpdate): Promise<Schedule> {
    const clean: Record<string, unknown> = {};

    if (updates.status != null) {
      if (!VALID_STATUSES.includes(updates.status)) {
        throw new ValidationError(
          `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
        );
      }
      clean.status = updates.status;
    }
    if (updates.start_at != null) clean.start_at = updates.start_at;
    if (updates.end_at != null) clean.end_at = updates.end_at;
    if (updates.assignee !== undefined) clean.assignee = updates.assignee;
    if (updates.notes !== undefined) clean.notes = updates.notes;

    if (Object.keys(clean).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    const { data, error } = await supabaseAdmin
      .from("admin_job_appointments")
      .update(clean)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Appointment", id);
      throw new InternalError(error.message);
    }

    return data as Schedule;
  }

  /** Cancel an appointment (soft delete — sets status to canceled). */
  async cancelSchedule(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("admin_job_appointments")
      .update({ status: "canceled" })
      .eq("id", id);

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Appointment", id);
      throw new InternalError(error.message);
    }
  }

  /**
   * Get available time slots for a given type and date.
   * Generates 1-hour slots from 8 AM to 5 PM, excluding slots that
   * overlap with existing confirmed/pending appointments.
   */
  async getAvailableSlots(
    type: ScheduleType,
    date: Date
  ): Promise<TimeSlot[]> {
    const dayStart = new Date(date);
    dayStart.setHours(8, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(17, 0, 0, 0);

    // Get existing appointments for this day
    const { data: existing } = await supabaseAdmin
      .from("admin_job_appointments")
      .select("start_at, end_at")
      .eq("kind", type)
      .in("status", ["pending", "confirmed"])
      .gte("start_at", dayStart.toISOString())
      .lte("start_at", dayEnd.toISOString());

    const busy = (existing ?? []).map((a: { start_at: string; end_at: string }) => ({
      start: new Date(a.start_at).getTime(),
      end: new Date(a.end_at).getTime(),
    }));

    // Generate 1-hour slots
    const slots: TimeSlot[] = [];
    const cursor = new Date(dayStart);

    while (cursor < dayEnd) {
      const slotStart = cursor.getTime();
      const slotEnd = slotStart + 60 * 60 * 1000;

      const overlaps = busy.some(
        (b) => slotStart < b.end && slotEnd > b.start
      );

      slots.push({
        start: new Date(slotStart).toISOString(),
        end: new Date(slotEnd).toISOString(),
        available: !overlaps,
      });

      cursor.setTime(slotEnd);
    }

    return slots;
  }

  // ── private ──

  private async createSchedule(
    jobId: string,
    kind: ScheduleType,
    startAt: Date,
    endAt: Date,
    assignee: string
  ): Promise<Schedule> {
    if (!jobId) throw new ValidationError("job_id is required");
    if (!VALID_KINDS.includes(kind)) {
      throw new ValidationError(`Invalid type. Must be one of: ${VALID_KINDS.join(", ")}`);
    }

    // Verify job exists
    const { data: job } = await supabaseAdmin
      .from("admin_jobs")
      .select("id")
      .eq("id", jobId)
      .single();

    if (!job) throw new NotFoundError("Job", jobId);

    const { data, error } = await supabaseAdmin
      .from("admin_job_appointments")
      .insert({
        job_id: jobId,
        kind,
        status: "pending",
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        assignee: assignee || "unassigned",
      })
      .select()
      .single();

    if (error) {
      console.error("ScheduleService.createSchedule error:", error);
      throw new InternalError(error.message);
    }

    return data as Schedule;
  }
}
