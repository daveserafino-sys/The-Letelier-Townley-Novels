import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Book, PaymentMerchantConfig } from "../types";
import { Download } from "lucide-react";
import PaymentPanel from "./PaymentPanel";

interface BookScrollProps {
  books: Book[];
  scrollY: number;
  merchantConfig?: PaymentMerchantConfig;
  targetBookId?: string | null;
  onSelectBook?: (bookId: string) => void;
}

const DEFAULT_BOOK_META: Record<string, { title: string; coverImage: string; synopsis: string[] }> = {
  corilocho: {
    title: "CORILOCHO",
    coverImage: "/assets/aistudio/Corilocho_cover_a3b33bf7.jpg",
    synopsis: [
      "Across three decades of political and social upheaval in Chile, four lives are entangled through marriage, ambition, ideology, and the pursuit of power. At the center of Corilocho is Orlando Letelier: driven by ambition and patriotism, he builds a career in politics and diplomacy while trying to preserve the personal relationships that give his life meaning. His marriage to Isabel unfolds alongside his growing responsibilities, as his political convictions draw him into an increasingly turbulent national landscape and the choices he makes lead to consequences for the people closest to him.",
      "Meanwhile, Michael Townley and Mariana Callejas are pursuing ambitions of their own. Their marriage draws them into the ideological circles of the Chilean right, where political commitment and personal advancement become increasingly difficult to separate. As saboteurs, and later assassins, their actions set in motion events that will intersect with and shape Orlando and Isabel's lives in the most consequential ways.",
      "A story of love, idealism, and betrayal, Corilocho traces the personal costs of choices made in the name of political conviction."
    ]
  },
  "saltwater-archives": {
    title: "SALTWATER ARCHIVES",
    coverImage: "/assets/aistudio/saltwater_archives_cover_5aad74d9.jpg",
    synopsis: [
      "As Chile descends into fascism, the ambitions and loyalties of four individuals draw them into an increasingly dangerous world.",
      "Michael Townley and Mariana Callejas find themselves at the center of a network operating behind the scenes of Chilean politics. Drawn by promises of wealth and influence, Mariana becomes increasingly involved with right-wing paramilitary men, while Michael discovers that his technical abilities offer opportunities far beyond ordinary employment.",
      "Meanwhile, Orlando Letelier is sent to Dawson Island, near the Antarctic Circle, where he and his fellow political detainees face harsh conditions and an uncertain future, and Isabel mounts an international campaign to save him even as the military regime targets her personally.",
      "As personal loyalties collide with political ambition, the consequences of personal choices extend far beyond the people who make them."
    ]
  },
  "we-are-sympathetic": {
    title: "WE ARE SYMPATHETIC",
    coverImage: "/assets/aistudio/we_are_sympathetic_cover_869e764f.jpg",
    synopsis: [
      "The Leteliers resume their lives in Washington after Orlando’s imprisonment and exile, where they emerge as leaders of the resistance to Chile’s military government. Determined to expose the regime's abuses and challenge its influence abroad, Orlando draws on his political experience and international connections, while Isabel founds a human rights institution and stages rallies that include a benefit concert at Madison Square Garden headlined by Joan Baez and Pete Seeger, where Orlando was the keynote speaker. But the demands of their public campaigns are matched by growing complications. His marriage to Isabel, tested by years of separation and political upheaval, faces new strains after an affair is exposed, which he’s still carrying on in secret.",
      "Meanwhile, Michael Townley and Mariana Callejas have become important operatives whose assignments take them from Miami to Mexico City and across Europe, where they cultivate alliances with far-right organizations and organize assassination plots targeting opponents of the Chilean government. As Mariana manages these relationships and Michael produces biological, chemical and conventional weapons, their private ambitions become inseparable from the regime's political violence.",
      "As Orlando's campaign gains momentum, Michael Townley is closing in, and the political conflict that has shaped their lives will resonate far beyond them."
    ]
  }
};

export default function BookScroll({ books, scrollY, merchantConfig, targetBookId }: BookScrollProps) {
  const [activePayment, setActivePayment] = useState<{
    book: Book;
    format: "pdf" | "epub";
  } | null>(null);

  // Ghost pop-up overlay state for hovered book
  const [popupBook, setPopupBook] = useState<Book | null>(null);
  
  // Interaction tracking refs
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOverTitleRef = useRef(false);
  const isOverModalRef = useRef(false);

  // Auto-scroll to targeted book on deep link
  useEffect(() => {
    if (targetBookId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`book-${targetBookId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [targetBookId]);

  // Close popup with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClosePopup();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openPopup = (book: Book) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setPopupBook(book);
  };

  const scheduleClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      if (!isOverTitleRef.current && !isOverModalRef.current) {
        setPopupBook(null);
      }
    }, 380);
  };

  const handleTitleMouseEnter = (book: Book) => {
    isOverTitleRef.current = true;
    openPopup(book);
  };

  const handleTitleMouseMove = (book: Book) => {
    isOverTitleRef.current = true;
    if (!popupBook || popupBook.id !== book.id) {
      openPopup(book);
    }
  };

  const handleTitleMouseLeave = () => {
    isOverTitleRef.current = false;
    scheduleClose();
  };

  const handleModalMouseEnter = () => {
    isOverModalRef.current = true;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleModalMouseLeave = () => {
    isOverModalRef.current = false;
    scheduleClose();
  };

  const handleClosePopup = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    isOverTitleRef.current = false;
    isOverModalRef.current = false;
    setPopupBook(null);
  };

  const handleDownload = (book: Book, format: "pdf" | "epub") => {
    if (book.id === "corilocho" || book.price === 0) {
      window.location.href = `/api/download/${book.id}/${format}`;
    } else {
      setActivePayment({ book, format });
    }
  };

  const currentMeta = popupBook
    ? {
        title: DEFAULT_BOOK_META[popupBook.id]?.title || popupBook.title.toUpperCase(),
        coverImage: popupBook.coverImage || DEFAULT_BOOK_META[popupBook.id]?.coverImage || "/assets/aistudio/Corilocho_cover_a3b33bf7.jpg",
        synopsis: DEFAULT_BOOK_META[popupBook.id]?.synopsis || popupBook.synopsis || []
      }
    : null;

  return (
    <div className="w-full max-w-xl mx-auto px-6 select-none font-sans flex flex-col items-center pointer-events-auto">
      {/* 
        Grouped titles with elegant, compact vertical rhythm 
      */}
      <div className="w-full flex flex-col gap-[180px] pt-[50vh] pb-36 pointer-events-auto">
        {books.map((book, idx) => {
          // Subtle parallax offset per title
          const titleParallax = scrollY * 0.08 * (idx + 1) * 0.4;

          return (
            <motion.div
              key={book.id}
              id={`book-${book.id}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.12 }}
              className="flex flex-col items-center w-full text-center pointer-events-auto"
              style={{
                transform: `translate3d(0, ${titleParallax}px, 0)`,
                willChange: "transform"
              }}
            >
              {/* Centered Title with cursor hover triggers for ghost cover & cursive synopsis */}
              <h2
                id={`title-heading-${book.id}`}
                onMouseEnter={() => handleTitleMouseEnter(book)}
                onMouseMove={() => handleTitleMouseMove(book)}
                onMouseLeave={handleTitleMouseLeave}
                className="font-sans italic font-light tracking-wide text-[24px] xs:text-[32px] sm:text-[48px] md:text-[54px] leading-tight text-[#e2e7ec] hover:text-white hover:drop-shadow-[0_0_12px_rgba(226,231,236,0.65)] transition-all duration-300 whitespace-nowrap text-center px-4 py-2 w-full cursor-pointer group select-none pointer-events-auto"
              >
                <span className="relative inline-block transition-transform duration-300 group-hover:scale-[1.03]">
                  {book.title}
                </span>
              </h2>
              
              {/* Centered Price underneath ($0 for complimentary, strip decimals for others) */}
              <div className="font-serif text-[14.3px] sm:text-[15.4px] text-[#8C7A5B] italic tracking-wide mt-1 mb-4 font-light pointer-events-auto">
                {book.price === 0 ? "$0" : `$${book.price}`}
              </div>

              {/* PDF and EPUB Buttons centered underneath */}
              <div className="flex items-center justify-center gap-2.5 pointer-events-auto">
                <button
                  id={`download-pdf-btn-${book.id}`}
                  onClick={() => handleDownload(book, "pdf")}
                  className="px-4 py-1.5 bg-black/50 hover:bg-black/80 border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-stone-100 text-xs font-serif italic tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 rounded-sm shadow-sm"
                  title="Download PDF"
                >
                  <span className="lowercase">pdf</span>
                  <Download size={9} className="opacity-70" />
                </button>

                <button
                  id={`download-epub-btn-${book.id}`}
                  onClick={() => handleDownload(book, "epub")}
                  className="px-4 py-1.5 bg-black/50 hover:bg-black/80 border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-stone-100 text-xs font-serif italic tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 rounded-sm shadow-sm"
                  title="Download EPUB"
                >
                  <span className="lowercase">epub</span>
                  <Download size={9} className="opacity-70" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 
        Ghost-like Minimalist Pop-up:
        - Background image remains fully visible beneath
        - No boxes, borders, buttons, or scrollbars
        - Cover and text laid over top in a faded, ghost-like manner
        - Classic cursive handwriting style
      */}
      <AnimatePresence>
        {popupBook && currentMeta && (
          <motion.div
            id="ghost-synopsis-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 md:p-6 pointer-events-none select-none bg-black/60 backdrop-blur-[1.5px] transition-colors duration-500"
          >
            <div 
              className="max-w-6xl xl:max-w-7xl w-full flex flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10 pointer-events-auto px-3 sm:px-6"
              onMouseEnter={handleModalMouseEnter}
              onMouseLeave={handleModalMouseLeave}
            >
              {/* Ghost-like Faded Cover Image (Always side-by-side, auto-scaled to viewport height) */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <img
                  src={currentMeta.coverImage}
                  alt={`${popupBook.title} cover`}
                  className="w-auto h-auto max-h-[46vh] sm:max-h-[52vh] md:max-h-[58vh] max-w-[130px] sm:max-w-[180px] md:max-w-[230px] lg:max-w-[270px] object-contain ghost-cover"
                  style={{
                    filter: "grayscale(100%) contrast(115%) brightness(92%)",
                    opacity: 0.82,
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7)"
                  }}
                />
              </div>

              {/* Ghost-like Constitutional Calligraphy Text (Compact sizing & line height with high legibility over dimmed backdrop) */}
              <div 
                className="flex-1 min-w-0 max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl font-constitution ghost-text select-text"
              >
                <div 
                  className="space-y-1.5 sm:space-y-2 text-[13.5px] xs:text-[14px] sm:text-[15px] md:text-[16px] lg:text-[17px] leading-[1.24] sm:leading-[1.26] md:leading-[1.3] font-normal tracking-wide text-[#f2f7fc]"
                  style={{ 
                    fontFamily: '"Pinyon Script", "Imperial Script", cursive',
                    textShadow: "0 0 12px rgba(220, 230, 240, 0.35), 0 1px 3px rgba(0, 0, 0, 0.99)"
                  }}
                >
                  {currentMeta.synopsis.map((paragraph, pIdx) => (
                    <p key={pIdx}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activePayment && (
          <PaymentPanel
            book={activePayment.book}
            format={activePayment.format}
            merchantConfig={merchantConfig}
            onClose={() => setActivePayment(null)}
            onSuccess={() => {
              window.location.href = `/api/download/${activePayment.book.id}/${activePayment.format}`;
              setActivePayment(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
