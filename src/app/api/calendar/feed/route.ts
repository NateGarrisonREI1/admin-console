// GET /api/calendar/feed — iCal feed of all active schedule jobs
// Subscribe to this URL in Google Calendar: Settings → Add calendar → From URL

import { NextResponse } from "next/server";
import { fetchScheduleData } from "@/app/admin/schedule/data";

function escIcal(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET() {
  const { jobs } = await fetchScheduleData();

  const events = jobs
    .filter((j) => j.status !== "cancelled" && j.status !== "archived")
    .map((job) => {
      const dateStr = job.scheduled_date.replace(/-/g, "");
      let dtStart: string;
      let dtEnd: string;

      if (job.scheduled_time) {
        const ts = job.scheduled_time.replace(":", "") + "00";
        dtStart = `${dateStr}T${ts}`;
        const [h, m] = job.scheduled_time.split(":").map(Number);
        dtEnd = `${dateStr}T${String(Math.min(h + 1, 23)).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
      } else {
        dtStart = dateStr;
        dtEnd = dateStr;
      }

      const summary = `${job.type === "hes" ? "HES Assessment" : "Home Inspection"} - ${job.customer_name}`;
      const location = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
      const description = [
        job.customer_phone ? `Phone: ${job.customer_phone}` : "",
        job.customer_email ? `Email: ${job.customer_email}` : "",
        job.special_notes ? `Notes: ${job.special_notes}` : "",
      ]
        .filter(Boolean)
        .join("\\n");

      return [
        "BEGIN:VEVENT",
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${escIcal(summary)}`,
        location ? `LOCATION:${escIcal(location)}` : "",
        description ? `DESCRIPTION:${escIcal(description)}` : "",
        `UID:${job.id}@leafss`,
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n");
    });

  const ical = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Leaf SS//Schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Leaf SS Schedule",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="schedule.ics"',
    },
  });
}
