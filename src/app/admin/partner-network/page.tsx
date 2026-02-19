import { redirect } from "next/navigation";

export default function PartnerNetworkPage() {
  redirect("/admin/team?tab=partners");
}
