// src/lib/services/AdminOpsService.ts
import { supabaseAdmin } from "@/lib/supabase/server";
import { InternalError } from "./errors";
import type {
  HesTeamMember,
  HesScheduleEntry,
  InspectorTeamMember,
  InspectorScheduleEntry,
  DirectLead,
  PartnerContractor,
  PartnerDispatch,
  AdminDashboardKpis,
  AdminAlert,
  AdminBrokerSummary,
  RevenueBreakdown,
  BrokerHealthScore,
  BrokerHealthSummary,
  BrokerHealthAudit,
  BrokerContractorPerformance,
  TimeOffPeriod,
} from "@/types/admin-ops";

export class AdminOpsService {
  // ──────────────────────────────────────────
  // DASHBOARD KPIs
  // ──────────────────────────────────────────

  async getDashboardKpis(): Promise<AdminDashboardKpis> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const today = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [
      brokers,
      payments,
      brokerLeads,
      hesStaff,
      hesToday,
      inspStaff,
      inspToday,
      partners,
      pendingDirect,
      inactiveBrokers,
    ] = await Promise.all([
      supabaseAdmin.from("brokers").select("id", { count: "exact" }),
      supabaseAdmin.from("payments").select("amount").eq("status", "completed").gte("created_at", monthStart),
      supabaseAdmin.from("broker_leads").select("id, status, broker_commission").gte("created_at", monthStart),
      supabaseAdmin.from("hes_team_members").select("id", { count: "exact" }).eq("status", "active"),
      supabaseAdmin.from("hes_schedule").select("id", { count: "exact" }).eq("scheduled_date", today).neq("status", "cancelled"),
      supabaseAdmin.from("inspector_team_members").select("id", { count: "exact" }).eq("status", "active"),
      supabaseAdmin.from("inspector_schedule").select("id", { count: "exact" }).eq("scheduled_date", today).neq("status", "cancelled"),
      supabaseAdmin.from("partner_contractors").select("id, status", { count: "exact" }).eq("status", "active"),
      supabaseAdmin.from("direct_leads").select("id", { count: "exact" }).eq("status", "pending"),
      supabaseAdmin.from("brokers").select("id, updated_at").lt("updated_at", sevenDaysAgo),
    ]);

    const paymentTotal = (payments.data ?? []).reduce((s: number, p: { amount: number }) => s + Number(p.amount ?? 0), 0);
    const allBrokerLeads = (brokerLeads.data ?? []) as { id: string; status: string; broker_commission: number | null }[];
    const postedCount = allBrokerLeads.length;
    const purchasedCount = allBrokerLeads.filter(l => l.status === "sold" || l.status === "in_progress" || l.status === "closed").length;
    const closedCount = allBrokerLeads.filter(l => l.status === "closed").length;
    const brokerRev = allBrokerLeads.reduce((s, l) => s + (l.broker_commission ?? 0), 0);

    // Compute HES capacity (assume 3 slots per day per person)
    const hesStaffCount = hesStaff.count ?? 0;
    const hesTodayCount = hesToday.count ?? 0;
    const hesCapacity = hesStaffCount > 0 ? Math.round((hesTodayCount / (hesStaffCount * 3)) * 100) : 0;

    const inspStaffCount = inspStaff.count ?? 0;
    const inspTodayCount = inspToday.count ?? 0;
    const inspCapacity = inspStaffCount > 0 ? Math.round((inspTodayCount / (inspStaffCount * 2)) * 100) : 0;

    const partnerCount = partners.count ?? 0;

    // Build alerts
    const alerts: AdminAlert[] = [];
    if (hesTodayCount === 0 && hesStaffCount > 0) {
      alerts.push({ type: "info", message: "No HES assessments scheduled today" });
    }
    if (inspTodayCount === 0 && inspStaffCount > 0) {
      alerts.push({ type: "info", message: "No inspections scheduled today" });
    }
    const inactiveCount = (inactiveBrokers.data ?? []).length;
    if (inactiveCount > 0) {
      alerts.push({ type: "warning", message: `${inactiveCount} broker${inactiveCount > 1 ? "s" : ""} inactive for 7+ days` });
    }
    const pendingCount = pendingDirect.count ?? 0;
    if (pendingCount > 0) {
      alerts.push({ type: "warning", message: `${pendingCount} direct lead${pendingCount > 1 ? "s" : ""} awaiting assignment` });
    }

    // Services completed this month
    const [hesCompleted, inspCompleted] = await Promise.all([
      supabaseAdmin.from("hes_schedule").select("id", { count: "exact" }).eq("status", "completed").gte("completed_at", monthStart),
      supabaseAdmin.from("inspector_schedule").select("id", { count: "exact" }).eq("status", "completed").gte("completed_at", monthStart),
    ]);

    return {
      active_brokers: brokers.count ?? 0,
      revenue_this_month: paymentTotal + brokerRev,
      broker_revenue: brokerRev,
      leads_posted: postedCount,
      leads_purchased: purchasedCount,
      leads_closed: closedCount,
      services_completed: (hesCompleted.count ?? 0) + (inspCompleted.count ?? 0),
      hes_staff_count: hesStaffCount,
      hes_capacity_pct: hesCapacity,
      hes_scheduled_today: hesTodayCount,
      inspector_staff_count: inspStaffCount,
      inspector_capacity_pct: inspCapacity,
      inspector_scheduled_today: inspTodayCount,
      partner_count: partnerCount,
      partner_active_pct: 100,
      partner_available: partnerCount,
      pending_direct_leads: pendingCount,
      alerts,
    };
  }

  // ──────────────────────────────────────────
  // TODAY'S SCHEDULE
  // ──────────────────────────────────────────

  async getTodaySchedule(): Promise<{ hes: HesScheduleEntry[]; inspections: InspectorScheduleEntry[] }> {
    const today = new Date().toISOString().slice(0, 10);

    const [hes, insp] = await Promise.all([
      supabaseAdmin
        .from("hes_schedule")
        .select("*, team_member:hes_team_members(*)")
        .eq("scheduled_date", today)
        .neq("status", "cancelled")
        .order("scheduled_time", { ascending: true }),
      supabaseAdmin
        .from("inspector_schedule")
        .select("*, team_member:inspector_team_members(*)")
        .eq("scheduled_date", today)
        .neq("status", "cancelled")
        .order("scheduled_time", { ascending: true }),
    ]);

    return {
      hes: (hes.data ?? []) as HesScheduleEntry[],
      inspections: (insp.data ?? []) as InspectorScheduleEntry[],
    };
  }

  // ──────────────────────────────────────────
  // REVENUE BREAKDOWN
  // ──────────────────────────────────────────

  async getRevenueBreakdown(): Promise<RevenueBreakdown> {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [payments, brokerLeads, hesCompleted, inspCompleted, dispatches] = await Promise.all([
      supabaseAdmin.from("payments").select("amount").eq("status", "completed").gte("created_at", monthStart),
      supabaseAdmin.from("broker_leads").select("id, broker_commission, price").gte("created_at", monthStart).eq("status", "closed"),
      supabaseAdmin.from("hes_schedule").select("invoice_amount").eq("status", "completed").eq("payment_status", "paid").gte("completed_at", monthStart),
      supabaseAdmin.from("inspector_schedule").select("invoice_amount").eq("status", "completed").eq("payment_status", "paid").gte("completed_at", monthStart),
      supabaseAdmin.from("partner_dispatch").select("amount_owed").eq("status", "completed").gte("completed_at", monthStart),
    ]);

    const bLeads = (brokerLeads.data ?? []) as { id: string; broker_commission: number | null; price: number }[];
    const brokerComm = bLeads.reduce((s, l) => s + (l.broker_commission ?? 0), 0);
    const hesRev = (hesCompleted.data ?? []).reduce((s: number, h: { invoice_amount: number | null }) => s + (h.invoice_amount ?? 0), 0);
    const inspRev = (inspCompleted.data ?? []).reduce((s: number, i: { invoice_amount: number | null }) => s + (i.invoice_amount ?? 0), 0);
    const partnerRev = (dispatches.data ?? []).reduce((s: number, d: { amount_owed: number }) => s + (d.amount_owed ?? 0), 0);

    const total = brokerComm + hesRev + inspRev + partnerRev;
    const reiTake = Math.round(brokerComm * 0.7 + hesRev * 0.5 + inspRev * 0.5 + partnerRev * 0.2);

    return {
      broker_commissions: brokerComm,
      broker_lead_count: bLeads.length,
      inhouse_hes_revenue: hesRev,
      inhouse_hes_count: (hesCompleted.data ?? []).length,
      inhouse_inspection_revenue: inspRev,
      inhouse_inspection_count: (inspCompleted.data ?? []).length,
      partner_dispatch_revenue: partnerRev,
      partner_dispatch_count: (dispatches.data ?? []).length,
      total_revenue: total,
      rei_take: reiTake,
    };
  }

  // ──────────────────────────────────────────
  // BROKERS (Admin view)
  // ──────────────────────────────────────────

  async getBrokers(): Promise<AdminBrokerSummary[]> {
    const { data: brokers, error } = await supabaseAdmin
      .from("brokers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new InternalError(error.message);
    if (!brokers || brokers.length === 0) return [];

    const brokerIds = brokers.map((b: { id: string }) => b.id);

    const [assessments, leads, contractors] = await Promise.all([
      supabaseAdmin.from("broker_assessments").select("broker_id").in("broker_id", brokerIds),
      supabaseAdmin.from("broker_leads").select("broker_id, status, broker_commission").in("broker_id", brokerIds),
      supabaseAdmin.from("broker_contractors").select("broker_id, provider_type").in("broker_id", brokerIds),
    ]);

    const assessMap: Record<string, number> = {};
    for (const a of (assessments.data ?? []) as { broker_id: string }[]) {
      assessMap[a.broker_id] = (assessMap[a.broker_id] ?? 0) + 1;
    }

    const leadMap: Record<string, { posted: number; closed: number; revenue: number }> = {};
    for (const l of (leads.data ?? []) as { broker_id: string; status: string; broker_commission: number | null }[]) {
      if (!leadMap[l.broker_id]) leadMap[l.broker_id] = { posted: 0, closed: 0, revenue: 0 };
      leadMap[l.broker_id].posted++;
      if (l.status === "closed") {
        leadMap[l.broker_id].closed++;
        leadMap[l.broker_id].revenue += l.broker_commission ?? 0;
      }
    }

    const contMap: Record<string, { contractor: number; hes: number; inspector: number }> = {};
    for (const c of (contractors.data ?? []) as { broker_id: string; provider_type: string }[]) {
      if (!contMap[c.broker_id]) contMap[c.broker_id] = { contractor: 0, hes: 0, inspector: 0 };
      if (c.provider_type === "hes_assessor") contMap[c.broker_id].hes++;
      else if (c.provider_type === "inspector") contMap[c.broker_id].inspector++;
      else contMap[c.broker_id].contractor++;
    }

    // Get user emails
    const userIds = brokers.map((b: { user_id: string }) => b.user_id);
    const { data: profiles } = await supabaseAdmin
      .from("app_profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    const profileMap: Record<string, { email: string; full_name: string | null }> = {};
    for (const p of (profiles ?? []) as { id: string; email: string; full_name: string | null }[]) {
      profileMap[p.id] = p;
    }

    return brokers.map((b: { id: string; user_id: string; company_name: string | null; created_at: string; updated_at: string }) => ({
      id: b.id,
      user_id: b.user_id,
      company_name: b.company_name,
      status: "active",
      created_at: b.created_at,
      updated_at: b.updated_at,
      user_email: profileMap[b.user_id]?.email,
      user_name: profileMap[b.user_id]?.full_name ?? undefined,
      homes_assessed: assessMap[b.id] ?? 0,
      leads_posted: leadMap[b.id]?.posted ?? 0,
      leads_closed: leadMap[b.id]?.closed ?? 0,
      revenue_earned: leadMap[b.id]?.revenue ?? 0,
      contractor_count: contMap[b.id]?.contractor ?? 0,
      hes_assessor_count: contMap[b.id]?.hes ?? 0,
      inspector_count: contMap[b.id]?.inspector ?? 0,
      last_activity: b.updated_at,
    })) as AdminBrokerSummary[];
  }

  // ──────────────────────────────────────────
  // HES TEAM
  // ──────────────────────────────────────────

  async getHesTeamMembers(): Promise<HesTeamMember[]> {
    const { data, error } = await supabaseAdmin
      .from("hes_team_members")
      .select("*")
      .order("name");
    if (error) throw new InternalError(error.message);
    return (data ?? []) as HesTeamMember[];
  }

  async createHesTeamMember(input: { name: string; email?: string; phone?: string; certifications?: string[]; service_areas?: string[] }): Promise<HesTeamMember> {
    const { data, error } = await supabaseAdmin
      .from("hes_team_members")
      .insert({
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        certifications: input.certifications ?? [],
        service_areas: input.service_areas ?? [],
      })
      .select()
      .single();
    if (error) throw new InternalError(error.message);
    return data as HesTeamMember;
  }

  async updateHesTeamMember(id: string, updates: Partial<HesTeamMember>): Promise<HesTeamMember> {
    const { id: _id, created_at: _ca, updated_at: _ua, ...safe } = updates as Record<string, unknown>;
    const { data, error } = await supabaseAdmin
      .from("hes_team_members")
      .update(safe)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new InternalError(error.message);
    return data as HesTeamMember;
  }

  async deleteHesTeamMember(id: string): Promise<void> {
    await supabaseAdmin.from("hes_schedule").delete().eq("team_member_id", id);
    const { error } = await supabaseAdmin.from("hes_team_members").delete().eq("id", id);
    if (error) throw new InternalError(error.message);
  }

  async getHesSchedule(startDate?: string, endDate?: string): Promise<HesScheduleEntry[]> {
    let query = supabaseAdmin
      .from("hes_schedule")
      .select("*, team_member:hes_team_members(*)")
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (startDate) query = query.gte("scheduled_date", startDate);
    if (endDate) query = query.lte("scheduled_date", endDate);

    const { data, error } = await query;
    if (error) throw new InternalError(error.message);
    return (data ?? []) as HesScheduleEntry[];
  }

  async createHesSchedule(input: {
    team_member_id?: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    scheduled_date: string;
    scheduled_time?: string;
    special_notes?: string;
    invoice_amount?: number;
  }): Promise<HesScheduleEntry> {
    const { data, error } = await supabaseAdmin
      .from("hes_schedule")
      .insert({
        team_member_id: input.team_member_id || null,
        customer_name: input.customer_name.trim(),
        customer_email: input.customer_email?.trim() || null,
        customer_phone: input.customer_phone?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || "OR",
        zip: input.zip?.trim() || null,
        scheduled_date: input.scheduled_date,
        scheduled_time: input.scheduled_time || null,
        special_notes: input.special_notes?.trim() || null,
        invoice_amount: input.invoice_amount ?? 200,
      })
      .select("*, team_member:hes_team_members(*)")
      .single();
    if (error) throw new InternalError(error.message);
    return data as HesScheduleEntry;
  }

  async updateHesSchedule(id: string, updates: Record<string, unknown>): Promise<HesScheduleEntry> {
    const { id: _id, created_at: _ca, updated_at: _ua, team_member: _tm, ...safe } = updates;
    if (safe.status === "completed" && !safe.completed_at) {
      safe.completed_at = new Date().toISOString();
    }
    const { data, error } = await supabaseAdmin
      .from("hes_schedule")
      .update(safe)
      .eq("id", id)
      .select("*, team_member:hes_team_members(*)")
      .single();
    if (error) throw new InternalError(error.message);
    return data as HesScheduleEntry;
  }

  async setHesTimeOff(id: string, periods: TimeOffPeriod[]): Promise<void> {
    const { error } = await supabaseAdmin
      .from("hes_team_members")
      .update({ time_off: periods })
      .eq("id", id);
    if (error) throw new InternalError(error.message);
  }

  async setInspectorTimeOff(id: string, periods: TimeOffPeriod[]): Promise<void> {
    const { error } = await supabaseAdmin
      .from("inspector_team_members")
      .update({ time_off: periods })
      .eq("id", id);
    if (error) throw new InternalError(error.message);
  }

  // ──────────────────────────────────────────
  // INSPECTOR TEAM
  // ──────────────────────────────────────────

  async getInspectorTeamMembers(): Promise<InspectorTeamMember[]> {
    const { data, error } = await supabaseAdmin
      .from("inspector_team_members")
      .select("*")
      .order("name");
    if (error) throw new InternalError(error.message);
    return (data ?? []) as InspectorTeamMember[];
  }

  async createInspectorTeamMember(input: { name: string; email?: string; phone?: string; license_number?: string; certifications?: string[]; service_areas?: string[] }): Promise<InspectorTeamMember> {
    const { data, error } = await supabaseAdmin
      .from("inspector_team_members")
      .insert({
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        license_number: input.license_number?.trim() || null,
        certifications: input.certifications ?? [],
        service_areas: input.service_areas ?? [],
      })
      .select()
      .single();
    if (error) throw new InternalError(error.message);
    return data as InspectorTeamMember;
  }

  async updateInspectorTeamMember(id: string, updates: Partial<InspectorTeamMember>): Promise<InspectorTeamMember> {
    const { id: _id, created_at: _ca, updated_at: _ua, ...safe } = updates as Record<string, unknown>;
    const { data, error } = await supabaseAdmin
      .from("inspector_team_members")
      .update(safe)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new InternalError(error.message);
    return data as InspectorTeamMember;
  }

  async deleteInspectorTeamMember(id: string): Promise<void> {
    await supabaseAdmin.from("inspector_schedule").delete().eq("team_member_id", id);
    const { error } = await supabaseAdmin.from("inspector_team_members").delete().eq("id", id);
    if (error) throw new InternalError(error.message);
  }

  async getInspectorSchedule(startDate?: string, endDate?: string): Promise<InspectorScheduleEntry[]> {
    let query = supabaseAdmin
      .from("inspector_schedule")
      .select("*, team_member:inspector_team_members(*)")
      .order("scheduled_date", { ascending: true })
      .order("scheduled_time", { ascending: true });

    if (startDate) query = query.gte("scheduled_date", startDate);
    if (endDate) query = query.lte("scheduled_date", endDate);

    const { data, error } = await query;
    if (error) throw new InternalError(error.message);
    return (data ?? []) as InspectorScheduleEntry[];
  }

  async createInspectorSchedule(input: {
    team_member_id?: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    inspection_type?: string;
    scheduled_date: string;
    scheduled_time?: string;
    special_notes?: string;
    invoice_amount?: number;
  }): Promise<InspectorScheduleEntry> {
    const { data, error } = await supabaseAdmin
      .from("inspector_schedule")
      .insert({
        team_member_id: input.team_member_id || null,
        customer_name: input.customer_name.trim(),
        customer_email: input.customer_email?.trim() || null,
        customer_phone: input.customer_phone?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || "OR",
        zip: input.zip?.trim() || null,
        inspection_type: input.inspection_type || "standard",
        scheduled_date: input.scheduled_date,
        scheduled_time: input.scheduled_time || null,
        special_notes: input.special_notes?.trim() || null,
        invoice_amount: input.invoice_amount ?? 400,
      })
      .select("*, team_member:inspector_team_members(*)")
      .single();
    if (error) throw new InternalError(error.message);
    return data as InspectorScheduleEntry;
  }

  async updateInspectorSchedule(id: string, updates: Record<string, unknown>): Promise<InspectorScheduleEntry> {
    const { id: _id, created_at: _ca, updated_at: _ua, team_member: _tm, ...safe } = updates;
    if (safe.status === "completed" && !safe.completed_at) {
      safe.completed_at = new Date().toISOString();
    }
    const { data, error } = await supabaseAdmin
      .from("inspector_schedule")
      .update(safe)
      .eq("id", id)
      .select("*, team_member:inspector_team_members(*)")
      .single();
    if (error) throw new InternalError(error.message);
    return data as InspectorScheduleEntry;
  }

  // ──────────────────────────────────────────
  // DIRECT LEADS
  // ──────────────────────────────────────────

  async getDirectLeads(status?: string): Promise<DirectLead[]> {
    let query = supabaseAdmin
      .from("direct_leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new InternalError(error.message);
    return (data ?? []) as DirectLead[];
  }

  async createDirectLead(input: {
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    service_needed?: string[];
    date_needed?: string;
    time_needed?: string;
    budget?: number;
    special_notes?: string;
    source?: string;
  }): Promise<DirectLead> {
    const { data, error } = await supabaseAdmin
      .from("direct_leads")
      .insert({
        customer_name: input.customer_name.trim(),
        customer_email: input.customer_email?.trim() || null,
        customer_phone: input.customer_phone?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || "OR",
        zip: input.zip?.trim() || null,
        service_needed: input.service_needed ?? [],
        date_needed: input.date_needed || null,
        time_needed: input.time_needed || null,
        budget: input.budget ?? null,
        special_notes: input.special_notes?.trim() || null,
        source: input.source || "direct",
      })
      .select()
      .single();
    if (error) throw new InternalError(error.message);
    return data as DirectLead;
  }

  async assignDirectLead(id: string, assignedType: string, assignedToId: string): Promise<DirectLead> {
    const { data, error } = await supabaseAdmin
      .from("direct_leads")
      .update({ assigned_type: assignedType, assigned_to_id: assignedToId, status: "assigned" })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new InternalError(error.message);
    return data as DirectLead;
  }

  async updateDirectLead(id: string, updates: Record<string, unknown>): Promise<DirectLead> {
    const { id: _id, created_at: _ca, updated_at: _ua, ...safe } = updates;
    if (safe.status === "completed" && !safe.completed_at) {
      safe.completed_at = new Date().toISOString();
    }
    const { data, error } = await supabaseAdmin
      .from("direct_leads")
      .update(safe)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new InternalError(error.message);
    return data as DirectLead;
  }

  // ──────────────────────────────────────────
  // PARTNER CONTRACTORS
  // ──────────────────────────────────────────

  async getPartnerContractors(status?: string): Promise<PartnerContractor[]> {
    let query = supabaseAdmin
      .from("partner_contractors")
      .select("*")
      .order("name");

    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new InternalError(error.message);
    return (data ?? []) as PartnerContractor[];
  }

  async createPartnerContractor(input: {
    name: string;
    email?: string;
    phone?: string;
    company_name?: string;
    partner_type?: string;
    service_types?: string[];
    service_areas?: string[];
    license_number?: string;
  }): Promise<PartnerContractor> {
    const { data, error } = await supabaseAdmin
      .from("partner_contractors")
      .insert({
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        company_name: input.company_name?.trim() || null,
        partner_type: input.partner_type ?? "contractor",
        service_types: input.service_types ?? [],
        service_areas: input.service_areas ?? [],
        license_number: input.license_number?.trim() || null,
      })
      .select()
      .single();
    if (error) throw new InternalError(error.message);
    return data as PartnerContractor;
  }

  async deletePartnerContractor(id: string): Promise<void> {
    // Delete associated dispatches first
    await supabaseAdmin.from("partner_dispatch").delete().eq("partner_id", id);
    const { error } = await supabaseAdmin.from("partner_contractors").delete().eq("id", id);
    if (error) throw new InternalError(error.message);
  }

  async updatePartnerContractor(id: string, updates: Partial<PartnerContractor>): Promise<PartnerContractor> {
    const { id: _id, created_at: _ca, updated_at: _ua, ...safe } = updates as Record<string, unknown>;
    const { data, error } = await supabaseAdmin
      .from("partner_contractors")
      .update(safe)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new InternalError(error.message);
    return data as PartnerContractor;
  }

  async getPartnerDispatches(partnerId?: string): Promise<PartnerDispatch[]> {
    let query = supabaseAdmin
      .from("partner_dispatch")
      .select("*, partner:partner_contractors(*), direct_lead:direct_leads(*)")
      .order("created_at", { ascending: false });

    if (partnerId) query = query.eq("partner_id", partnerId);

    const { data, error } = await query;
    if (error) throw new InternalError(error.message);
    return (data ?? []) as PartnerDispatch[];
  }

  async createPartnerDispatch(input: { partner_id: string; direct_lead_id: string; amount_owed?: number }): Promise<PartnerDispatch> {
    const { data, error } = await supabaseAdmin
      .from("partner_dispatch")
      .insert({
        partner_id: input.partner_id,
        direct_lead_id: input.direct_lead_id,
        amount_owed: input.amount_owed ?? 0,
      })
      .select("*, partner:partner_contractors(*), direct_lead:direct_leads(*)")
      .single();
    if (error) throw new InternalError(error.message);

    // Update direct lead status
    await supabaseAdmin
      .from("direct_leads")
      .update({ assigned_type: "partner", assigned_to_id: input.partner_id, status: "assigned" })
      .eq("id", input.direct_lead_id);

    return data as PartnerDispatch;
  }

  async updatePartnerDispatch(id: string, updates: Record<string, unknown>): Promise<PartnerDispatch> {
    const { id: _id, created_at: _ca, updated_at: _ua, partner: _p, direct_lead: _dl, ...safe } = updates;
    const { data, error } = await supabaseAdmin
      .from("partner_dispatch")
      .update(safe)
      .eq("id", id)
      .select("*, partner:partner_contractors(*), direct_lead:direct_leads(*)")
      .single();
    if (error) throw new InternalError(error.message);
    return data as PartnerDispatch;
  }

  // ──────────────────────────────────────────
  // BROKER HEALTH
  // ──────────────────────────────────────────

  calculateHealthScore(broker: AdminBrokerSummary): BrokerHealthScore {
    // Activity (30%): leads posted frequency
    let activity = 0;
    const posted = broker.leads_posted;
    if (posted >= 30) activity = 100;
    else if (posted >= 16) activity = 80;
    else if (posted >= 6) activity = 60;
    else if (posted >= 1) activity = 40;

    // Conversion (25%): leads closed / posted
    let conversion = 0;
    if (broker.leads_posted > 0) {
      const rate = (broker.leads_closed / broker.leads_posted) * 100;
      if (rate >= 50) conversion = 100;
      else if (rate >= 30) conversion = 85;
      else if (rate >= 20) conversion = 70;
      else if (rate >= 10) conversion = 50;
      else if (rate > 0) conversion = 30;
    }

    // Stickiness (20%): account age + recent activity
    let stickiness = 0;
    const lastAct = broker.last_activity ? new Date(broker.last_activity).getTime() : 0;
    const daysSinceActivity = lastAct ? (Date.now() - lastAct) / 86400_000 : 999;
    const accountAgeDays = (Date.now() - new Date(broker.created_at).getTime()) / 86400_000;

    if (daysSinceActivity <= 7 && accountAgeDays > 30) stickiness = 100;
    else if (daysSinceActivity <= 7) stickiness = 85;
    else if (daysSinceActivity <= 14) stickiness = 70;
    else if (daysSinceActivity <= 30) stickiness = 50;
    else stickiness = 20;

    // Network quality (15%): total network size + diversity
    let network_quality = 0;
    const networkTotal = broker.contractor_count + broker.hes_assessor_count + broker.inspector_count;
    const hasDiversity = (broker.contractor_count > 0 ? 1 : 0) + (broker.hes_assessor_count > 0 ? 1 : 0) + (broker.inspector_count > 0 ? 1 : 0);
    if (networkTotal >= 10 && hasDiversity >= 3) network_quality = 100;
    else if (networkTotal >= 6) network_quality = 80;
    else if (networkTotal >= 3) network_quality = 60;
    else if (networkTotal >= 1) network_quality = 40;

    // Revenue trend (10%): revenue earned
    let revenue_trend = 0;
    const rev = broker.revenue_earned;
    if (rev >= 5000) revenue_trend = 100;
    else if (rev >= 1000) revenue_trend = 85;
    else if (rev >= 500) revenue_trend = 70;
    else if (rev >= 100) revenue_trend = 50;
    else if (rev > 0) revenue_trend = 30;

    const overall = Math.round(
      activity * 0.3 + conversion * 0.25 + stickiness * 0.2 + network_quality * 0.15 + revenue_trend * 0.1
    );

    const risk_level: "low" | "medium" | "high" =
      overall >= 70 ? "low" : overall >= 40 ? "medium" : "high";

    return { overall, activity, conversion, stickiness, network_quality, revenue_trend, risk_level };
  }

  async getBrokersWithHealth(): Promise<BrokerHealthSummary[]> {
    const brokers = await this.getBrokers();
    return brokers.map((b) => ({
      ...b,
      health_score: this.calculateHealthScore(b),
    }));
  }

  async getBrokerHealthAudit(brokerId: string): Promise<BrokerHealthAudit> {
    // Fetch broker summary
    const allBrokers = await this.getBrokers();
    const broker = allBrokers.find((b) => b.id === brokerId);
    if (!broker) throw new InternalError("Broker not found");

    const health_score = this.calculateHealthScore(broker);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

    // Fetch broker leads for time-based metrics
    const [leads30, leads7, allLeads, contractorRows] = await Promise.all([
      supabaseAdmin
        .from("broker_leads")
        .select("id", { count: "exact" })
        .eq("broker_id", brokerId)
        .gte("created_at", thirtyDaysAgo),
      supabaseAdmin
        .from("broker_leads")
        .select("id", { count: "exact" })
        .eq("broker_id", brokerId)
        .gte("created_at", sevenDaysAgo),
      supabaseAdmin
        .from("broker_leads")
        .select("id, status, broker_commission, system_type, created_at, sold_at")
        .eq("broker_id", brokerId),
      supabaseAdmin
        .from("broker_contractors")
        .select("contractor_id, provider_type")
        .eq("broker_id", brokerId),
    ]);

    const leads = (allLeads.data ?? []) as { id: string; status: string; broker_commission: number | null; system_type: string | null; created_at: string; sold_at: string | null }[];

    // Avg days to close
    const closedLeads = leads.filter((l) => l.status === "closed" && l.sold_at);
    let avg_days_to_close = 0;
    if (closedLeads.length > 0) {
      const totalDays = closedLeads.reduce((sum, l) => {
        const created = new Date(l.created_at).getTime();
        const sold = new Date(l.sold_at!).getTime();
        return sum + Math.max(0, (sold - created) / 86400_000);
      }, 0);
      avg_days_to_close = Math.round(totalDays / closedLeads.length);
    }

    // Revenue by system type
    const typeMap: Record<string, { count: number; closed: number; revenue: number }> = {};
    for (const l of leads) {
      const t = l.system_type || "Other";
      if (!typeMap[t]) typeMap[t] = { count: 0, closed: 0, revenue: 0 };
      typeMap[t].count++;
      if (l.status === "closed") {
        typeMap[t].closed++;
        typeMap[t].revenue += l.broker_commission ?? 0;
      }
    }
    const revenue_by_type = Object.entries(typeMap).map(([type, v]) => ({ type, ...v }));

    // Contractor performance
    const cRows = (contractorRows.data ?? []) as { contractor_id: string; provider_type: string }[];
    const contractorIds = cRows.map((c) => c.contractor_id);
    const contractors: BrokerContractorPerformance[] = [];

    if (contractorIds.length > 0) {
      const { data: profiles } = await supabaseAdmin
        .from("app_profiles")
        .select("id, full_name, company_name")
        .in("id", contractorIds);

      const profileMap: Record<string, { full_name: string | null; company_name: string | null }> = {};
      for (const p of (profiles ?? []) as { id: string; full_name: string | null; company_name: string | null }[]) {
        profileMap[p.id] = p;
      }

      // Get leads per contractor (from contractor_leads sold_to_user_id)
      const { data: soldLeads } = await supabaseAdmin
        .from("contractor_leads")
        .select("sold_to_user_id, status")
        .in("sold_to_user_id", contractorIds);

      const soldMap: Record<string, { sent: number; closed: number }> = {};
      for (const sl of (soldLeads ?? []) as { sold_to_user_id: string; status: string }[]) {
        if (!soldMap[sl.sold_to_user_id]) soldMap[sl.sold_to_user_id] = { sent: 0, closed: 0 };
        soldMap[sl.sold_to_user_id].sent++;
        if (sl.status === "closed") soldMap[sl.sold_to_user_id].closed++;
      }

      for (const c of cRows) {
        const prof = profileMap[c.contractor_id];
        const stats = soldMap[c.contractor_id] ?? { sent: 0, closed: 0 };
        contractors.push({
          id: c.contractor_id,
          name: prof?.full_name || c.contractor_id,
          company_name: prof?.company_name || null,
          leads_sent: stats.sent,
          leads_closed: stats.closed,
          avg_rating: 0,
          provider_type: c.provider_type,
        });
      }
    }

    // Build alerts
    const alerts: { type: "success" | "warning" | "info"; message: string }[] = [];
    if (health_score.overall >= 80) {
      alerts.push({ type: "success", message: "Broker is performing well across all metrics" });
    }
    if (health_score.activity < 40) {
      alerts.push({ type: "warning", message: "Low activity — consider outreach to re-engage" });
    }
    if (health_score.conversion < 40 && broker.leads_posted > 5) {
      alerts.push({ type: "warning", message: "Low conversion rate — may need lead quality review" });
    }
    if (health_score.network_quality < 40) {
      alerts.push({ type: "info", message: "Small network — suggest expanding contractor base" });
    }
    if (broker.inspector_count === 0) {
      alerts.push({ type: "info", message: "No inspectors in network — opportunity to add" });
    }
    if (broker.hes_assessor_count === 0) {
      alerts.push({ type: "info", message: "No HES assessors in network — opportunity to add" });
    }
    const convRate = broker.leads_posted > 0 ? (broker.leads_closed / broker.leads_posted) * 100 : 0;
    if (convRate >= 30) {
      alerts.push({ type: "success", message: `Strong ${convRate.toFixed(0)}% conversion rate` });
    }

    return {
      broker,
      health_score,
      contractors,
      leads_last_30_days: leads30.count ?? 0,
      leads_last_7_days: leads7.count ?? 0,
      avg_days_to_close,
      revenue_by_type,
      alerts,
    };
  }
}
