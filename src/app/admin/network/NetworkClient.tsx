// src/app/admin/network/NetworkClient.tsx
"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { NetworkData, NetworkPartner, MemberType, PlatformUser } from "./actions";
import {
  searchPlatformUsers,
  addPlatformUserToNetwork,
  inviteToNetwork,
  updateNetworkPartner,
  removeNetworkPartner,
} from "./actions";

// ─── Tab Config ─────────────────────────────────────────────────────────────

type TabConfig = {
  key: MemberType;
  label: string;
  singularLabel: string;
  accent: string;
  browseLabel: string;
  browseDesc: string;
  inviteLabel: string;
  inviteDesc: string;
  showServiceTypes: boolean;
  icon: "contractor" | "hes" | "inspector";
};

const TABS: TabConfig[] = [
  {
    key: "contractor",
    label: "Contractors",
    singularLabel: "Contractor",
    accent: "#8b5cf6",
    browseLabel: "+ Add to Network",
    browseDesc: "Browse contractors on the platform and add them to your network",
    inviteLabel: "Invite Contractor",
    inviteDesc: "Invite a new contractor to join the REI platform",
    showServiceTypes: true,
    icon: "contractor",
  },
  {
    key: "hes_assessor",
    label: "HES Assessors",
    singularLabel: "HES Assessor",
    accent: "#10b981",
    browseLabel: "+ Add HES Assessor",
    browseDesc: "Browse HES assessors on the platform and add them to your network",
    inviteLabel: "Invite HES Assessor",
    inviteDesc: "Invite a new HES assessor to join the platform",
    showServiceTypes: false,
    icon: "hes",
  },
  {
    key: "inspector",
    label: "Home Inspectors",
    singularLabel: "Inspector",
    accent: "#f59e0b",
    browseLabel: "+ Add Inspector",
    browseDesc: "Browse inspectors on the platform and add them to your network",
    inviteLabel: "Invite Inspector",
    inviteDesc: "Invite a new inspector to join the platform",
    showServiceTypes: false,
    icon: "inspector",
  },
];

// ─── Constants ──────────────────────────────────────────────────────────────

const SERVICE_TYPE_LABELS: Record<string, string> = {
  hvac: "HVAC",
  solar: "Solar",
  water_heater: "Water Heater",
  electrical: "Electrical",
  plumbing: "Plumbing",
  general_handyman: "Handyman",
};

const MEMBER_TYPE_FRIENDLY: Record<MemberType, string> = {
  contractor: "contractor",
  hes_assessor: "HES assessor",
  inspector: "home inspector",
};

const SERVICE_AREAS = ["Portland Metro", "Salem", "Eugene", "Bend", "Medford", "Corvallis"];
const TRADE_OPTIONS = [
  { value: "hvac", label: "HVAC" },
  { value: "solar", label: "Solar" },
  { value: "water_heater", label: "Water Heater" },
  { value: "electrical", label: "Electrical" },
  { value: "insulation", label: "Insulation" },
  { value: "plumbing", label: "Plumbing" },
];

// ─── Styles ─────────────────────────────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#1e293b",
  color: "#f1f5f9",
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#94a3b8",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  display: "block",
  marginBottom: 6,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "active":
      return { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" };
    case "paused":
      return { background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)" };
    case "pending_invite":
      return { background: "rgba(234,179,8,0.12)", color: "#facc15", border: "1px solid rgba(234,179,8,0.25)" };
    case "removed":
      return { background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" };
    default:
      return { background: "rgba(148,163,184,0.12)", color: "#94a3b8", border: "1px solid rgba(148,163,184,0.25)" };
  }
}

function formatStatus(status: string): string {
  if (status === "pending_invite") return "Pending Invite";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        ...getStatusStyle(status),
      }}
    >
      {formatStatus(status)}
    </span>
  );
}

function ServiceTypePill({ label, color }: { label: string; color?: string }) {
  const c = color ?? "#a78bfa";
  const bg = color ? `${color}1e` : "rgba(139,92,246,0.12)";
  const border = color ? `${color}40` : "rgba(139,92,246,0.25)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        background: bg,
        color: c,
        border: `1px solid ${border}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function getUserDisplayName(u: PlatformUser): string {
  return (
    u.full_name ||
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    u.email ||
    "Unknown"
  );
}

// ─── Tab Icon SVGs ──────────────────────────────────────────────────────────

function TabIcon({ type, color }: { type: TabConfig["icon"]; color: string }) {
  if (type === "contractor") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M13 7a3 3 0 11-6 0 3 3 0 016 0zM4 17a6 6 0 0112 0" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 8v4M14 10h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "hes") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="4" width="14" height="12" rx="2" stroke={color} strokeWidth="1.8" />
        <path d="M7 8h6M7 11h4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="11" r="1" fill={color} />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M4 10l3 3 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="3" width="16" height="14" rx="3" stroke={color} strokeWidth="1.8" />
    </svg>
  );
}

// ─── Drawer Shell ───────────────────────────────────────────────────────────

function DrawerShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99990 }}>
      <button type="button" aria-label="Close" onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", border: "none", cursor: "default" }} />
      <div style={{
        position: "absolute", right: 0, top: 0, height: "100%", width: "100%", maxWidth: 480,
        display: "flex", flexDirection: "column", background: "#0f172a", borderLeft: "1px solid #334155",
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderBottom: "1px solid #334155", padding: "16px 20px", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{title}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>
          </div>
          <button type="button" onClick={onClose} style={{ padding: "6px 12px", borderRadius: 8, fontSize: 12, background: "transparent", color: "#94a3b8", border: "none", cursor: "pointer", flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f1f5f9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
          >Close</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {children}
        </div>
        {footer && (
          <div style={{ borderTop: "1px solid #334155", padding: "16px 20px", flexShrink: 0 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Filter Pill ─────────────────────────────────────────────────────────────

function FilterPill({ label, selected, color, onClick }: {
  label: string; selected: boolean; color?: string; onClick: () => void;
}) {
  const c = color ?? "#10b981";
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: "4px 11px", borderRadius: 9999, fontSize: 11, fontWeight: 600, cursor: "pointer",
        background: selected ? `${c}22` : "transparent",
        color: selected ? c : "#64748b",
        border: selected ? `1px solid ${c}44` : "1px solid #334155",
        transition: "all 0.15s", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ─── Browse Panel (Add to Network) ──────────────────────────────────────────

function BrowsePanel({
  open,
  tabConfig,
  onClose,
  onAdded,
}: {
  open: boolean;
  tabConfig: TabConfig;
  onClose: () => void;
  onAdded: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setAddingId(null);
      setSelectedAreas([]);
      setSelectedTrades([]);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timer = setTimeout(() => {
      searchPlatformUsers(query, {
        areas: selectedAreas.length > 0 ? selectedAreas : undefined,
        trades: selectedTrades.length > 0 ? selectedTrades : undefined,
      }).then((users) => {
        setResults(users);
        setLoading(false);
      });
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query, open, selectedAreas, selectedTrades]);

  function toggleArea(area: string) {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  function toggleTrade(trade: string) {
    setSelectedTrades((prev) =>
      prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade]
    );
  }

  async function handleAdd(user: PlatformUser) {
    setAddingId(user.id);
    const res = await addPlatformUserToNetwork({
      userId: user.id,
      memberType: tabConfig.key,
    });
    if (res.success) {
      setResults((prev) => prev.filter((u) => u.id !== user.id));
      onAdded(res.name || getUserDisplayName(user));
    }
    setAddingId(null);
  }

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title="Add to Network"
      subtitle={`Browse ${tabConfig.label.toLowerCase()} on the platform`}
    >
      <div style={{ padding: "16px 20px 0", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Area filter pills */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Service Area
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            <FilterPill label="All Areas" selected={selectedAreas.length === 0} color="#06b6d4"
              onClick={() => setSelectedAreas([])} />
            {SERVICE_AREAS.map((area) => (
              <FilterPill key={area} label={area} selected={selectedAreas.includes(area)} color="#06b6d4"
                onClick={() => toggleArea(area)} />
            ))}
          </div>
        </div>

        {/* Trade filter pills (contractors tab only) */}
        {tabConfig.showServiceTypes && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Trade / Service Type
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              <FilterPill label="All Trades" selected={selectedTrades.length === 0} color={tabConfig.accent}
                onClick={() => setSelectedTrades([])} />
              {TRADE_OPTIONS.map(({ value, label }) => (
                <FilterPill key={value} label={label} selected={selectedTrades.includes(value)} color={tabConfig.accent}
                  onClick={() => toggleTrade(value)} />
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ position: "relative" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, company, email..."
            style={{ ...INPUT_STYLE, padding: "12px 12px 12px 36px" }}
          />
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 20px" }}>
        {loading ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "#475569", fontSize: 13 }}>
            Searching...
          </div>
        ) : results.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "#475569", fontSize: 13, lineHeight: 1.6 }}>
            No matching {tabConfig.label.toLowerCase()} found on the platform.
            <br />
            Use <span style={{ color: "#94a3b8", fontWeight: 600 }}>Invite</span> to bring them onboard.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {results.map((user) => {
              const name = getUserDisplayName(user);
              const isAdding = addingId === user.id;
              return (
                <div key={user.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                  background: "#1e293b", border: "1px solid #334155", borderRadius: 10,
                  transition: "border-color 0.15s",
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: 9999, background: "#334155",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    fontSize: 14, fontWeight: 700, color: "#94a3b8", marginTop: 2,
                  }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.company_name || name}
                    </div>
                    {user.company_name && user.company_name !== name && (
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{name}</div>
                    )}
                    {user.email && (
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.email}
                      </div>
                    )}
                    {/* Service types + areas pills */}
                    {(user.service_types.length > 0 || user.service_areas.length > 0) && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {user.service_types.map((st) => (
                          <ServiceTypePill key={st} label={SERVICE_TYPE_LABELS[st] ?? st} color={tabConfig.accent} />
                        ))}
                        {user.service_areas.map((area) => (
                          <ServiceTypePill key={area} label={area} color="#06b6d4" />
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => handleAdd(user)} disabled={isAdding}
                    style={{
                      padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600, flexShrink: 0,
                      background: isAdding ? "rgba(16,185,129,0.15)" : "transparent",
                      color: "#10b981",
                      border: "1px solid rgba(16,185,129,0.4)",
                      cursor: isAdding ? "not-allowed" : "pointer",
                      opacity: isAdding ? 0.6 : 1,
                      transition: "background 0.15s", marginTop: 2,
                    }}
                    onMouseEnter={(e) => { if (!isAdding) e.currentTarget.style.background = "rgba(16,185,129,0.12)"; }}
                    onMouseLeave={(e) => { if (!isAdding) e.currentTarget.style.background = "transparent"; }}
                  >
                    {isAdding ? "Adding..." : "+ Add"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

// ─── Invite Panel ───────────────────────────────────────────────────────────

function InvitePanel({
  open,
  tabConfig,
  onClose,
  onInvited,
}: {
  open: boolean;
  tabConfig: TabConfig;
  onClose: () => void;
  onInvited: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) { setEmail(""); setName(""); setMessage(""); setError(""); }
  }, [open]);

  function handleSend() {
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setError("");

    startTransition(async () => {
      try {
        const res = await inviteToNetwork({
          email: email.trim(),
          name: name.trim() || undefined,
          memberType: tabConfig.key,
        });
        if (!res.success) throw new Error(res.error);

        // Open mailto
        const friendlyType = MEMBER_TYPE_FRIENDLY[tabConfig.key];
        const greeting = name.trim() ? `Hi ${name.trim()},` : "Hi,";
        const signupUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "";
        const bodyParts = [
          greeting,
          "",
          `You've been invited to join the Renewable Energy Incentives platform as a ${friendlyType}.`,
          "",
          `Create your account here: ${signupUrl}`,
        ];
        if (message.trim()) {
          bodyParts.push("", message.trim());
        }
        bodyParts.push("", "Best,", "REI Team");

        const mailtoUrl = `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(
          "You've been invited to join REI's contractor network"
        )}&body=${encodeURIComponent(bodyParts.join("\n"))}`;

        window.open(mailtoUrl, "_blank");
        onInvited(email.trim());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An error occurred.");
      }
    });
  }

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={`Invite ${tabConfig.singularLabel}`}
      subtitle={`Send an email invite to join the REI platform`}
      footer={
        <button type="button" onClick={handleSend} disabled={pending}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 8, fontSize: 14, fontWeight: 700,
            background: pending ? "rgba(16,185,129,0.4)" : "#10b981",
            color: "#fff", border: "none", cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.7 : 1, transition: "background 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
          onMouseEnter={(e) => { if (!pending) e.currentTarget.style.background = "#059669"; }}
          onMouseLeave={(e) => { if (!pending) e.currentTarget.style.background = "#10b981"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          {pending ? "Sending..." : "Send Invite"}
        </button>
      }
    >
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={LABEL_STYLE}>Email <span style={{ color: "#f87171" }}>*</span></label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="contractor@email.com" style={INPUT_STYLE} />
        </div>
        <div>
          <label style={LABEL_STYLE}>Name <span style={{ color: "#475569", fontWeight: 500, textTransform: "none" }}>(optional)</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="For the email greeting" style={INPUT_STYLE} />
        </div>
        <div>
          <label style={LABEL_STYLE}>Personal Message <span style={{ color: "#475569", fontWeight: 500, textTransform: "none" }}>(optional)</span></label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
            placeholder="Add a note to include in the invite email"
            style={{ ...INPUT_STYLE, resize: "vertical", minHeight: 72, lineHeight: 1.5 }} />
        </div>
        <div style={{
          display: "flex", gap: 10, padding: "14px 14px", borderRadius: 8,
          background: "rgba(30,41,59,0.5)", border: "1px solid rgba(51,65,85,0.5)",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
          </svg>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            The {MEMBER_TYPE_FRIENDLY[tabConfig.key]} will receive an email with a link to create their account on REI.
            Once they complete onboarding, they&apos;ll automatically appear in your network with their full profile details.
          </div>
        </div>
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", fontSize: 12, fontWeight: 600 }}>
            {error}
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

// ─── Edit Modal (status + notes only) ───────────────────────────────────────

function EditModal({
  open,
  partner,
  onClose,
  onSuccess,
}: {
  open: boolean;
  partner: NetworkPartner | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open && partner) {
      setStatus(partner.status);
      setNotes(partner.notes ?? "");
      setError("");
    }
  }, [open, partner]);

  function handleSave() {
    startTransition(async () => {
      try {
        if (!partner) return;
        const res = await updateNetworkPartner({
          id: partner.id,
          status,
          notes,
        });
        if (!res.success) throw new Error(res.error);
        onSuccess();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An error occurred.");
      }
    });
  }

  if (!open || !partner) return null;

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={`Edit ${partner.company_name || partner.name}`}
      subtitle="Update status and notes for this network member."
      footer={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: "12px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600, background: "#334155", color: "#f1f5f9", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#475569"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#334155"; }}
          >Cancel</button>
          <button type="button" onClick={handleSave} disabled={pending}
            style={{
              flex: 1, padding: "12px 16px", borderRadius: 8, fontSize: 14, fontWeight: 700,
              background: pending ? "rgba(16,185,129,0.4)" : "#10b981",
              color: "#fff", border: "none", cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.7 : 1,
            }}
            onMouseEnter={(e) => { if (!pending) e.currentTarget.style.background = "#059669"; }}
            onMouseLeave={(e) => { if (!pending) e.currentTarget.style.background = "#10b981"; }}
          >{pending ? "Saving..." : "Save Changes"}</button>
        </div>
      }
    >
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Display info */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 14 }}>{partner.company_name || partner.name}</div>
          {partner.company_name && partner.name && partner.name !== partner.company_name && (
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{partner.name}</div>
          )}
          {partner.email && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{partner.email}</div>}
          {partner.phone && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{partner.phone}</div>}
        </div>

        <div>
          <label style={LABEL_STYLE}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={INPUT_STYLE}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </div>

        <div>
          <label style={LABEL_STYLE}>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Optional notes..."
            style={{ ...INPUT_STYLE, resize: "vertical", minHeight: 72, lineHeight: 1.5 }} />
        </div>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171", fontSize: 12, fontWeight: 600 }}>
            {error}
          </div>
        )}
      </div>
    </DrawerShell>
  );
}

// ─── Confirm Remove Dialog ──────────────────────────────────────────────────

function ConfirmRemoveDialog({
  open, partnerName, actionLabel, onClose, onConfirm, pending,
}: {
  open: boolean; partnerName: string; actionLabel: string;
  onClose: () => void; onConfirm: () => void; pending: boolean;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99995, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button type="button" aria-label="Close" onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.60)", border: "none", cursor: "default" }} />
      <div style={{ position: "relative", background: "#0f172a", border: "1px solid #334155", borderRadius: 16, padding: "28px 28px 24px", maxWidth: 380, width: "90%", boxShadow: "0 25px 60px rgba(0,0,0,0.55)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>{actionLabel}</div>
        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, marginBottom: 24 }}>
          Are you sure you want to remove <span style={{ color: "#f1f5f9", fontWeight: 600 }}>{partnerName}</span> from your network? This action cannot be undone.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: "#334155", color: "#f1f5f9", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#475569"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#334155"; }}
          >Cancel</button>
          <button type="button" onClick={onConfirm} disabled={pending}
            style={{ padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: pending ? "rgba(248,113,113,0.3)" : "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.35)", cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.7 : 1 }}>
            {pending ? "Removing..." : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NetworkClient({ data }: { data: NetworkData }) {
  const router = useRouter();
  const partners = data.partners;

  const [activeTab, setActiveTab] = useState<MemberType>("contractor");
  const currentTabConfig = TABS.find((t) => t.key === activeTab)!;

  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const [browseOpen, setBrowseOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const [editTarget, setEditTarget] = useState<NetworkPartner | null>(null);
  const [removeTarget, setRemoveTarget] = useState<NetworkPartner | null>(null);
  const [removePending, startRemoveTransition] = useTransition();

  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setServiceFilter("all");
    setStatusFilter("active");
  }, [activeTab]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function handleConfirmRemove() {
    if (!removeTarget) return;
    startRemoveTransition(async () => {
      try {
        await removeNetworkPartner(removeTarget.id);
        setRemoveTarget(null);
        setToast(removeTarget.status === "pending_invite" ? "Invite cancelled." : "Partner removed.");
        router.refresh();
      } catch { /* silently fail */ }
    });
  }

  function handleResendInvite(p: NetworkPartner) {
    const friendlyType = MEMBER_TYPE_FRIENDLY[p.member_type];
    const greeting = p.name && p.name !== p.email ? `Hi ${p.name},` : "Hi,";
    const signupUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "";
    const body = [greeting, "", `You've been invited to join the Renewable Energy Incentives platform as a ${friendlyType}.`, "", `Create your account here: ${signupUrl}`, "", "Best,", "REI Team"].join("\n");
    const mailtoUrl = `mailto:${encodeURIComponent(p.email || "")}?subject=${encodeURIComponent("You've been invited to join REI's contractor network")}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
    setToast(`Invite resent to ${p.email}`);
  }

  const tabProviders = partners.filter((p) => p.member_type === activeTab);

  const filtered = tabProviders.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (serviceFilter !== "all" && !p.services.includes(serviceFilter)) return false;
    return true;
  });

  const totalActive = tabProviders.filter((p) => p.status === "active").length;
  const totalPaused = tabProviders.filter((p) => p.status === "paused").length;

  const countByType: Record<MemberType, number> = {
    contractor: partners.filter((p) => p.member_type === "contractor").length,
    hes_assessor: partners.filter((p) => p.member_type === "hes_assessor").length,
    inspector: partners.filter((p) => p.member_type === "inspector").length,
  };

  const colHeaders = ["Name", "Contact"];
  if (currentTabConfig.showServiceTypes) colHeaders.push("Service Types");
  colHeaders.push("Status", "Actions");

  return (
    <>
      <div style={{ padding: 24 }}>
        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 100000,
            borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600,
            border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.08)", color: "#10b981",
          }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0, letterSpacing: "-0.01em" }}>
            My Network
          </h1>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0", fontWeight: 500 }}>
            Manage your contractors, HES assessors, and home inspectors.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #334155", marginBottom: 20 }}>
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer", background: "transparent", border: "none",
                  borderBottom: isActive ? `2px solid ${tab.accent}` : "2px solid transparent",
                  color: isActive ? tab.accent : "#64748b", transition: "all 0.15s", marginBottom: -1,
                }}
              >
                <TabIcon type={tab.icon} color={isActive ? tab.accent : "#64748b"} />
                {tab.label}
                {countByType[tab.key] > 0 && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 20, height: 20,
                    borderRadius: 10, fontSize: 11, fontWeight: 700, padding: "0 6px",
                    background: isActive ? `${tab.accent}22` : "rgba(100,116,139,0.15)",
                    color: isActive ? tab.accent : "#64748b",
                  }}>
                    {countByType[tab.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Cards — Browse + Invite for all tabs */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setBrowseOpen(true)}
            style={{
              background: `linear-gradient(135deg, ${currentTabConfig.accent}14, ${currentTabConfig.accent}06)`,
              border: `1px solid ${currentTabConfig.accent}44`, borderRadius: 12, padding: "20px 24px",
              cursor: "pointer", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 16,
              flex: 1, minWidth: 280, maxWidth: 420, transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${currentTabConfig.accent}1a`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <span style={{
              width: 40, height: 40, borderRadius: 10, background: `${currentTabConfig.accent}1a`,
              border: `1px solid ${currentTabConfig.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <TabIcon type={currentTabConfig.icon} color={currentTabConfig.accent} />
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: currentTabConfig.accent }}>{currentTabConfig.browseLabel}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, lineHeight: 1.4 }}>{currentTabConfig.browseDesc}</div>
            </div>
          </button>

          <button type="button" onClick={() => setInviteOpen(true)}
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.14), rgba(16,185,129,0.06))",
              border: "1px solid rgba(16,185,129,0.44)", borderRadius: 12, padding: "20px 24px",
              cursor: "pointer", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 16,
              flex: 1, minWidth: 280, maxWidth: 420, transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(16,185,129,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <span style={{
              width: 40, height: 40, borderRadius: 10, background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.44)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#10b981" }}>{currentTabConfig.inviteLabel}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, lineHeight: 1.4 }}>{currentTabConfig.inviteDesc}</div>
            </div>
          </button>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: `Total ${currentTabConfig.label}`, value: tabProviders.length },
            { label: "Active", value: totalActive, color: "#10b981" },
            { label: "Paused", value: totalPaused, color: "#fbbf24" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: color ?? "#f1f5f9" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {currentTabConfig.showServiceTypes && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginRight: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Service</label>
              <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}
                style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}>
                <option value="all">All Services</option>
                {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginRight: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer" }}>
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="pending_invite">Pending Invite</option>
            </select>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#475569", fontWeight: 600 }}>
            {filtered.length} {currentTabConfig.label.toLowerCase()}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #334155", background: "rgba(15,23,42,0.5)" }}>
                  {colHeaders.map((col, i) => (
                    <th key={col} style={{
                      padding: "11px 16px", textAlign: i === colHeaders.length - 1 ? "right" : "left",
                      fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap",
                    }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={colHeaders.length} style={{ padding: "48px 24px", textAlign: "center", color: "#475569", fontSize: 13, fontWeight: 500 }}>
                      {tabProviders.length === 0
                        ? `No ${currentTabConfig.label.toLowerCase()} in your network yet. Use "Add to Network" or "Invite" to get started.`
                        : `No ${currentTabConfig.label.toLowerCase()} match the current filters.`}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p, idx) => {
                    const isPending = p.status === "pending_invite";
                    return (
                      <tr key={p.id}
                        style={{ background: idx % 2 === 0 ? "#0f172a" : "#111827", borderBottom: "1px solid #1e293b", transition: "background 0.1s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#1a2744"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? "#0f172a" : "#111827"; }}
                      >
                        {/* Name */}
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 13 }}>
                            {isPending && !p.company_name && p.name === p.email
                              ? p.email
                              : p.company_name || p.name}
                          </div>
                          {!isPending && p.company_name && p.name && p.name !== p.company_name && (
                            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{p.name}</div>
                          )}
                          {p.notes && (
                            <div style={{ fontSize: 11, color: "#475569", marginTop: 2, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.notes}>
                              {p.notes}
                            </div>
                          )}
                        </td>

                        {/* Contact */}
                        <td style={{ padding: "12px 16px" }}>
                          {p.email && <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>{p.email}</div>}
                          {p.phone && <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{p.phone}</div>}
                          {!p.email && !p.phone && <span style={{ color: "#334155", fontSize: 12 }}>—</span>}
                        </td>

                        {/* Service Types (contractors) */}
                        {currentTabConfig.showServiceTypes && (
                          <td style={{ padding: "12px 16px" }}>
                            {isPending ? (
                              <span style={{ color: "#334155", fontSize: 12 }}>—</span>
                            ) : (
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {p.services.length === 0 ? (
                                  <span style={{ color: "#334155", fontSize: 12 }}>—</span>
                                ) : p.services.map((s) => (
                                  <ServiceTypePill key={s} label={SERVICE_TYPE_LABELS[s] ?? s} color={currentTabConfig.accent} />
                                ))}
                              </div>
                            )}
                          </td>
                        )}

                        {/* Status */}
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                          <StatusPill status={p.status} />
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            {isPending ? (
                              <>
                                <button type="button" onClick={() => handleResendInvite(p)}
                                  style={{ padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", cursor: "pointer" }}>
                                  Resend Invite
                                </button>
                                <button type="button" onClick={() => setRemoveTarget(p)}
                                  style={{ padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", cursor: "pointer" }}>
                                  Cancel Invite
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => setEditTarget(p)}
                                  style={{ padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, background: "#334155", color: "#cbd5e1", border: "1px solid #475569", cursor: "pointer" }}>
                                  Edit
                                </button>
                                <button type="button" onClick={() => setRemoveTarget(p)}
                                  style={{ padding: "5px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)", cursor: "pointer" }}>
                                  Remove
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Panels */}
      <BrowsePanel
        open={browseOpen}
        tabConfig={currentTabConfig}
        onClose={() => setBrowseOpen(false)}
        onAdded={(name) => {
          setToast(`${name} added to your network`);
          router.refresh();
        }}
      />

      <InvitePanel
        open={inviteOpen}
        tabConfig={currentTabConfig}
        onClose={() => setInviteOpen(false)}
        onInvited={(email) => {
          setInviteOpen(false);
          setToast(`Invite sent to ${email}`);
          router.refresh();
        }}
      />

      <EditModal
        open={editTarget !== null}
        partner={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          setEditTarget(null);
          setToast("Partner updated.");
          router.refresh();
        }}
      />

      <ConfirmRemoveDialog
        open={removeTarget !== null}
        partnerName={removeTarget?.company_name || removeTarget?.name || ""}
        actionLabel={removeTarget?.status === "pending_invite" ? "Cancel Invite" : `Remove ${currentTabConfig.singularLabel}`}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleConfirmRemove}
        pending={removePending}
      />
    </>
  );
}
