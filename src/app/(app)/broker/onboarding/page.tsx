export const dynamic = "force-dynamic";

import { fetchBrokerOnboardingData } from "./actions";
import BrokerOnboardingClient from "./BrokerOnboardingClient";

export default async function BrokerOnboardingPage() {
  const profile = await fetchBrokerOnboardingData();
  return <BrokerOnboardingClient profile={profile} />;
}
