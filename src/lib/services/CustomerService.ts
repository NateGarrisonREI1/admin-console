// src/lib/services/CustomerService.ts
import { supabaseAdmin } from "@/lib/supabase/server";
import { NotFoundError, ValidationError, InternalError } from "./errors";
import type {
  Customer,
  CustomerUpdate,
  ContactLogEntry,
  CreateContactLogDTO,
  Paginated,
} from "./types";

const CUSTOMER_FIELDS =
  "id, customer_name, customer_email, customer_phone, customer_type, address1, address2, city, state, zip, created_at";

const VALID_METHODS = ["phone", "email", "sms", "in_person", "system"] as const;
const VALID_DIRECTIONS = ["inbound", "outbound"] as const;

export class CustomerService {
  /** Get customer details from an admin job. */
  async getCustomer(jobId: string): Promise<Customer> {
    const { data, error } = await supabaseAdmin
      .from("admin_jobs")
      .select(CUSTOMER_FIELDS)
      .eq("id", jobId)
      .single();

    if (error || !data) throw new NotFoundError("Customer", jobId);

    return data as Customer;
  }

  /** Update customer fields on an admin job. */
  async updateCustomer(jobId: string, updates: CustomerUpdate): Promise<Customer> {
    const allowed: (keyof CustomerUpdate)[] = [
      "customer_name", "customer_email", "customer_phone", "customer_type",
      "address1", "address2", "city", "state", "zip",
    ];

    const clean: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in updates) clean[key] = updates[key];
    }

    if (Object.keys(clean).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    const { data, error } = await supabaseAdmin
      .from("admin_jobs")
      .update(clean)
      .eq("id", jobId)
      .select(CUSTOMER_FIELDS)
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Customer", jobId);
      throw new InternalError(error.message);
    }

    return data as Customer;
  }

  /** Get contact history for a job, newest first. */
  async getContactHistory(
    jobId: string,
    opts: { page?: number; per_page?: number } = {}
  ): Promise<Paginated<ContactLogEntry>> {
    const page = Math.max(1, opts.page ?? 1);
    const perPage = Math.min(100, Math.max(1, opts.per_page ?? 50));
    const offset = (page - 1) * perPage;

    // Verify job exists
    await this.getCustomer(jobId);

    const { data, error, count } = await supabaseAdmin
      .from("contact_log")
      .select("*", { count: "exact" })
      .eq("admin_job_id", jobId)
      .order("contacted_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) {
      console.error("CustomerService.getContactHistory error:", error);
      throw new InternalError(error.message);
    }

    return {
      items: (data ?? []) as ContactLogEntry[],
      total: count ?? 0,
      page,
      per_page: perPage,
    };
  }

  /** Add a contact log entry for a job. */
  async addContactLog(
    jobId: string,
    dto: CreateContactLogDTO
  ): Promise<ContactLogEntry> {
    const method = dto.contact_method ?? "phone";
    const direction = dto.direction ?? "outbound";

    if (!VALID_METHODS.includes(method as typeof VALID_METHODS[number])) {
      throw new ValidationError(`Invalid contact_method. Must be one of: ${VALID_METHODS.join(", ")}`);
    }
    if (!VALID_DIRECTIONS.includes(direction as typeof VALID_DIRECTIONS[number])) {
      throw new ValidationError(`Invalid direction. Must be one of: ${VALID_DIRECTIONS.join(", ")}`);
    }

    // Verify job exists
    const { data: job } = await supabaseAdmin
      .from("admin_jobs")
      .select("id")
      .eq("id", jobId)
      .single();

    if (!job) throw new NotFoundError("Job", jobId);

    const { data, error } = await supabaseAdmin
      .from("contact_log")
      .insert({
        admin_job_id: jobId,
        contact_method: method,
        direction,
        subject: dto.subject ?? null,
        body: dto.body ?? null,
        contacted_by: dto.contacted_by ?? null,
        contacted_at: dto.contacted_at ?? new Date().toISOString(),
        response_received: dto.response_received ?? false,
        response_at: dto.response_at ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("CustomerService.addContactLog error:", error);
      throw new InternalError(error.message);
    }

    return data as ContactLogEntry;
  }
}
