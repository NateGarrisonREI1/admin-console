// src/lib/incentives/energystarRebateFinder.ts
import * as cheerio from "cheerio";
import crypto from "crypto";

export type EnergyStarOffer = {
  external_key: string; // stable hash
  zip: string;

  product_category?: string | null;
  program_name?: string | null;
  utility?: string | null;
  state?: string | null;

  offer_url?: string | null;
  amount_text?: string | null;
  details_text?: string | null;

  raw_payload?: any;
};

function s(v: any) {
  return String(v ?? "").trim();
}

function sha1(input: string) {
  return crypto.createHash("sha1").update(input).digest("hex");
}

/**
 * Fetches the ENERGY STAR Rebate Finder page for a ZIP and attempts to parse offers.
 * IMPORTANT: The site can 404 for "busy" querystrings; we keep URLs minimal and try a few variants.
 * NOTE: ENERGY STAR may render results client-side; if parsing returns 0,
 * we return diagnostics + raw_html so you can adjust selectors later.
 */
export async function fetchEnergyStarOffersByZip(zip: string): Promise<{
  offers: EnergyStarOffer[];
  diagnostics: { url: string; tried_urls: string[]; html_len: number; note?: string };
  raw_html: string;
}> {
  const cleanZip = s(zip).replace(/[^0-9]/g, "").slice(0, 10);
  if (!cleanZip) throw new Error("Invalid ZIP (expected digits).");

  const base = "https://www.energystar.gov/rebate-finder";

  // Keep it SIMPLE. Extra params can cause 404/blocks.
  const urlsToTry = [
    `${base}?page_number=0&zip_code_filter=${encodeURIComponent(cleanZip)}`,
    `${base}/?page_number=0&zip_code_filter=${encodeURIComponent(cleanZip)}`,
    `${base}?zip_code_filter=${encodeURIComponent(cleanZip)}`,
    `${base}/?zip_code_filter=${encodeURIComponent(cleanZip)}`,
    `${base}?page_number=0`,
    `${base}/?page_number=0`,
    `${base}`,
    `${base}/`,
  ];

  let usedUrl = urlsToTry[0];
  let html = "";
  let lastStatus: number | null = null;
  let lastStatusText: string | null = null;
  let lastBodyHead: string | null = null;

  for (const u of urlsToTry) {
    usedUrl = u;

    const res = await fetch(u, {
      method: "GET",
      redirect: "follow",
      headers: {
        // Browser-ish headers help avoid edge blocks.
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
        referer: "https://www.energystar.gov/",
      },
    });

    lastStatus = res.status;
    lastStatusText = res.statusText;

    const body = await res.text();
    lastBodyHead = body.slice(0, 300);

    // Heuristic: require non-trivial HTML to proceed
    if (res.ok && body && body.length > 500) {
      html = body;
      break;
    }
  }

  if (!html) {
    throw new Error(
      `ENERGY STAR fetch failed after retries. last=${lastStatus} ${lastStatusText} url=${usedUrl} body_head=${JSON.stringify(
        lastBodyHead
      )}`
    );
  }

  const $ = cheerio.load(html);

  // ENERGY STAR pages are often Drupal views; offers often appear as repeated “views-row” blocks.
  const rows = $(".views-row");
  const offers: EnergyStarOffer[] = [];

  rows.each((_, el) => {
    const row = $(el);

    const linkEl = row.find("a").first();
    const href = s(linkEl.attr("href"));
    const offerUrl = href
      ? href.startsWith("http")
        ? href
        : `https://www.energystar.gov${href.startsWith("/") ? "" : "/"}${href}`
      : null;

    const title =
      s(row.find("h2, h3, .views-field-title").first().text()) ||
      s(linkEl.text()) ||
      null;

    const utility =
      s(row.find(".views-field-field-utility, .field--name-field-utility").first().text()) || null;

    const category =
      s(row.find(".views-field-field-product-type, .field--name-field-product-type").first().text()) ||
      null;

    const state =
      s(row.find(".views-field-field-state, .field--name-field-state").first().text()) || null;

    const amount =
      s(row.find(".views-field-field-rebate-amount, .field--name-field-rebate-amount").first().text()) ||
      null;

    const details =
      s(row.find(".views-field-body, .field--name-body, .views-field-field-details").first().text()) ||
      null;

    const external_key = sha1(
      JSON.stringify({
        zip: cleanZip,
        title,
        offerUrl,
        utility,
        category,
        state,
        amount,
      })
    );

    if (title || offerUrl) {
      offers.push({
        external_key,
        zip: cleanZip,
        product_category: category,
        program_name: title,
        utility,
        state,
        offer_url: offerUrl,
        amount_text: amount,
        details_text: details,
        raw_payload: { title, offerUrl, utility, category, state, amount },
      });
    }
  });

  const diagnostics = {
    url: usedUrl,
    tried_urls: urlsToTry,
    html_len: html.length,
    note:
      offers.length === 0
        ? "0 offers parsed. ENERGY STAR may render results client-side; the robust fix is to use the underlying XHR/JSON endpoint."
        : undefined,
  };

  return { offers, diagnostics, raw_html: html };
}
