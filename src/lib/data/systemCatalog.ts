import { supabaseServer } from "../supabase/server";

export async function listSystems(args?: {
  systemType?: string;
  activeOnly?: boolean;
  search?: string;
}) {
  const supabase = await supabaseServer();

  let q = supabase
    .from("system_catalog")
    .select("id, display_name, system_type, is_active")
    .order("system_type", { ascending: true })
    .order("display_name", { ascending: true });

  if (args?.systemType) q = q.eq("system_type", args.systemType);
  if (args?.activeOnly) q = q.eq("is_active", true);
  if (args?.search) q = q.ilike("display_name", `%${args.search}%`);

  const { data, error } = await q;

  if (error) {
    console.error(error);
    throw new Error("Failed to load systems");
  }

  return data ?? [];
}

export async function listSystemTypes() {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("system_catalog")
    .select("system_type");

  if (error) {
    console.error(error);
    throw new Error("Failed to load system types");
  }

  const types = Array.from(
    new Set((data ?? []).map((r) => r.system_type).filter(Boolean))
  ) as string[];

  types.sort();
  return types;
}

