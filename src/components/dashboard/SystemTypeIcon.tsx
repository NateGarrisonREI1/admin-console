"use client";

import { FireIcon, SunIcon, BoltIcon } from "@heroicons/react/24/outline";
import type { SystemType } from "@/types/schema";

const CONFIG: Record<SystemType, { icon: typeof FireIcon; label: string; color: string; bg: string }> = {
  hvac:         { icon: FireIcon,  label: "HVAC",         color: "text-orange-600", bg: "bg-orange-50" },
  solar:        { icon: SunIcon,   label: "Solar",        color: "text-amber-600",  bg: "bg-amber-50" },
  water_heater: { icon: BoltIcon,  label: "Water Heater", color: "text-blue-600",   bg: "bg-blue-50" },
};

type Props = {
  type: SystemType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export default function SystemTypeIcon({ type, size = "md", showLabel = false, className = "" }: Props) {
  const config = CONFIG[type] ?? CONFIG.hvac;
  const Icon = config.icon;
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const padClass = size === "sm" ? "p-1.5" : size === "lg" ? "p-2.5" : "p-2";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className={`rounded-lg ${config.bg} ${padClass}`}>
        <Icon className={`${sizeClass} ${config.color}`} />
      </div>
      {showLabel && (
        <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
      )}
    </div>
  );
}

export function systemTypeLabel(type: SystemType): string {
  return CONFIG[type]?.label ?? type;
}
