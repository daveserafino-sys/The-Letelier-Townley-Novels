import { Publication } from "../types";

// Original catalogue publication IDs in ascending chronological order
const ORIGINAL_CATALOGUE_ORDER = [
  "trapeze-artist",
  "and3",
  "firebreak",
  "asylum",
  "tommy-rock",
  "metal-man-meets-ms-godiva",
  "migration-season",
  "bookseeker",
  "transposition",
  "we-dont-need-no-water",
  "chloroquine",
  "island",
  "the-garden",
  "a-cat-and-his-man",
  "victimization-retreat"
];

/**
 * Parses publication date strings (e.g. "10/2026", "3/2025", "Spring 2026", "October 2025")
 * into a comparable numeric score: year * 100 + month (e.g. 202610 for Oct 2026).
 */
export function parsePublicationDate(dateStr?: string): number {
  if (!dateStr || typeof dateStr !== "string") {
    // Unset or empty dates (such as an item just added) are given top priority
    return 999999;
  }

  const cleaned = dateStr.trim().toLowerCase();
  if (!cleaned) return 999999;

  // Pattern 1: M/YYYY, MM/YYYY, M/YY, MM/YY (e.g. "10/2026", "2/2024", "9/26")
  const slashMatch = cleaned.match(/^(\d{1,2})[\/\-\.](\d{2,4})$/);
  if (slashMatch) {
    let month = parseInt(slashMatch[1], 10);
    let year = parseInt(slashMatch[2], 10);
    if (year < 100) year += 2000;
    // Swap if year was passed first (e.g. 2026/10)
    if (month > 12 && year <= 12) {
      const temp = month;
      month = year;
      year = temp;
    }
    return year * 100 + Math.min(Math.max(month, 1), 12);
  }

  // Pattern 2: ISO YYYY-MM-DD or YYYY-MM
  const isoMatch = cleaned.match(/^(\d{4})[\/\-\.](\d{1,2})(?:[\/\-\.]\d{1,2})?$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    return year * 100 + Math.min(Math.max(month, 1), 12);
  }

  // Extract explicit 4-digit year
  const yearMatch = cleaned.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 0;

  // Seasons
  if (cleaned.includes("winter")) {
    return (year || 2026) * 100 + 1;
  }
  if (cleaned.includes("spring")) {
    return (year || 2026) * 100 + 4;
  }
  if (cleaned.includes("summer")) {
    return (year || 2026) * 100 + 7;
  }
  if (cleaned.includes("fall") || cleaned.includes("autumn")) {
    return (year || 2026) * 100 + 10;
  }

  // Named months
  const months: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };

  for (const [mName, mNum] of Object.entries(months)) {
    if (cleaned.includes(mName)) {
      return (year || 2026) * 100 + mNum;
    }
  }

  // Only year found
  if (year > 0) {
    return year * 100 + 1;
  }

  // Standard fallback
  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    return d.getFullYear() * 100 + (d.getMonth() + 1);
  }

  return 999999;
}

/**
 * Sorts publications in reverse-chronological order (newest at the top, down to oldest at the bottom).
 * Ensures that newly added stories always populate at the top of the list to maintain chronological order.
 */
export function sortPublicationsChronological(publications: Publication[]): Publication[] {
  if (!publications || !Array.isArray(publications)) return [];

  return [...publications].sort((a, b) => {
    const scoreA = parsePublicationDate(a.date);
    const scoreB = parsePublicationDate(b.date);

    // Primary sort: Date descending (newest date first)
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // Tie-break 1: If both are from the original catalog, preserve the reverse-chronological catalog order
    const origIndexA = ORIGINAL_CATALOGUE_ORDER.indexOf(a.id);
    const origIndexB = ORIGINAL_CATALOGUE_ORDER.indexOf(b.id);
    if (origIndexA !== -1 && origIndexB !== -1) {
      return origIndexB - origIndexA;
    }

    // Tie-break 2: Newer generated pub-timestamp IDs should appear before older ones
    const tsA = a.id?.startsWith("pub-") ? parseInt(a.id.replace("pub-", ""), 10) : 0;
    const tsB = b.id?.startsWith("pub-") ? parseInt(b.id.replace("pub-", ""), 10) : 0;
    if (tsA || tsB) {
      return tsB - tsA;
    }

    return 0;
  });
}
