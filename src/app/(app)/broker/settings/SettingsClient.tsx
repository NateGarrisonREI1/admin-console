"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Broker } from "@/types/broker";
import { updateBrokerProfile } from "./actions";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#f1f5f9",
  fontSize: 13,
  fontWeight: 600,
  outline: "none",
};

export default function SettingsClient(props: { broker: Broker }) {
  const { broker } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState(broker.company_name ?? "");
  const [phone, setPhone] = useState(broker.phone ?? "");
  const [email, setEmail] = useState(broker.email ?? "");
  const [bio, setBio] = useState(broker.bio ?? "");
  const [serviceAreas, setServiceAreas] = useState((broker.service_areas ?? []).join(", "));

  const [hvacPrice, setHvacPrice] = useState(String(broker.default_hvac_price ?? 50));
  const [solarPrice, setSolarPrice] = useState(String(broker.default_solar_price ?? 100));
  const [waterPrice, setWaterPrice] = useState(String(broker.default_water_price ?? 30));
  const [electricalPrice, setElectricalPrice] = useState(String(broker.default_electrical_price ?? 75));
  const [insulationPrice, setInsulationPrice] = useState(String(broker.default_insulation_price ?? 60));
  const [commissionSplit, setCommissionSplit] = useState(String(broker.commission_split_percent ?? 30));

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function saveProfile() {
    startTransition(async () => {
      await updateBrokerProfile({
        company_name: companyName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        bio: bio.trim() || undefined,
        service_areas: serviceAreas.split(",").map((s) => s.trim()).filter(Boolean),
      });
      showToast("Profile saved.");
      router.refresh();
    });
  }

  function savePricing() {
    startTransition(async () => {
      await updateBrokerProfile({
        default_hvac_price: Number(hvacPrice) || 50,
        default_solar_price: Number(solarPrice) || 100,
        default_water_price: Number(waterPrice) || 30,
        default_electrical_price: Number(electricalPrice) || 75,
        default_insulation_price: Number(insulationPrice) || 60,
        commission_split_percent: Number(commissionSplit) || 30,
      });
      showToast("Pricing saved.");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9" }}>Settings</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Manage your broker profile and pricing</div>
      </div>

      {toast && (
        <div
          style={{
            borderRadius: 8,
            border: "1px solid rgba(16,185,129,0.25)",
            background: "rgba(16,185,129,0.08)",
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 600,
            color: "#10b981",
          }}
        >
          {toast}
        </div>
      )}

      {/* Profile Section */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Company Profile</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "span 2" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Company Name</div>
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your Realty Group" style={{ ...INPUT_STYLE, marginTop: 4 }} />
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone</div>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(503) 555-1234" style={{ ...INPUT_STYLE, marginTop: 4 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="broker@company.com" style={{ ...INPUT_STYLE, marginTop: 4 }} />
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Service Areas</div>
            <input value={serviceAreas} onChange={(e) => setServiceAreas(e.target.value)} placeholder="Portland, Lake Oswego, Beaverton" style={{ ...INPUT_STYLE, marginTop: 4 }} />
            <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>Comma-separated cities or ZIP codes</div>
          </div>

          <div style={{ gridColumn: "span 2" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Bio</div>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell contractors about your brokerage..." rows={3} style={{ ...INPUT_STYLE, marginTop: 4, resize: "vertical" }} />
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={pending}
            onClick={saveProfile}
            className="admin-btn-primary"
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, opacity: pending ? 0.5 : 1 }}
          >
            Save Profile
          </button>
        </div>
      </div>

      {/* Pricing Section */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>Network Pricing</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>Default lead prices by system type and your commission split</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <PriceInput label="HVAC Lead Price" value={hvacPrice} onChange={setHvacPrice} />
          <PriceInput label="Solar Lead Price" value={solarPrice} onChange={setSolarPrice} />
          <PriceInput label="Water Heater Lead Price" value={waterPrice} onChange={setWaterPrice} />
          <PriceInput label="Electrical Lead Price" value={electricalPrice} onChange={setElectricalPrice} />
          <PriceInput label="Insulation Lead Price" value={insulationPrice} onChange={setInsulationPrice} />

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Commission Split (%)</div>
            <input value={commissionSplit} onChange={(e) => setCommissionSplit(e.target.value)} placeholder="30" style={{ ...INPUT_STYLE, marginTop: 4 }} />
            <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>% of lead price you keep as commission</div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={pending}
            onClick={savePricing}
            className="admin-btn-primary"
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, opacity: pending ? 0.5 : 1 }}
          >
            Save Pricing
          </button>
        </div>
      </div>

      {/* Coming Soon Sections */}
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>Branding &amp; White Label</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Custom colors, logo, and domain settings</div>
        <div
          style={{
            marginTop: 12,
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid rgba(16,185,129,0.25)",
            background: "rgba(16,185,129,0.08)",
            fontSize: 12,
            fontWeight: 600,
            color: "#10b981",
          }}
        >
          Coming in v2 — Custom branding, white-label domains, and email templates
        </div>
      </div>

      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>Billing &amp; Payouts</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Payment method, payout schedule, tax information</div>
        <div
          style={{
            marginTop: 12,
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid rgba(16,185,129,0.25)",
            background: "rgba(16,185,129,0.08)",
            fontSize: 12,
            fontWeight: 600,
            color: "#10b981",
          }}
        >
          Coming in v2 — Stripe Connect payouts, invoice history, and tax ID management
        </div>
      </div>

      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>Integrations</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>RMLS, CRM, and email integrations</div>
        <div
          style={{
            marginTop: 12,
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid rgba(16,185,129,0.25)",
            background: "rgba(16,185,129,0.08)",
            fontSize: 12,
            fontWeight: 600,
            color: "#10b981",
          }}
        >
          Coming in v2 — RMLS Connect, Salesforce/HubSpot CRM, email signature templates
        </div>
      </div>
    </div>
  );
}

function PriceInput(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{props.label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>$</span>
        <input
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          type="number"
          min="0"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #334155",
            background: "#1e293b",
            color: "#f1f5f9",
            fontSize: 13,
            fontWeight: 600,
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}
