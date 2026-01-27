function s(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export function mapUpgradeToTypeKey(args: {
  feature_key?: string;
  title?: string;
  display_name?: string;
  intent_key?: string;
}): string | null {
  const blob = [s(args.feature_key), s(args.intent_key), s(args.title), s(args.display_name)]
    .join(" ")
    .toLowerCase()
    .trim();

  if (!blob) return null;

  if (blob.includes("air seal") || blob.includes("air sealing")) return "air_sealing";
  if (blob.includes("attic") || blob.includes("insulation")) return "insulation";
  if (blob.includes("water heater")) return "water_heating";
  if (blob.includes("heat pump") || blob.includes("heating")) return "heating";
  if (blob.includes("air conditioner") || blob.includes("cooling") || blob.includes("ac")) return "cooling";
  if (blob.includes("duct")) return "ducts";
  if (blob.includes("window")) return "windows";
  if (blob.includes("solar")) return "solar";

  return "other";
}
