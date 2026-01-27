import Link from "next/link";
import { PhoneIcon, EnvelopeIcon, MapPinIcon, PencilSquareIcon } from "@heroicons/react/24/outline"; // Assuming Heroicons; install if needed: npm i @heroicons/react

function mapsHref(address: string) {
  const q = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function smsHref(phone: string, body: string) {
  const p = phone.replace(/[^\d+]/g, "");
  return `sms:${p}?&body=${encodeURIComponent(body)}`;
}

function fieldLabel(label: string) {
  return <label className="block text-xs font-bold opacity-65 mb-1">{label}</label>;
}

function row(label: string, value: React.ReactNode) {
  return (
    <div className="flex justify-between items-center gap-3 text-sm">
      <span className="font-semibold opacity-65">{label}</span>
      <span className="text-right opacity-92">{value}</span>
    </div>
  );
}

export default function ContextRail(props: {
  job: any;
  addr: string;
  broker: any;
  client: any;
  neededBy: string;
  listingStatus: string;
  brokerNotes: string;
  saveContactsAction: (formData: FormData) => Promise<void>;
}) {
  const { job, addr, broker, client, neededBy, listingStatus, brokerNotes, saveContactsAction } = props;

  const brokerName = broker?.name || "";
  const brokerEmail = broker?.email || "";
  const brokerPhone = broker?.phone || "";
  const brokerBrokerage = broker?.brokerage || "";

  const clientName = client?.name || "";
  const clientEmail = client?.email || "";
  const clientPhone = client?.phone || "";

  const smsTemplate = `REI — quick update on ${addr || "your property"} (code ${job.confirmation_code || "—"}).`;

  const hasBroker = Boolean(brokerName.trim()) || Boolean(brokerEmail.trim()) || Boolean(brokerPhone.trim());
  const hasClient = Boolean(clientName.trim()) || Boolean(clientEmail.trim()) || Boolean(clientPhone.trim());

  return (
    <div className="grid gap-4">
      <div className="bg-white shadow-md rounded-xl p-4 border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-start flex-wrap gap-2">
          <h3 className="font-bold text-lg">Context</h3>
          <div className="text-xs opacity-65">
            Needed by: <span className="font-semibold">{neededBy || "—"}</span> • Listing:{" "}
            <span className="font-semibold">{listingStatus || "—"}</span>
          </div>
        </div>

        {/* Property */}
        <div className="mt-4">
          <h4 className="text-sm font-bold opacity-65">Property</h4>
          <p className="mt-1 font-semibold text-base truncate" title={addr || ""}>
            {addr || "—"}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 items-center text-sm opacity-90">
            {addr ? (
              <a
                href={mapsHref(addr)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 underline hover:text-blue-600"
              >
                <MapPinIcon className="h-4 w-4" />
                Maps
              </a>
            ) : null}
            <Link
              href="/intake/broker"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 underline hover:text-blue-600"
            >
              <PencilSquareIcon className="h-4 w-4" />
              View intake ↗
            </Link>
            <span className="opacity-60">
              Code: <code className="font-mono">{job.confirmation_code || "—"}</code>
            </span>
          </div>
        </div>

        {/* Contact cards */}
        <div className="mt-6 grid gap-4">
          {/* Broker */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="font-bold text-base mb-2">Broker</h4>
            <div className="grid gap-2">
              {row("Name", brokerName || "—")}
              {row(
                "Email",
                brokerEmail ? (
                  <a
                    href={`mailto:${brokerEmail}`}
                    className="flex items-center gap-1 underline hover:text-blue-600"
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    {brokerEmail}
                  </a>
                ) : (
                  "—"
                )
              )}
              {row(
                "Phone",
                brokerPhone ? (
                  <div className="flex items-center gap-2 justify-end flex-wrap">
                    <a
                      href={`tel:${brokerPhone}`}
                      className="flex items-center gap-1 underline hover:text-blue-600"
                    >
                      <PhoneIcon className="h-4 w-4" />
                      {brokerPhone}
                    </a>
                    <span className="opacity-55">•</span>
                    <a href={smsHref(brokerPhone, smsTemplate)} className="underline hover:text-blue-600">
                      Text
                    </a>
                  </div>
                ) : (
                  "—"
                )
              )}
              {row("Brokerage", brokerBrokerage || "—")}
            </div>
          </div>

          {/* Client */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="font-bold text-base mb-2">Client</h4>
            <div className="grid gap-2">
              {row("Name", clientName || "—")}
              {row(
                "Email",
                clientEmail ? (
                  <a
                    href={`mailto:${clientEmail}`}
                    className="flex items-center gap-1 underline hover:text-blue-600"
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    {clientEmail}
                  </a>
                ) : (
                  "—"
                )
              )}
              {row(
                "Phone",
                clientPhone ? (
                  <div className="flex items-center gap-2 justify-end flex-wrap">
                    <a
                      href={`tel:${clientPhone}`}
                      className="flex items-center gap-1 underline hover:text-blue-600"
                    >
                      <PhoneIcon className="h-4 w-4" />
                      {clientPhone}
                    </a>
                    <span className="opacity-55">•</span>
                    <a href={smsHref(clientPhone, smsTemplate)} className="underline hover:text-blue-600">
                      Text
                    </a>
                  </div>
                ) : (
                  "—"
                )
              )}
            </div>
          </div>

          {/* Inline editor */}
          <div className="border border-gray-200 rounded-lg p-3">
            <details>
              <summary className="cursor-pointer font-bold user-select-none flex items-center justify-between gap-2">
                <span>{hasBroker || hasClient ? "Edit contacts" : "Add broker/client info"}</span>
                <span className="text-xs opacity-65">Save to intake_payload</span>
              </summary>
              <form action={saveContactsAction} className="mt-3 grid gap-4">
                <h5 className="text-xs font-bold opacity-75">Broker</h5>
                <div className="grid gap-2">
                  <div>
                    {fieldLabel("Broker name")}
                    <input
                      name="broker_name"
                      defaultValue={brokerName}
                      className="w-full rounded-lg border border-slate-200/80 px-3 py-2 text-sm outline-none bg-white focus:border-blue-500"
                      placeholder="John Smith"
                    />
                  </div>
                  <div>
                    {fieldLabel("Broker email")}
                    <input
                      name="broker_email"
                      defaultValue={brokerEmail}
                      className="w-full rounded-lg border border-slate-200/80 px-3 py-2 text-sm outline-none bg-white focus:border-blue-500"
                      placeholder="john@broker.com"
                      type="email"
                    />
                  </div>
                  <div>
                    {fieldLabel("Broker phone")}
                    <input
                      name="broker_phone"
                      defaultValue={brokerPhone}
                      className="w-full rounded-lg border border-slate-200/80 px-3 py-2 text-sm outline-none bg-white focus:border-blue-500"
                      placeholder="(503) 555-1234"
                      type="tel"
                    />
                  </div>
                  <div>
                    {fieldLabel("Brokerage")}
                    <input
                      name="broker_brokerage"
                      defaultValue={brokerBrokerage}
                      className="w-full rounded-lg border border-slate-200/80 px-3 py-2 text-sm outline-none bg-white focus:border-blue-500"
                      placeholder="ABC Realty"
                    />
                  </div>
                </div>
                <h5 className="text-xs font-bold opacity-75">Client</h5>
                <div className="grid gap-2">
                  <div>
                    {fieldLabel("Client name")}
                    <input
                      name="client_name"
                      defaultValue={clientName}
                      className="w-full rounded-lg border border-slate-200/80 px-3 py-2 text-sm outline-none bg-white focus:border-blue-500"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    {fieldLabel("Client email")}
                    <input
                      name="client_email"
                      defaultValue={clientEmail}
                      className="w-full rounded-lg border border-slate-200/80 px-3 py-2 text-sm outline-none bg-white focus:border-blue-500"
                      placeholder="jane@email.com"
                      type="email"
                    />
                  </div>
                  <div>
                    {fieldLabel("Client phone")}
                    <input
                      name="client_phone"
                      defaultValue={clientPhone}
                      className="w-full rounded-lg border border-slate-200/80 px-3 py-2 text-sm outline-none bg-white focus:border-blue-500"
                      placeholder="(503) 555-9876"
                      type="tel"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-blue-700 transition"
                  >
                    Save contacts
                  </button>
                </div>
              </form>
            </details>
          </div>

          {/* Notes */}
          <div className="border border-gray-200 rounded-lg p-3">
            <h4 className="font-bold text-base mb-2">Broker Notes</h4>
            <p className="text-sm opacity-90 whitespace-pre-wrap">{brokerNotes || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}