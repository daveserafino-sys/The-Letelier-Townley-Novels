import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Download, Link as LinkIcon, Check } from "lucide-react";
import { Publication } from "../types";
import { sortPublicationsChronological } from "../utils/publications";

interface PublicationsListProps {
  publications: Publication[];
  onBack: () => void;
  targetStoryId?: string | null;
  onSelectStory?: (storyId: string) => void;
}

export default function PublicationsList({ publications, onBack, targetStoryId, onSelectStory }: PublicationsListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDownload = (pubId: string, format: "pdf" | "epub") => {
    window.location.href = `/api/download/${pubId}/${format}`;
  };

  const handleCopyLink = (pubId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/stories/${pubId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(pubId);
      setTimeout(() => setCopiedId(null), 2500);
    });
    if (onSelectStory) {
      onSelectStory(pubId);
    }
  };

  // Sort publications in chronological order with the newest stories at the top
  const sortedPublications = sortPublicationsChronological(publications);

  // Auto-scroll to target story when deep-linked
  useEffect(() => {
    if (targetStoryId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`pub-item-${targetStoryId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [targetStoryId]);

  return (
    <div className="flex flex-col items-center justify-start w-full max-w-2xl mx-auto px-6 pt-[12vh] pb-32 select-none font-sans pointer-events-auto" id="publications-container">
      {/* Return Button */}
      <div className="w-full flex items-center justify-between mb-10">
        <button
          onClick={onBack}
          className="font-serif italic text-[11px] tracking-wider text-[#8C7A5B] hover:text-[#C5B395] transition-colors cursor-pointer flex items-center gap-1.5"
          id="return-manuscripts-btn"
        >
          <span>← back</span>
        </button>
      </div>

      {sortedPublications.length === 0 ? (
        <div className="text-center py-12 w-full">
          <p className="text-sm font-mono text-stone-600">No entries listed at this time.</p>
        </div>
      ) : (
        <div className="w-full flex flex-col">
          <div className="w-full flex flex-col gap-2">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col divide-y divide-stone-800/30"
            >
              {sortedPublications.map((pub, idx) => {
                const isTargeted = targetStoryId === pub.id;

                return (
                  <motion.div
                    key={pub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.03 }}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6 w-full min-w-0 transition-all duration-500 rounded px-2 ${
                      isTargeted ? "bg-[#c29f72]/10 ring-1 ring-[#c29f72]/30" : ""
                    }`}
                    id={`pub-item-${pub.id}`}
                  >
                    <div className="flex flex-col w-full sm:max-w-md md:max-w-lg min-w-0">
                      {/* Story title as a hyperlink */}
                      <a
                        href={pub.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-sans italic font-light tracking-wide text-[22px] sm:text-[29px] leading-snug text-[#e2e7ec] hover:text-white transition-colors duration-300 underline underline-offset-4 decoration-stone-800/40 hover:decoration-white cursor-pointer break-words whitespace-normal block w-full"
                        id={`pub-title-link-${pub.id}`}
                      >
                        {pub.title}
                      </a>
                      
                      {/* Place & date of publication */}
                      <p className="font-serif text-stone-400 text-[12px] mt-1.5" id={`pub-metadata-${pub.id}`}>
                        {pub.outlet} — {pub.date}
                      </p>
                    </div>

                    {/* PDF, EPUB, and Direct Story Link buttons */}
                    <div className="flex items-center gap-2 sm:shrink-0 mt-1 sm:mt-0" id={`pub-downloads-${pub.id}`}>
                      <button
                        onClick={(e) => handleCopyLink(pub.id, e)}
                        className={`px-2.5 py-1 bg-black/40 hover:bg-black/70 border ${
                          copiedId === pub.id ? "border-[#c29f72] text-[#ffd29c]" : "border-stone-800 hover:border-stone-600 text-stone-400 hover:text-stone-200"
                        } text-[10px] font-serif italic tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1 rounded-sm shadow-sm`}
                        title="Copy direct shareable link for this story"
                        id={`pub-copy-link-${pub.id}`}
                      >
                        {copiedId === pub.id ? (
                          <>
                            <span className="lowercase">copied</span>
                            <Check size={8} className="text-[#c29f72]" />
                          </>
                        ) : (
                          <>
                            <span className="lowercase">link</span>
                            <LinkIcon size={8} className="opacity-60" />
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownload(pub.id, "pdf")}
                        className="px-3 py-1 bg-black/40 hover:bg-black/70 border border-stone-800 hover:border-stone-600 text-stone-400 hover:text-stone-200 text-[10px] font-serif italic tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1 rounded-sm shadow-sm"
                        title="Download PDF"
                        id={`pub-download-pdf-${pub.id}`}
                      >
                        <span className="lowercase">pdf</span>
                        <Download size={8} className="opacity-60" />
                      </button>
                      <button
                        onClick={() => handleDownload(pub.id, "epub")}
                        className="px-3 py-1 bg-black/40 hover:bg-black/70 border border-stone-800 hover:border-stone-600 text-stone-400 hover:text-stone-200 text-[10px] font-serif italic tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1 rounded-sm shadow-sm"
                        title="Download EPUB"
                        id={`pub-download-epub-${pub.id}`}
                      >
                        <span className="lowercase">epub</span>
                        <Download size={8} className="opacity-60" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
