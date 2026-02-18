// src/app/(app)/contractor/profile/page.tsx
export const dynamic = "force-dynamic";

import { fetchContractorProfile } from "../_actions/contractor";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const profile = await fetchContractorProfile();

  if (!profile) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 24, color: "#ef4444" }}>
          Unable to load profile. Please sign in as a contractor.
        </div>
      </div>
    );
  }

  return <ProfileClient profile={profile} />;
}
