export async function getCalendarClient() {
  if (process.env.NODE_ENV !== "production") {
    throw new Error(
      "Google Calendar is disabled in dev. (Stubbed to unblock UI work.)"
    );
  }

  throw new Error(
    "Google Calendar not configured in production yet. Developer will wire this later."
  );
}
