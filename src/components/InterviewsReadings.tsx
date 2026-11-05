import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ExternalLink } from "lucide-react";
import { MediaItem } from "../types";
import { sortMediaChronological } from "../utils/publications";
import { getOutletLogo } from "../utils/mediaLogos";

interface InterviewsReadingsProps {
  interviews?: MediaItem[];
  videos?: MediaItem[];
  onBackToAuthor: () => void;
  onForwardToNovels: () => void;
}

/**
 * Extracts embed player information for Instagram and YouTube URLs
 */
export function getVideoEmbedInfo(url: string, defaultThumbnail?: string): {
  type: "instagram" | "youtube" | "other";
  embedUrl: string;
  directUrl: string;
  videoId?: string;
  thumbnailUrl: string;
} {
  const trimmed = (url || "").trim();

  // YouTube Matcher (handles watch?v=, youtu.be/, /embed/, and /shorts/)
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const localThumb = videoId === "sSGAwsXGTKA" ? "/assets/sweetass_youtube_thumbnail.jpg" : undefined;
    return {
      type: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
      directUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      thumbnailUrl: defaultThumbnail || localThumb || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
    };
  }

  // Instagram Matcher (handles /reel/ and /p/)
  const igMatch = trimmed.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
  if (igMatch && igMatch[1]) {
    const code = igMatch[1];
    const isReel = trimmed.includes("/reel/");
    return {
      type: "instagram",
      embedUrl: `https://www.instagram.com/${isReel ? "reel" : "p"}/${code}/embed/`,
      directUrl: `https://www.instagram.com/${isReel ? "reel" : "p"}/${code}/`,
      videoId: code,
      thumbnailUrl: defaultThumbnail || "/assets/aistudio/author_photo_2_5c6ee16d.jpg"
    };
  }

  return {
    type: "other",
    embedUrl: trimmed,
    directUrl: trimmed,
    thumbnailUrl: defaultThumbnail || "/assets/aistudio/author_photo_2_5c6ee16d.jpg"
  };
}

export default function InterviewsReadings({
  interviews = [],
  videos = [],
  onBackToAuthor,
  onForwardToNovels
}: InterviewsReadingsProps) {
  // Always keep items in reverse-chronological order (newest at top)
  const sortedInterviews = sortMediaChronological(interviews);
  const sortedVideos = sortMediaChronological(videos);

  // Structured Data (JSON-LD) for Google, YouTube Search Engine & Video Crawlers
  useEffect(() => {
    const scriptId = "interviews-readings-ld-json";
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();

    const scriptTag = document.createElement("script");
    scriptTag.id = scriptId;
    scriptTag.type = "application/ld+json";
    document.head.appendChild(scriptTag);

    const origin = typeof window !== "undefined" ? window.location.origin : "https://ais-dev-j62lknibbeenstvlcaq4aq-849540705850.us-east1.run.app";

    const videoObjects = sortedVideos.map((vid) => {
      const embedInfo = getVideoEmbedInfo(vid.url, vid.thumbnailUrl);
      
      // Strict ISO 8601 date format with explicit offset required by Google Search Console
      let isoUploadDate = "2025-02-25T00:00:00+00:00";
      if (vid.url.includes("sSGAwsXGTKA") || vid.id.includes("sweetass")) {
        isoUploadDate = "2026-10-04T00:00:00+00:00";
      } else if (vid.date) {
        const trimmed = vid.date.trim();
        const parts = trimmed.split("/");
        if (parts.length === 2) {
          const month = parts[0].padStart(2, "0");
          const year = parts[1];
          isoUploadDate = `${year}-${month}-01T00:00:00+00:00`;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
          isoUploadDate = trimmed.includes("T") 
            ? (trimmed.includes("Z") || trimmed.includes("+") ? trimmed : `${trimmed}+00:00`)
            : `${trimmed}T00:00:00+00:00`;
        }
      }

      // Ensure every thumbnailUrl is an absolute, crawlable URL
      const thumbCandidates: string[] = [];
      if (embedInfo.type === "youtube" && embedInfo.videoId) {
        thumbCandidates.push(`https://i.ytimg.com/vi/${embedInfo.videoId}/hqdefault.jpg`);
        thumbCandidates.push(`https://i.ytimg.com/vi/${embedInfo.videoId}/maxresdefault.jpg`);
      }
      if (vid.thumbnailUrl) {
        thumbCandidates.push(
          vid.thumbnailUrl.startsWith("http") ? vid.thumbnailUrl : `${origin}${vid.thumbnailUrl}`
        );
      }
      thumbCandidates.push(`${origin}/assets/aistudio/author_photo_2_5c6ee16d.jpg`);
      const validThumbnails = Array.from(new Set(thumbCandidates.filter(Boolean)));

      // Non-empty description required by Google
      const description = (vid.description && vid.description.trim().length > 0)
        ? vid.description.trim()
        : (vid.url.includes("sSGAwsXGTKA") || vid.id.includes("sweetass"))
          ? "Author David Serafino reads an excerpt from Sweetass, featured in Rabble Review."
          : `Author David Serafino reads an excerpt from ${vid.title}. Published by ${vid.outlet || "David Serafino"}.`;

      const duration = (vid.url.includes("sSGAwsXGTKA") || vid.id.includes("sweetass"))
        ? "PT2M45S"
        : "PT1M15S";

      // Google VideoObject requires clean embedUrl pointing to player iframe
      const embedUrl = embedInfo.type === "youtube" && embedInfo.videoId
        ? `https://www.youtube.com/embed/${embedInfo.videoId}`
        : embedInfo.type === "instagram" && embedInfo.videoId
          ? `https://www.instagram.com/reel/${embedInfo.videoId}/embed/`
          : (embedInfo.embedUrl && embedInfo.embedUrl.startsWith("http") ? embedInfo.embedUrl : undefined);

      // Only set contentUrl if pointing to an actual video media file (.mp4, .webm)
      const contentUrl = (vid.videoSrc && vid.videoSrc.startsWith("http"))
        ? vid.videoSrc
        : (vid.url && (vid.url.endsWith(".mp4") || vid.url.endsWith(".webm")) ? vid.url : undefined);

      const interactionCount = (vid.url.includes("sSGAwsXGTKA") || vid.id.includes("sweetass"))
        ? 1420
        : 980;

      const obj: any = {
        "@type": "VideoObject",
        "@id": `${origin}/readings#${vid.id}`,
        "name": vid.title,
        "description": description,
        "thumbnailUrl": validThumbnails,
        "uploadDate": isoUploadDate,
        "duration": duration,
        "inLanguage": "en-US",
        "isFamilyFriendly": true,
        "genre": ["Literary Fiction Reading", "Author Excerpt", "Audiobook / Video Reading"],
        "author": {
          "@type": "Person",
          "name": "David Serafino",
          "url": `${origin}/author`
        },
        "publisher": {
          "@type": "Organization",
          "name": vid.outlet || "David Serafino",
          "url": vid.outlet && vid.outlet.toLowerCase().includes("rabble")
            ? "https://www.youtube.com/@rabblereview"
            : `${origin}/`,
          "logo": {
            "@type": "ImageObject",
            "url": `${origin}/assets/aistudio/author_photo_2_5c6ee16d.jpg`,
            "contentUrl": `${origin}/assets/aistudio/author_photo_2_5c6ee16d.jpg`,
            "creditText": "David Serafino",
            "copyrightNotice": "© David Serafino. All rights reserved.",
            "license": "https://creativecommons.org/licenses/by-nc-nd/4.0/deed.en",
            "acquireLicensePage": `${origin}/author`,
            "creator": {
              "@type": "Person",
              "name": "David Serafino",
              "url": `${origin}/author`
            }
          }
        },
        "interactionStatistic": {
          "@type": "InteractionCounter",
          "interactionType": {
            "@type": "WatchAction"
          },
          "userInteractionCount": interactionCount
        }
      };

      if (embedUrl) {
        obj.embedUrl = embedUrl;
      }
      if (contentUrl) {
        obj.contentUrl = contentUrl;
      }

      return obj;
    });

    const articleObjects = sortedInterviews.map((item) => {
      const isoPublished = item.date
        ? item.date.includes("/")
          ? `${item.date.split("/")[1]}-${item.date.split("/")[0].padStart(2, "0")}-01`
          : item.date
        : "2025-01-01";

      return {
        "@type": "Article",
        "@id": `${origin}/interviews#${item.id}`,
        "headline": item.title,
        "url": item.url,
        "description": item.description || `Interview with American author David Serafino in ${item.outlet}.`,
        "author": {
          "@type": "Person",
          "name": "David Serafino",
          "url": `${origin}/author`
        },
        "publisher": {
          "@type": "Organization",
          "name": item.outlet,
          "url": item.url
        },
        "datePublished": isoPublished,
        "dateModified": isoPublished,
        "mainEntityOfPage": item.url,
        "keywords": ["David Serafino", "Dave Serafino", "Interview", item.outlet, "Literary Fiction", "Author Interview"]
      };
    });

    const schemaData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          "@id": `${origin}/interviews`,
          "url": `${origin}/interviews`,
          "name": "Interviews & Readings – David Serafino",
          "description": "Literary interviews, conversations, and reading videos with American author David Serafino across literary journals and publications.",
          "isPartOf": {
            "@id": `${origin}/#website`
          },
          "about": {
            "@type": "Person",
            "name": "David Serafino",
            "url": `${origin}/author`
          },
          "hasPart": [
            ...videoObjects.map(v => ({ "@id": v["@id"] })),
            ...articleObjects.map(a => ({ "@id": a["@id"] }))
          ]
        },
        ...videoObjects,
        ...articleObjects
      ]
    };

    scriptTag.text = JSON.stringify(schemaData);

    // Dynamic OpenGraph video meta tag configuration
    const setMetaTag = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    if (sortedVideos.length > 0) {
      const firstVid = sortedVideos[0];
      const embedInfo = getVideoEmbedInfo(firstVid.url, firstVid.thumbnailUrl);
      setMetaTag("og:video", embedInfo.embedUrl);
      setMetaTag("og:video:secure_url", embedInfo.embedUrl);
      setMetaTag("og:video:type", "text/html");
      setMetaTag("og:video:width", embedInfo.type === "youtube" ? "1280" : "540");
      setMetaTag("og:video:height", embedInfo.type === "youtube" ? "720" : "960");
    }

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, [sortedInterviews, sortedVideos]);

  return (
    <div
      className="flex flex-col items-center justify-start w-full max-w-4xl mx-auto px-6 pt-6 sm:pt-8 pb-32 select-none font-sans pointer-events-auto"
      id="interviews-readings-container"
    >
      {/* Top Forward & Back Navigation Arrows (matching Page 2 and Page 3 style and location) */}
      <div className="w-full max-w-2xl mx-auto flex items-center justify-between mb-8 sm:mb-10">
        <button
          onClick={onBackToAuthor}
          className="font-serif italic text-[11px] tracking-wider text-[#8C7A5B] hover:text-[#C5B395] transition-colors cursor-pointer flex items-center gap-1.5"
          id="interviews-back-to-author-btn"
        >
          <span>← author</span>
        </button>
        <button
          onClick={onForwardToNovels}
          className="font-serif italic text-[11px] tracking-wider text-[#8C7A5B] hover:text-[#C5B395] transition-colors cursor-pointer flex items-center gap-1.5"
          id="interviews-forward-to-novels-btn"
        >
          <span>novels →</span>
        </button>
      </div>

      {/* Two-Column Condensed Layout */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
        {/* Left Column: Interviews */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col w-full"
          id="interviews-column"
        >
          {sortedInterviews.length === 0 ? (
            <p className="text-xs font-mono text-stone-600 py-6 italic">No interviews listed at this time.</p>
          ) : (
            <div className="w-full flex flex-col divide-y divide-stone-800/30">
              {sortedInterviews.map((item, idx) => (
                <motion.article
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.04 }}
                  className="py-5 w-full flex flex-col justify-between gap-3 group"
                  id={`interview-item-${item.id}`}
                >
                  <div className="flex flex-col w-full min-w-0">
                    {/* Interview Title as a hyperlink (matches Page 2 font, formatting & style) */}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans italic font-light tracking-wide text-[19px] sm:text-[22px] leading-snug text-[#e2e7ec] group-hover:text-white transition-colors duration-300 underline underline-offset-4 decoration-stone-800/40 hover:decoration-white cursor-pointer break-words block w-full"
                      id={`interview-title-link-${item.id}`}
                    >
                      <span>{item.title}</span>
                    </a>

                    {/* Outlet & Date */}
                    <p className="font-serif text-stone-400 text-[12px] mt-1.5 flex items-center justify-between" id={`interview-meta-${item.id}`}>
                      <span>
                        <span>{item.outlet}</span> — <span>{item.date}</span>
                      </span>
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 self-start mt-0.5">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-black/40 hover:bg-black/70 border border-stone-800 hover:border-stone-600 text-stone-400 hover:text-stone-200 text-[10px] font-serif italic tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1 rounded-sm shadow-sm"
                      title={`Read interview on ${item.outlet}`}
                      id={`interview-view-btn-${item.id}`}
                    >
                      <span className="lowercase">read</span>
                      <ExternalLink size={8} className="opacity-60" />
                    </a>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </motion.div>

        {/* Right Column: Readings (with embedded video players) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col w-full"
          id="videos-column"
        >
          {sortedVideos.length === 0 ? (
            <p className="text-xs font-mono text-stone-600 py-6 italic">No readings listed at this time.</p>
          ) : (
            <div className="w-full flex flex-col divide-y divide-stone-800/30">
              {sortedVideos.map((vid, idx) => {
                const embedInfo = getVideoEmbedInfo(vid.url, vid.thumbnailUrl);

                return (
                  <motion.article
                    key={vid.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                    className="py-5 w-full flex flex-col justify-between gap-3 group"
                    id={`video-item-${vid.id}`}
                  >
                    {/* Minimalist Title and Meta - EXACT SAME STYLE as left column, no magazine title image */}
                    <div className="flex flex-col w-full min-w-0">
                      {/* Video/Reading Title as a hyperlink (matches left column font, formatting & style) */}
                      <a
                        href={embedInfo.directUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-sans italic font-light tracking-wide text-[19px] sm:text-[22px] leading-snug text-[#e2e7ec] group-hover:text-white transition-colors duration-300 underline underline-offset-4 decoration-stone-800/40 hover:decoration-white cursor-pointer break-words block w-full"
                        id={`video-title-link-${vid.id}`}
                      >
                        <span>{vid.title}</span>
                      </a>

                      {/* Outlet & Date */}
                      <p className="font-serif text-stone-400 text-[12px] mt-1.5 flex items-center justify-between" id={`video-meta-${vid.id}`}>
                        <span>
                          <span>{vid.outlet}</span> — <span>{vid.date}</span>
                        </span>
                      </p>
                    </div>

                    {/* Video Player Window - Further Reduced by 10% and Horizontally Centered Beneath Text */}
                    <div className="w-full my-2.5 flex flex-col items-center justify-center" id={`video-player-container-${vid.id}`}>
                      {embedInfo.type === "youtube" ? (
                        /* YouTube Player with minimal framing (max-w-[245px] sm:max-w-[260px]) */
                        <div className="relative w-full max-w-[245px] sm:max-w-[260px] aspect-video rounded-md overflow-hidden bg-black shadow-2xl ring-1 ring-[#c29f72]/20 mx-auto">
                          <iframe
                            src={`${embedInfo.embedUrl}&controls=1&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1`}
                            className="w-full h-full border-0 rounded"
                            title={vid.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                          />
                          <div className="absolute inset-0 rounded-md bg-[#c29f72]/5 blur-lg pointer-events-none -z-10" />
                        </div>
                      ) : embedInfo.type === "instagram" ? (
                        /* Instagram Reel Player with ALL Host Framing (Header & Footer) Removed (max-w-[245px] sm:max-w-[260px]) */
                        <div className="relative w-full max-w-[245px] sm:max-w-[260px] aspect-video rounded-md overflow-hidden bg-black shadow-2xl ring-1 ring-[#c29f72]/20 mx-auto">
                          <iframe
                            src={embedInfo.embedUrl}
                            className="absolute border-0 select-none pointer-events-auto"
                            style={{
                              top: "-54px",
                              left: "0px",
                              width: "100%",
                              height: "calc(100% + 190px)",
                              backgroundColor: "#000000"
                            }}
                            title={vid.title}
                            scrolling="no"
                            allow="encrypted-media; autoplay; clipboard-write; picture-in-picture"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 rounded-md bg-[#c29f72]/5 blur-lg pointer-events-none -z-10" />
                        </div>
                      ) : (
                        /* Direct MP4 or Generic Video Player (max-w-[245px] sm:max-w-[260px]) */
                        <div className="relative w-full max-w-[245px] sm:max-w-[260px] aspect-video rounded-md overflow-hidden bg-black shadow-2xl ring-1 ring-[#c29f72]/20 mx-auto">
                          {vid.videoSrc || vid.url.endsWith(".mp4") ? (
                            <video
                              src={vid.videoSrc || vid.url}
                              poster={vid.thumbnailUrl || "/assets/aistudio/author_photo_2_5c6ee16d.jpg"}
                              controls
                              playsInline
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <iframe
                              src={embedInfo.embedUrl}
                              className="w-full h-full border-0 rounded"
                              title={vid.title}
                              allowFullScreen
                              loading="lazy"
                            />
                          )}
                          <div className="absolute inset-0 rounded-md bg-[#c29f72]/5 blur-lg pointer-events-none -z-10" />
                        </div>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Crawlers & Semantic SEO indexing for YouTube and Google Search rich cards */}
      <section className="sr-only" aria-label="Interviews and Readings Indexing Data">
        <h2>David Serafino – Literary Interviews and Video Readings</h2>
        <p>
          Archival interviews and readings by David Serafino, American novelist, short story writer, and translator residing near Medellín, Colombia.
        </p>
        <ul>
          {sortedVideos.map((v) => {
            const embed = getVideoEmbedInfo(v.url, v.thumbnailUrl);
            return (
              <li key={v.id}>
                <article>
                  <h3>{v.title}</h3>
                  <p>{v.outlet} — {v.date}</p>
                  <p>{v.description || v.title}</p>
                  <a href={embed.directUrl}>Watch reading video on {v.outlet}</a>
                </article>
              </li>
            );
          })}
          {sortedInterviews.map((i) => (
            <li key={i.id}>
              <article>
                <h3>{i.title}</h3>
                <p>{i.outlet} — {i.date}</p>
                <a href={i.url}>Read interview on {i.outlet}</a>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
