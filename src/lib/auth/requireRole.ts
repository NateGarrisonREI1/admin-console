import { redirect } from "next/navigation";
import type { AppRole } from "./role";

type Portal = "broker" | "contractor" | "homeowner" | "affiliate" | "rei-team";

const ROLE_TO_PORTAL: Record<AppRole, Portal | "admin"> = {
  admin: "admin",
  rei_staff: "rei-team",
  broker: "broker",
  contractor: "contractor",
  homeowner: "homeowner",
  affiliate: "affiliate",
};

export function requirePortalRole(
  role: AppRole,
  portal: Portal
) {
  // Admins can access any portal
  if (role === "admin") return;

  const allowed = ROLE_TO_PORTAL[role] === portal;

  if (!allowed) {
    // Redirect them to THEIR dashboard
    switch (role) {
      case "rei_staff":
        redirect("/rei-team/dashboard");
      case "broker":
        redirect("/broker/dashboard");
      case "contractor":
        redirect("/contractor/dashboard");
      case "affiliate":
        redirect("/affiliate/dashboard");
      default:
        redirect("/homeowner/dashboard");
    }
  }
}
