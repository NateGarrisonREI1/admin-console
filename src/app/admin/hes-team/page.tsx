// src/app/admin/hes-team/page.tsx — redirect to unified team page
import { redirect } from "next/navigation";

export default function HesTeamRedirect() {
  redirect("/admin/team?tab=hes");
}
