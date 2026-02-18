// src/app/admin/inspector-team/page.tsx — redirect to unified team page
import { redirect } from "next/navigation";

export default function InspectorTeamRedirect() {
  redirect("/admin/team?tab=inspectors");
}
