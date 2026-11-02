/**
 * Utility to resolve outlet / magazine logos for readings, videos, and interviews.
 * Supports Dulcet Literary Magazine, Radon Journal, Oyster River Pages, Rabble Review,
 * as well as custom logo URLs uploaded or configured for any future magazine.
 */

export interface OutletLogoInfo {
  logoUrl?: string;
  name: string;
  alt: string;
  isCustom: boolean;
  className?: string;
}

export function getOutletLogo(outlet: string = "", customLogoUrl?: string): OutletLogoInfo {
  const trimmedCustom = (customLogoUrl || "").trim();
  if (trimmedCustom) {
    return {
      logoUrl: trimmedCustom,
      name: outlet || "Literary Magazine",
      alt: `${outlet || "Publication"} logo`,
      isCustom: true,
      className: "h-7 sm:h-8 w-auto max-w-[140px] object-contain drop-shadow-md"
    };
  }

  const normalized = (outlet || "").toLowerCase().trim();

  // Dulcet Literary Magazine (uses white/gold transparent logo on dark website background)
  if (normalized.includes("dulcet")) {
    return {
      logoUrl: "/assets/logos/dulcet_logo_white.png",
      name: "Dulcet Literary Magazine",
      alt: "Dulcet Stories + Art Logo",
      isCustom: false,
      className: "h-7 sm:h-8 w-auto max-w-[130px] object-contain drop-shadow"
    };
  }

  // Radon Journal
  if (normalized.includes("radon")) {
    return {
      logoUrl: "/assets/logos/radon_logo.png",
      name: "Radon Journal",
      alt: "Radon Journal Logo",
      isCustom: false,
      className: "h-6 sm:h-7 w-auto max-w-[140px] object-contain drop-shadow"
    };
  }

  // Oyster River Pages
  if (normalized.includes("oyster river") || normalized.includes("orp")) {
    return {
      logoUrl: "/assets/logos/oyster_river_logo.png",
      name: "Oyster River Pages",
      alt: "Oyster River Pages Logo",
      isCustom: false,
      className: "h-7 sm:h-8 w-auto max-w-[130px] object-contain drop-shadow"
    };
  }

  // Rabble Review
  if (normalized.includes("rabble")) {
    return {
      logoUrl: "/assets/logos/rabble_logo.png",
      name: "Rabble Review",
      alt: "Rabble Review Logo",
      isCustom: false,
      className: "h-6 sm:h-7 w-auto max-w-[120px] object-contain drop-shadow rounded-sm"
    };
  }

  return {
    logoUrl: undefined,
    name: outlet || "Publication",
    alt: `${outlet} Logo`,
    isCustom: false
  };
}
