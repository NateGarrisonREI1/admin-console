"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Broker, BrokerContact } from "@/types/broker";
import { createCampaignAction, sendCampaignAction } from "../actions";

// ─── Design tokens ──────────────────────────────────────────────────────────
const BG_PAGE = "#0f172a";
const BG_CARD = "#1e293b";
const BORDER = "#334155";
const RADIUS = 16;
const TEXT_PRIMARY = "#f1f5f9";
const TEXT_SECONDARY = "#cbd5e1";
const TEXT_MUTED = "#94a3b8";
const TEXT_DIM = "#64748b";
const ACCENT_EMERALD = "#10b981";

// ─── Default message ────────────────────────────────────────────────────────
const DEFAULT_MESSAGE = `I hope you're doing well! I wanted to share something that could save you money and improve your home's comfort.

I've prepared a personalized home energy assessment for you through our new program. It's completely free and shows you exactly which upgrades make the most sense for your home.

In just 5 minutes, you'll get:
- A personalized energy efficiency score
- Upgrade recommendations tailored to your home
- Estimated savings for each upgrade
- Available incentives and rebates

Let me know if you have any questions!`;

// ─── Filter categories ──────────────────────────────────────────────────────
type ContactFilter = "all" | "past_customer" | "current_listing" | "custom";

const FILTER_LABELS: Record<ContactFilter, string> = {
  all: "All Contacts",
  past_customer: "Past Customers",
  current_listing: "Current Listings",
  custom: "Custom Selection",
};

// ─── Props ──────────────────────────────────────────────────────────────────
type Props = {
  broker: Broker;
  contacts: BrokerContact[];
};

// ─── Wizard Steps ───────────────────────────────────────────────────────────
const STEPS = ["Select Recipients", "Customize Message", "Review & Send"];

export default function NewCampaignClient({ broker, contacts }: Props) {
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // Step 1: Recipients
  const [campaignName, setCampaignName] = useState("");
  const [filter, setFilter] = useState<ContactFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Step 2: Message
  const [subject, setSubject] = useState(
    "Your Home Energy Assessment is Ready",
  );
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  // Filtered contacts based on filter type
  const filteredContacts = useMemo(() => {
    if (filter === "all" || filter === "custom") return contacts;
    return contacts.filter((c) => c.status === filter);
  }, [contacts, filter]);

  // Contact count per filter
  const filterCounts = useMemo(() => {
    const all = contacts.length;
    const past = contacts.filter((c) => c.status === "past_customer").length;
    const listing = contacts.filter(
      (c) => c.status === "current_listing",
    ).length;
    return {
      all,
      past_customer: past,
      current_listing: listing,
      custom: all,
    };
  }, [contacts]);

  // When switching to a non-custom filter, auto-select all matching contacts
  function handleFilterChange(f: ContactFilter) {
    setFilter(f);
    if (f === "custom") return;
    const matching =
      f === "all"
        ? contacts
        : contacts.filter((c) => c.status === f);
    setSelectedIds(new Set(matching.map((c) => c.id)));
  }

  function toggleContact(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  }

  // ── Navigation ──
  function canNext(): boolean {
    if (step === 0) return campaignName.trim().length > 0 && selectedIds.size > 0;
    if (step === 1) return subject.trim().length > 0;
    return true;
  }

  // ── Save as draft ──
  async function handleSaveDraft() {
    setSavingDraft(true);
    try {
      await createCampaignAction({
        name: campaignName.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      router.push("/broker/campaigns");
    } catch {
      setSavingDraft(false);
    }
  }

  // ── Send campaign ──
  async function handleSend() {
    setSending(true);
    try {
      const campaign = await createCampaignAction({
        name: campaignName.trim(),
        subject: subject.trim(),
        message: message.trim(),
      });
      if (!campaign) {
        setSending(false);
        return;
      }
      await sendCampaignAction(campaign.id, Array.from(selectedIds));
      router.push(`/broker/campaigns/${campaign.id}`);
    } catch {
      setSending(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Back link ── */}
      <button
        type="button"
        onClick={() => router.push("/broker/campaigns")}
        style={{
          background: "none",
          border: "none",
          color: TEXT_MUTED,
          fontSize: 13,
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 500,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M9 2L4 7l5 5"
            stroke={TEXT_MUTED}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to Campaigns
      </button>

      {/* ── Header ── */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          letterSpacing: "-0.02em",
          margin: 0,
        }}
      >
        New Campaign
      </h1>

      {/* ── Step Indicator ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
        }}
      >
        {STEPS.map((label, i) => {
          const isActive = i === step;
          const isDone = i < step;
          const circleColor = isDone
            ? ACCENT_EMERALD
            : isActive
              ? ACCENT_EMERALD
              : TEXT_DIM;
          const circleBg = isDone ? ACCENT_EMERALD : "transparent";

          return (
            <div
              key={label}
              style={{ display: "flex", alignItems: "center", gap: 0 }}
            >
              {/* Step circle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: circleBg,
                    border: `2px solid ${circleColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    color: isDone ? "#fff" : circleColor,
                    flexShrink: 0,
                  }}
                >
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 7l3 3 5-6"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? TEXT_PRIMARY : TEXT_MUTED,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </span>
              </div>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    width: 48,
                    height: 2,
                    background: i < step ? ACCENT_EMERALD : BORDER,
                    margin: "0 12px",
                    borderRadius: 1,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step Content ── */}
      <div
        style={{
          background: BG_CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS,
          padding: 28,
        }}
      >
        {step === 0 && (
          <StepRecipients
            campaignName={campaignName}
            setCampaignName={setCampaignName}
            filter={filter}
            onFilterChange={handleFilterChange}
            filterCounts={filterCounts}
            filteredContacts={filteredContacts}
            selectedIds={selectedIds}
            toggleContact={toggleContact}
            toggleSelectAll={toggleSelectAll}
          />
        )}
        {step === 1 && (
          <StepMessage
            subject={subject}
            setSubject={setSubject}
            message={message}
            setMessage={setMessage}
            brokerName={broker.company_name ?? "Your Name"}
          />
        )}
        {step === 2 && (
          <StepReview
            campaignName={campaignName}
            recipientCount={selectedIds.size}
            subject={subject}
            message={message}
            brokerName={broker.company_name ?? "Your Name"}
          />
        )}
      </div>

      {/* ── Footer Buttons ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              style={{
                background: "transparent",
                color: TEXT_SECONDARY,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Back
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {step === 2 && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || sending}
              style={{
                background: "transparent",
                color: TEXT_SECONDARY,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 600,
                cursor: savingDraft ? "not-allowed" : "pointer",
                opacity: savingDraft ? 0.6 : 1,
              }}
            >
              {savingDraft ? "Saving..." : "Save as Draft"}
            </button>
          )}
          {step < 2 && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              style={{
                background: canNext() ? ACCENT_EMERALD : TEXT_DIM,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 700,
                cursor: canNext() ? "pointer" : "not-allowed",
                opacity: canNext() ? 1 : 0.5,
                transition: "opacity 0.15s",
              }}
            >
              Next
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || savingDraft}
              style={{
                background: ACCENT_EMERALD,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 700,
                cursor: sending ? "not-allowed" : "pointer",
                opacity: sending ? 0.6 : 1,
                transition: "opacity 0.15s",
              }}
            >
              {sending ? "Sending..." : "Send Campaign"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 1: Select Recipients
// ═════════════════════════════════════════════════════════════════════════════

function StepRecipients({
  campaignName,
  setCampaignName,
  filter,
  onFilterChange,
  filterCounts,
  filteredContacts,
  selectedIds,
  toggleContact,
  toggleSelectAll,
}: {
  campaignName: string;
  setCampaignName: (v: string) => void;
  filter: ContactFilter;
  onFilterChange: (f: ContactFilter) => void;
  filterCounts: Record<ContactFilter, number>;
  filteredContacts: BrokerContact[];
  selectedIds: Set<string>;
  toggleContact: (id: string) => void;
  toggleSelectAll: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Campaign name */}
      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: TEXT_MUTED,
            display: "block",
            marginBottom: 6,
          }}
        >
          Campaign Name *
        </label>
        <input
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="e.g. Spring 2026 Energy Savings"
          style={{
            width: "100%",
            background: BG_PAGE,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 14,
            color: TEXT_PRIMARY,
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = ACCENT_EMERALD;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = BORDER;
          }}
        />
      </div>

      {/* Filter pills */}
      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: TEXT_MUTED,
            display: "block",
            marginBottom: 8,
          }}
        >
          Contact Filter
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(Object.keys(FILTER_LABELS) as ContactFilter[]).map((f) => {
            const active = f === filter;
            return (
              <button
                key={f}
                type="button"
                onClick={() => onFilterChange(f)}
                style={{
                  background: active ? ACCENT_EMERALD + "22" : "transparent",
                  color: active ? ACCENT_EMERALD : TEXT_MUTED,
                  border: `1px solid ${active ? ACCENT_EMERALD + "66" : BORDER}`,
                  borderRadius: 20,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s",
                }}
              >
                {FILTER_LABELS[f]}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: active ? ACCENT_EMERALD : TEXT_DIM,
                    background: active ? ACCENT_EMERALD + "18" : BORDER + "88",
                    borderRadius: 10,
                    padding: "1px 7px",
                  }}
                >
                  {filterCounts[f]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contact list */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED }}>
            {selectedIds.size} of {filteredContacts.length} selected
          </span>
          <button
            type="button"
            onClick={toggleSelectAll}
            style={{
              background: "none",
              border: "none",
              color: ACCENT_EMERALD,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {selectedIds.size === filteredContacts.length
              ? "Deselect All"
              : "Select All"}
          </button>
        </div>

        <div
          style={{
            maxHeight: 320,
            overflowY: "auto",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
          }}
        >
          {filteredContacts.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: TEXT_MUTED,
                fontSize: 13,
              }}
            >
              No contacts found. Add contacts first to create a campaign.
            </div>
          ) : (
            filteredContacts.map((c, i) => {
              const checked = selectedIds.has(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleContact(c.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    cursor: "pointer",
                    borderBottom:
                      i < filteredContacts.length - 1
                        ? `1px solid ${BORDER}44`
                        : "none",
                    background: checked ? ACCENT_EMERALD + "08" : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: `2px solid ${checked ? ACCENT_EMERALD : BORDER}`,
                      background: checked ? ACCENT_EMERALD : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.1s",
                    }}
                  >
                    {checked && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2.5 6l2.5 2.5 4.5-5"
                          stroke="#fff"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  {/* Avatar */}
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      background: ACCENT_EMERALD + "22",
                      border: `1px solid ${ACCENT_EMERALD}44`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      color: ACCENT_EMERALD,
                      flexShrink: 0,
                    }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Info */}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: TEXT_PRIMARY,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: TEXT_DIM,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.email ?? "No email"}
                    </div>
                  </div>
                  {/* Status badge */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: TEXT_DIM,
                      background: BORDER + "88",
                      borderRadius: 10,
                      padding: "2px 8px",
                      flexShrink: 0,
                    }}
                  >
                    {c.status.replace(/_/g, " ")}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 2: Customize Message
// ═════════════════════════════════════════════════════════════════════════════

function StepMessage({
  subject,
  setSubject,
  message,
  setMessage,
  brokerName,
}: {
  subject: string;
  setSubject: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  brokerName: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: TEXT_MUTED,
            display: "block",
            marginBottom: 6,
          }}
        >
          Subject Line
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject line"
          style={{
            width: "100%",
            background: BG_PAGE,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 14,
            color: TEXT_PRIMARY,
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = ACCENT_EMERALD;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = BORDER;
          }}
        />
      </div>

      <div>
        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: TEXT_MUTED,
            display: "block",
            marginBottom: 6,
          }}
        >
          Message Body
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={14}
          style={{
            width: "100%",
            background: BG_PAGE,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 13,
            color: TEXT_PRIMARY,
            outline: "none",
            resize: "vertical",
            lineHeight: 1.6,
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = ACCENT_EMERALD;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = BORDER;
          }}
        />
      </div>

      <div
        style={{
          background: BG_PAGE,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: TEXT_DIM,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Preview
        </div>
        <div
          style={{
            fontSize: 13,
            color: TEXT_SECONDARY,
            lineHeight: 1.6,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <strong style={{ color: TEXT_PRIMARY }}>From:</strong>{" "}
            {brokerName} via LEAF Energy
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong style={{ color: TEXT_PRIMARY }}>Subject:</strong> {subject}
          </div>
          <div
            style={{
              borderTop: `1px solid ${BORDER}`,
              paddingTop: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            Hi [Recipient Name],{"\n\n"}
            {message}
            {"\n\n"}
            <span style={{ color: TEXT_DIM, fontStyle: "italic" }}>
              -- This assessment was prepared for you by {brokerName} through
              the LEAF Home Energy Program.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 3: Review & Send
// ═════════════════════════════════════════════════════════════════════════════

function StepReview({
  campaignName,
  recipientCount,
  subject,
  message,
  brokerName,
}: {
  campaignName: string;
  recipientCount: number;
  subject: string;
  message: string;
  brokerName: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: TEXT_PRIMARY,
        }}
      >
        Review Your Campaign
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
        }}
      >
        <SummaryCard label="Campaign" value={campaignName} />
        <SummaryCard
          label="Recipients"
          value={`${recipientCount} contact${recipientCount !== 1 ? "s" : ""}`}
        />
        <SummaryCard label="Subject" value={subject} />
      </div>

      {/* Message preview */}
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: TEXT_MUTED,
            marginBottom: 8,
          }}
        >
          Message Preview
        </div>
        <div
          style={{
            background: BG_PAGE,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "16px 18px",
            fontSize: 13,
            color: TEXT_SECONDARY,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          Hi [Recipient Name],{"\n\n"}
          {message}
          {"\n\n"}
          <span style={{ color: TEXT_DIM, fontStyle: "italic" }}>
            -- This assessment was prepared for you by {brokerName} through the
            LEAF Home Energy Program.
          </span>
        </div>
      </div>

      {/* Confirmation note */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          background: ACCENT_EMERALD + "12",
          border: `1px solid ${ACCENT_EMERALD}33`,
          borderRadius: 10,
          padding: "14px 16px",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          style={{ flexShrink: 0, marginTop: 1 }}
        >
          <circle cx="9" cy="9" r="8" stroke={ACCENT_EMERALD} strokeWidth="1.5" />
          <path
            d="M9 5v4M9 12h.01"
            stroke={ACCENT_EMERALD}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <div style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: 1.5 }}>
          This campaign will send a personalized email to each recipient with
          a link to their home energy assessment. You can track opens,
          clicks, and completions in real time.
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: BG_PAGE,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: TEXT_DIM,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: TEXT_PRIMARY,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}
