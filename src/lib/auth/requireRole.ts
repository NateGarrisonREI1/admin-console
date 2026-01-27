import { redirect } from "next/navigation";
import type { AppRole } from "./role";

type Portal = "broker" | "contractor" | "homeowner" | "affiliate";

const ROLE_TO_PORTAL: Record<AppRole, Portal | "admin"> = {
  admin: "admin",
  broker: "broker",
  contractor: "contractor",
  homeowner: "homeowner",
  affiliate: "affiliate",
};

export function requirePortalRole(
  role: AppRole,
  portal: Portal
) {
  const allowed = ROLE_TO_PORTAL[role] === portal;

  if (!allowed) {
    // Redirect them to THEIR dashboard
    switch (role) {
      case "admin":
        redirect("/admin");
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
