import { getPortalUser } from "../actions";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getPortalUser();
  return <SettingsClient user={user} />;
}
