"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  CheckCircleIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  ClipboardDocumentIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { QRCodeSVG } from "qrcode.react";
import ActivityLog from "@/components/ui/ActivityLog";
import {
  fetchJobDetail,
  updateJobStatus,
  addJobNote,
  getJobActivity,
  type PortalJobDetail,
} from "../../actions";
import type { ActivityLogEntry } from "@/lib/activityLog";

// ─── Helpers ────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string | null): string {
  if (!time) return "TBD";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function fullAddress(job: PortalJobDetail): string {
  return [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
}

function mapsUrl(job: PortalJobDetail): string {
  return `https://maps.google.com/?q=${encodeURIComponent(fullAddress(job))}`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " PST";
}

function stripePaymentUrl(paymentId: string | null, isTest: boolean): string | null {
  if (!paymentId) return null;
  const base = isTest
    ? "https://dashboard.stripe.com/test/payments"
    : "https://dashboard.stripe.com/payments";
  return `${base}/${paymentId}`;
}

// ─── Status transition config ───────────────────────────────────────

type StatusAction = {
  nextStatus: string;
  label: string;
  icon: "truck" | "mapPin" | "wrench" | "check";
  bg: string;
  border: string;
  color: string;
};

const STATUS_ACTIONS: Record<string, StatusAction> = {
  scheduled: {
    nextStatus: "en_route",
    label: "I'm On My Way",
    icon: "truck",
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.4)",
    color: "#60a5fa",
  },
  pending: {
    nextStatus: "en_route",
    label: "I'm On My Way",
    icon: "truck",
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.4)",
    color: "#60a5fa",
  },
  confirmed: {
    nextStatus: "en_route",
    label: "I'm On My Way",
    icon: "truck",
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.4)",
    color: "#60a5fa",
  },
  rescheduled: {
    nextStatus: "en_route",
    label: "I'm On My Way",
    icon: "truck",
    bg: "rgba(59,130,246,0.15)",
    border: "rgba(59,130,246,0.4)",
    color: "#60a5fa",
  },
  en_route: {
    nextStatus: "on_site",
    label: "I've Arrived",
    icon: "mapPin",
    bg: "rgba(16,185,129,0.15)",
    border: "rgba(16,185,129,0.4)",
    color: "#10b981",
  },
  on_site: {
    nextStatus: "in_progress",
    label: "Start Job",
    icon: "wrench",
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.4)",
    color: "#f59e0b",
  },
  // in_progress → handled by payment flow, not a direct status action
};

const STATUS_DISPLAY: Record<string, { bg: string; text: string; label: string }> = {
  scheduled: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", label: "Scheduled" },
  pending: { bg: "rgba(148,163,184,0.15)", text: "#94a3b8", label: "Pending" },
  confirmed: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", label: "Confirmed" },
  rescheduled: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "Rescheduled" },
  en_route: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", label: "En Route" },
  on_site: { bg: "rgba(16,185,129,0.15)", text: "#10b981", label: "On Site" },
  in_progress: { bg: "rgba(245,158,11,0.15)", text: "#f59e0b", label: "In Progress" },
  completed: { bg: "rgba(16,185,129,0.15)", text: "#10b981", label: "Completed" },
};

const SERVICE_BORDER: Record<string, string> = {
  hes: "#10b981",
  inspector: "#f59e0b",
};

function ActionIcon({ icon, size = 18 }: { icon: StatusAction["icon"]; size?: number }) {
  const s = { width: size, height: size };
  switch (icon) {
    case "truck": return <TruckIcon style={s} />;
    case "mapPin": return <MapPinIcon style={s} />;
    case "wrench": return <WrenchScrewdriverIcon style={s} />;
    case "check": return <CheckCircleIcon style={s} />;
  }
}

// ─── Payment flow types ─────────────────────────────────────────────

type PaymentStep = null | "confirm" | "generating" | "collecting" | "success" | "timeout" | "error";

const POLL_INTERVAL = 5000;
const POLL_TIMEOUT = 5 * 60 * 1000; // 5 minutes

// ─── Component ──────────────────────────────────────────────────────

export default function JobDetailClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<PortalJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [activityEntries, setActivityEntries] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Payment flow state
  const [paymentStep, setPaymentStep] = useState<PaymentStep>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const loadJob = useCallback(async () => {
    const data = await fetchJobDetail(jobId);
    setJob(data);
    setLoading(false);
  }, [jobId]);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const entries = await getJobActivity(jobId);
      setActivityEntries(entries);
    } catch {
      setActivityEntries([]);
    } finally {
      setActivityLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadJob();
    loadActivity();
  }, [loadJob, loadActivity]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // ─── Normal status transitions (non-payment) ──────────────────────

  async function handleStatusTransition() {
    if (!job || actionBusy) return;
    const action = STATUS_ACTIONS[job.status];
    if (!action) return;

    setActionBusy(true);
    const res = await updateJobStatus(jobId, action.nextStatus);
    if (res.success) {
      showToast(`Status updated: ${action.label}`);
      await loadJob();
      await loadActivity();
    } else {
      showToast(res.error || "Failed to update status.");
    }
    setActionBusy(false);
  }

  // ─── Payment flow handlers ────────────────────────────────────────

  function handleCompleteJobTap() {
    setPaymentStep("confirm");
    setPaymentError(null);
  }

  function handleCancelPayment() {
    setPaymentStep(null);
    setPaymentUrl(null);
    setPaymentError(null);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleCollectPayment() {
    setPaymentStep("generating");
    setPaymentError(null);

    try {
      const res = await fetch("/api/stripe/create-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPaymentError(data.error || "Failed to create payment link.");
        setPaymentStep("error");
        return;
      }

      setPaymentUrl(data.url);
      setPaymentStep("collecting");

      // Start polling
      pollStartRef.current = Date.now();
      pollRef.current = setInterval(async () => {
        // Check timeout
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setPaymentStep("timeout");
          return;
        }

        try {
          const pollRes = await fetch(`/api/stripe/payment-status/${jobId}`);
          const pollData = await pollRes.json();
          if (pollData.payment_status === "paid") {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setPaidAmount(
              pollData.catalog_total_price
                ? `$${pollData.catalog_total_price}`
                : null
            );
            setPaymentStep("success");
            await loadJob();
            await loadActivity();
          }
        } catch {
          // Polling error — continue
        }
      }, POLL_INTERVAL);
    } catch (err: any) {
      setPaymentError(err.message || "Network error.");
      setPaymentStep("error");
    }
  }

  function handleTextPaymentLink() {
    if (!paymentUrl || !job) return;
    const serviceName =
      [job.service_name, job.tier_name].filter(Boolean).join(" — ") ||
      (job.type === "hes" ? "HES Assessment" : "Home Inspection");
    const message = `Here is your payment link for your ${serviceName}: ${paymentUrl}`;
    const smsUrl = `sms:${job.customer_phone || ""}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl);
  }

  function handleCopyLink() {
    if (!paymentUrl) return;
    navigator.clipboard.writeText(paymentUrl).then(() => {
      showToast("Link copied to clipboard");
    });
  }

  // ─── Note handler ─────────────────────────────────────────────────

  async function handleAddNote() {
    if (!noteText.trim() || noteSaving) return;
    setNoteSaving(true);
    const res = await addJobNote(jobId, noteText.trim());
    if (res.success) {
      setNoteText("");
      showToast("Note added.");
      await loadActivity();
    } else {
      showToast(res.error || "Failed to add note.");
    }
    setNoteSaving(false);
  }

  // ─── Loading / not found ──────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0", color: "#64748b" }}>
        Loading job details...
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ textAlign: "center", padding: "64px 16px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>
          Job not found
        </h2>
        <Link
          href="/portal/jobs"
          style={{ fontSize: 13, color: "#10b981", textDecoration: "none" }}
        >
          Back to Jobs
        </Link>
      </div>
    );
  }

  const addr = fullAddress(job);
  const statusAction = STATUS_ACTIONS[job.status];
  const statusDisplay = STATUS_DISPLAY[job.status] ?? STATUS_DISPLAY.pending;
  const borderColor = SERVICE_BORDER[job.type] ?? "#10b981";
  const serviceLine = [job.service_name, job.tier_name].filter(Boolean).join(" — ");
  const price = job.catalog_total_price ?? job.invoice_amount;
  const isTestMode = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith("pk_test_");
  const isInProgress = job.status === "in_progress";
  const isCompleted = job.status === "completed";
  const isPaid = job.payment_status === "paid";
  const receiptUrl = stripePaymentUrl(job.payment_id, !!isTestMode);

  // ─── Payment Overlay ──────────────────────────────────────────────

  if (paymentStep && paymentStep !== null) {
    return (
      <div>
        {/* Toast */}
        {toast && (
          <div style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            padding: "10px 20px", borderRadius: 10, background: "#1e293b",
            border: "1px solid rgba(16,185,129,0.3)", color: "#10b981",
            fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}>{toast}</div>
        )}

        {/* Test mode banner */}
        {isTestMode && (
          <div style={{
            padding: "8px 16px", borderRadius: 8, marginBottom: 16,
            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
            color: "#f59e0b", fontSize: 12, fontWeight: 600, textAlign: "center",
          }}>
            Test Mode — No real charges will be made
          </div>
        )}

        {/* ── Confirm Step ── */}
        {paymentStep === "confirm" && (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <CheckCircleIcon style={{ width: 48, height: 48, color: "#10b981", margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
              Ready to collect payment?
            </h2>
            <div style={{
              background: "rgba(30,41,59,0.5)", border: "1px solid rgba(51,65,85,0.5)",
              borderRadius: 12, padding: 20, marginBottom: 24, textAlign: "left",
            }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Service</div>
                  <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>
                    {serviceLine || (job.type === "hes" ? "HES Assessment" : "Home Inspection")}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Customer</div>
                  <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{job.customer_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>Total Amount</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#a78bfa" }}>
                    {price ? `$${price.toFixed(2)}` : "No price set"}
                  </div>
                </div>
              </div>
            </div>

            <button type="button" onClick={handleCollectPayment} disabled={!price}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                gap: 10, padding: "16px 20px", borderRadius: 12, fontSize: 16, fontWeight: 700,
                border: "1px solid rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.15)",
                color: "#10b981", cursor: price ? "pointer" : "not-allowed",
                opacity: price ? 1 : 0.5, transition: "all 0.15s", marginBottom: 12,
              }}>
              <CheckCircleIcon style={{ width: 22, height: 22 }} />
              Collect Payment
              <ArrowRightIcon style={{ width: 18, height: 18 }} />
            </button>

            <button type="button" onClick={handleCancelPayment}
              style={{
                background: "transparent", border: "none", color: "#64748b",
                fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "8px 16px",
              }}>
              Cancel
            </button>
          </div>
        )}

        {/* ── Generating Step ── */}
        {paymentStep === "generating" && (
          <div style={{ textAlign: "center", padding: "80px 16px" }}>
            <div style={{
              width: 48, height: 48, border: "3px solid rgba(16,185,129,0.2)",
              borderTopColor: "#10b981", borderRadius: "50%",
              animation: "spin 1s linear infinite", margin: "0 auto 20px",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#94a3b8" }}>
              Generating payment link...
            </h2>
          </div>
        )}

        {/* ── Collecting Step (QR Code + actions) ── */}
        {paymentStep === "collecting" && paymentUrl && (
          <div style={{ textAlign: "center", padding: "20px 16px" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>
              Collect Payment
            </h2>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 4 }}>
              {serviceLine || (job.type === "hes" ? "HES Assessment" : "Home Inspection")}
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 4 }}>
              {job.customer_name}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#a78bfa", marginBottom: 20 }}>
              ${price?.toFixed(2)}
            </div>

            {/* QR Code */}
            <div className="qr-container" style={{
              background: "#ffffff", borderRadius: 16, padding: 20,
              display: "inline-block", marginBottom: 12,
            }}>
              <QRCodeSVG value={paymentUrl} size={220} level="M" className="qr-code" />
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
              Customer scans to pay
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto 24px" }}>
              {job.customer_phone && (
                <button type="button" onClick={handleTextPaymentLink}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                    border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.12)",
                    color: "#60a5fa", cursor: "pointer", transition: "all 0.15s",
                  }}>
                  <ChatBubbleLeftIcon style={{ width: 18, height: 18 }} />
                  Text Payment Link
                </button>
              )}

              <button type="button" onClick={handleCopyLink}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  border: "1px solid rgba(51,65,85,0.5)", background: "rgba(30,41,59,0.5)",
                  color: "#94a3b8", cursor: "pointer", transition: "all 0.15s",
                }}>
                <ClipboardDocumentIcon style={{ width: 18, height: 18 }} />
                Copy Payment Link
              </button>
            </div>

            {/* Waiting indicator */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 16px", borderRadius: 10,
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
              marginBottom: 16,
            }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: "#f59e0b", animation: "pulse 2s ease-in-out infinite",
              }} />
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
              <span style={{ fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>
                Waiting for payment...
              </span>
            </div>

            <button type="button" onClick={handleCancelPayment}
              style={{
                background: "transparent", border: "none", color: "#475569",
                fontSize: 12, cursor: "pointer", padding: "8px 16px",
              }}>
              Go Back
            </button>
          </div>
        )}

        {/* ── Success Step ── */}
        {paymentStep === "success" && (
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(16,185,129,0.15)", border: "2px solid #10b981",
              display: "grid", placeItems: "center", margin: "0 auto 20px",
            }}>
              <CheckCircleIcon style={{ width: 40, height: 40, color: "#10b981" }} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
              Payment Received!
            </h2>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981", marginBottom: 8 }}>
              {paidAmount || `$${price?.toFixed(2)}`} paid
            </div>
            {job.customer_email && (
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
                Receipt sent to {job.customer_email}
              </div>
            )}
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 32 }}>
              LEAF report: Queued for delivery
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
              <Link href="/portal/schedule"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "14px 20px", borderRadius: 12, fontSize: 15, fontWeight: 700,
                  border: "1px solid rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.15)",
                  color: "#10b981", textDecoration: "none", transition: "all 0.15s",
                }}>
                Next Job
                <ArrowRightIcon style={{ width: 18, height: 18 }} />
              </Link>

              <Link href="/portal/jobs"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: "1px solid rgba(51,65,85,0.5)", background: "transparent",
                  color: "#94a3b8", textDecoration: "none", transition: "all 0.15s",
                }}>
                Back to Jobs
              </Link>
            </div>
          </div>
        )}

        {/* ── Timeout Step ── */}
        {paymentStep === "timeout" && (
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <ClockIcon style={{ width: 48, height: 48, color: "#f59e0b", margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
              Payment not yet received
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 24, lineHeight: 1.5 }}>
              The customer may still complete payment later.
              You can check back or continue to your next job.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
              <button type="button" onClick={() => {
                setPaymentStep("collecting");
                pollStartRef.current = Date.now();
                pollRef.current = setInterval(async () => {
                  if (Date.now() - pollStartRef.current > POLL_TIMEOUT) {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setPaymentStep("timeout");
                    return;
                  }
                  try {
                    const r = await fetch(`/api/stripe/payment-status/${jobId}`);
                    const d = await r.json();
                    if (d.payment_status === "paid") {
                      if (pollRef.current) clearInterval(pollRef.current);
                      setPaidAmount(d.catalog_total_price ? `$${d.catalog_total_price}` : null);
                      setPaymentStep("success");
                      await loadJob();
                      await loadActivity();
                    }
                  } catch {}
                }, POLL_INTERVAL);
              }}
                style={{
                  padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.1)",
                  color: "#f59e0b", cursor: "pointer", transition: "all 0.15s",
                }}>
                Continue Waiting
              </button>

              <Link href="/portal/schedule"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: "1px solid rgba(51,65,85,0.5)", background: "transparent",
                  color: "#94a3b8", textDecoration: "none", transition: "all 0.15s",
                }}>
                Go to Schedule
              </Link>
            </div>
          </div>
        )}

        {/* ── Error Step ── */}
        {paymentStep === "error" && (
          <div style={{ textAlign: "center", padding: "60px 16px" }}>
            <XMarkIcon style={{ width: 48, height: 48, color: "#ef4444", margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
              Payment link failed
            </h2>
            <p style={{ fontSize: 13, color: "#ef4444", marginBottom: 24 }}>
              {paymentError}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 320, margin: "0 auto" }}>
              <button type="button" onClick={handleCollectPayment}
                style={{
                  padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                  border: "1px solid rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.15)",
                  color: "#10b981", cursor: "pointer", transition: "all 0.15s",
                }}>
                Retry
              </button>
              <button type="button" onClick={handleCancelPayment}
                style={{
                  background: "transparent", border: "none", color: "#64748b",
                  fontSize: 13, cursor: "pointer", padding: "8px 16px",
                }}>
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Normal Job Detail View ───────────────────────────────────────

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "10px 20px",
            borderRadius: 10,
            background: "#1e293b",
            border: "1px solid rgba(16,185,129,0.3)",
            color: "#10b981",
            fontSize: 13,
            fontWeight: 600,
            zIndex: 9999,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {toast}
        </div>
      )}

      {/* Back link */}
      <Link
        href="/portal/jobs"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          color: "#94a3b8",
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        <ArrowLeftIcon style={{ width: 14, height: 14 }} />
        Back to Jobs
      </Link>

      {/* Header card */}
      <div
        style={{
          background: "rgba(30,41,59,0.5)",
          border: "1px solid rgba(51,65,85,0.5)",
          borderLeft: `4px solid ${borderColor}`,
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 700,
              background: statusDisplay.bg,
              color: statusDisplay.text,
              textTransform: "uppercase",
            }}
          >
            {statusDisplay.label}
          </span>
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
            {job.type === "hes" ? "HES" : "Inspection"}
          </span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: "0 0 4px" }}>
          {job.customer_name}
        </h1>
        <div style={{ fontSize: 13, color: "#94a3b8" }}>
          {serviceLine || (job.type === "hes" ? "HES Assessment" : "Home Inspection")}
        </div>
      </div>

      {/* Primary Action Button — standard transitions */}
      {statusAction && (
        <button
          type="button"
          onClick={handleStatusTransition}
          disabled={actionBusy}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "14px 20px",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            border: `1px solid ${statusAction.border}`,
            background: statusAction.bg,
            color: statusAction.color,
            cursor: actionBusy ? "not-allowed" : "pointer",
            opacity: actionBusy ? 0.6 : 1,
            transition: "all 0.15s",
            marginBottom: 16,
          }}
        >
          <ActionIcon icon={statusAction.icon} size={22} />
          {actionBusy ? "Updating..." : statusAction.label}
        </button>
      )}

      {/* Complete Job button — triggers payment flow */}
      {isInProgress && (
        <button
          type="button"
          onClick={handleCompleteJobTap}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "14px 20px",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            border: "1px solid rgba(16,185,129,0.4)",
            background: "rgba(16,185,129,0.15)",
            color: "#10b981",
            cursor: "pointer",
            transition: "all 0.15s",
            marginBottom: 16,
          }}
        >
          <CheckCircleIcon style={{ width: 22, height: 22 }} />
          Complete Job
        </button>
      )}

      {/* Completed Summary Card */}
      {isCompleted && (
        <div
          style={{
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 16,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(16,185,129,0.15)",
                border: "2px solid #10b981",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <CheckCircleIcon style={{ width: 20, height: 20, color: "#10b981" }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}>
                Job Completed
              </div>
              {job.job_completed_at && (
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  {formatTimestamp(job.job_completed_at)}
                </div>
              )}
            </div>
          </div>

          {/* Payment info */}
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", borderRadius: 8,
              background: isPaid ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
              border: isPaid ? "1px solid rgba(16,185,129,0.15)" : "1px solid rgba(245,158,11,0.15)",
            }}>
              <div>
                <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>
                  Payment
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: isPaid ? "#10b981" : "#f59e0b" }}>
                  {isPaid ? `Paid $${(price ?? 0).toFixed(2)}` : "Payment pending"}
                </div>
                {isPaid && job.payment_received_at && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                    {formatTimestamp(job.payment_received_at)}
                  </div>
                )}
              </div>
            </div>

            {/* LEAF delivery status */}
            {job.leaf_delivery_status && (
              <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: "rgba(30,41,59,0.5)", border: "1px solid rgba(51,65,85,0.3)",
              }}>
                <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 2 }}>
                  LEAF Report
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: job.leaf_delivery_status === "delivered" ? "#10b981" : job.leaf_delivery_status === "queued" ? "#f59e0b" : "#64748b" }}>
                  {job.leaf_delivery_status === "delivered" ? "Delivered" : job.leaf_delivery_status === "queued" ? "Queued for delivery" : "Not applicable"}
                </div>
              </div>
            )}

            {/* Stripe links */}
            {isPaid && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {receiptUrl ? (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      background: "rgba(167,139,250,0.12)",
                      border: "1px solid rgba(167,139,250,0.3)",
                      color: "#a78bfa",
                      textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                  >
                    <ClipboardDocumentIcon style={{ width: 15, height: 15 }} />
                    View Receipt
                  </a>
                ) : (
                  <div style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "#475569",
                    background: "rgba(30,41,59,0.3)", border: "1px solid rgba(51,65,85,0.2)",
                  }}>
                    Receipt unavailable
                  </div>
                )}
                {receiptUrl && (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      background: "transparent",
                      border: "1px solid rgba(51,65,85,0.5)",
                      color: "#94a3b8",
                      textDecoration: "none",
                      transition: "all 0.15s",
                    }}
                  >
                    View in Stripe
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer & Job Info */}
      <div
        style={{
          background: "rgba(30,41,59,0.5)",
          border: "1px solid rgba(51,65,85,0.5)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
          Customer & Schedule
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px" }}>
          {/* Date/Time */}
          <div>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>
              Scheduled
            </div>
            <div style={{ fontSize: 13, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 4 }}>
              <ClockIcon style={{ width: 13, height: 13, color: "#64748b" }} />
              {formatDate(job.scheduled_date)}
            </div>
            <div style={{ fontSize: 13, color: "#94a3b8", paddingLeft: 17 }}>
              {formatTime(job.scheduled_time)}
            </div>
          </div>

          {/* Price */}
          <div>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>
              Amount
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: price ? "#a78bfa" : "#475569" }}>
              {price ? `$${price}` : "\u2014"}
            </div>
          </div>

          {/* Phone */}
          <div>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>
              Phone
            </div>
            {job.customer_phone ? (
              <a
                href={`tel:${job.customer_phone}`}
                style={{
                  fontSize: 13,
                  color: "#60a5fa",
                  textDecoration: "none",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <PhoneIcon style={{ width: 13, height: 13 }} />
                {job.customer_phone}
              </a>
            ) : (
              <div style={{ fontSize: 13, color: "#475569" }}>{"\u2014"}</div>
            )}
          </div>

          {/* Email */}
          <div>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 3 }}>
              Email
            </div>
            {job.customer_email ? (
              <a
                href={`mailto:${job.customer_email}`}
                style={{
                  fontSize: 13,
                  color: "#60a5fa",
                  textDecoration: "none",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <EnvelopeIcon style={{ width: 13, height: 13 }} />
                {job.customer_email}
              </a>
            ) : (
              <div style={{ fontSize: 13, color: "#475569" }}>{"\u2014"}</div>
            )}
          </div>
        </div>

        {/* Address + navigate */}
        {addr && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(51,65,85,0.5)" }}>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
              Address
            </div>
            <div style={{ fontSize: 13, color: "#e2e8f0", marginBottom: 8 }}>
              {addr}
            </div>
            <a
              href={mapsUrl(job)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.3)",
                color: "#60a5fa",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <MapPinIcon style={{ width: 16, height: 16 }} />
              Navigate to Address
            </a>
          </div>
        )}

        {/* Special notes from admin */}
        {job.special_notes && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(51,65,85,0.5)" }}>
            <div style={{ fontSize: 10, color: "#475569", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
              Job Notes
            </div>
            <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>
              {job.special_notes}
            </div>
          </div>
        )}
      </div>

      {/* Field Notes Section */}
      <div
        style={{
          background: "rgba(30,41,59,0.5)",
          border: "1px solid rgba(51,65,85,0.5)",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Field Notes
        </div>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={3}
          placeholder="Add a note about this job..."
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(51,65,85,0.5)",
            background: "rgba(15,23,42,0.5)",
            color: "#f1f5f9",
            fontSize: 13,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 8,
          }}
        />
        <button
          type="button"
          onClick={handleAddNote}
          disabled={!noteText.trim() || noteSaving}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            border: "none",
            cursor: !noteText.trim() || noteSaving ? "not-allowed" : "pointer",
            background:
              noteText.trim() && !noteSaving
                ? "rgba(16,185,129,0.15)"
                : "rgba(51,65,85,0.3)",
            color:
              noteText.trim() && !noteSaving ? "#10b981" : "#475569",
            transition: "all 0.15s",
          }}
        >
          {noteSaving ? "Saving..." : "Add Note"}
        </button>
      </div>

      {/* Activity Log */}
      <div
        style={{
          background: "rgba(30,41,59,0.5)",
          border: "1px solid rgba(51,65,85,0.5)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Activity Log
        </div>
        <ActivityLog
          entries={activityEntries}
          isLoading={activityLoading}
          maxHeight="320px"
        />
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 640px) {
          .qr-container { padding: 14px !important; }
          .qr-code { width: 180px !important; height: 180px !important; }
        }
      `}</style>
    </div>
  );
}
