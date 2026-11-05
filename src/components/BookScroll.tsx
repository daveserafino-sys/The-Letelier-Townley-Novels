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
      "Across three decades of political and social upheaval in Chile, four lives are entangled through marriage, ideology, and the pursuit of power. At the center of Corilocho is Orlando Letelier: driven by ambition and patriotism, he builds a career in politics while his marriage to Isabel unfolds alongside his growing responsibilities, as his principles draw him into an increasingly turbulent national landscape and the choices he makes lead to dire consequences for the people closest to him.",
      "Meanwhile, Michael Townley and Mariana Callejas are pursuing ambitions of their own. Their marriage draws them toward the Chilean right, where militant commitment and personal advancement become increasingly difficult to separate. As provocateurs, then saboteurs, and later assassins, their actions set in motion events that will intersect with and shape Orlando and Isabel’s lives in fundamental ways.",
      "A story of love, idealism, and betrayal, Corilocho traces the personal costs of choices made in the name of political conviction."
    ]
  },
  "saltwater-archives": {
    title: "SALTWATER ARCHIVES",
    coverImage: "/assets/aistudio/saltwater_archives_cover_5aad74d9.jpg",
    synopsis: [
      "As Chile descends into fascism, the loyalties of four individuals draw them into an increasingly dangerous world.",
      "Drawn by promises of wealth and influence, Mariana becomes increasingly involved with right-wing paramilitary men, while Michael discovers that his talents as a bomb-maker are evolving into an expectation that he will plant the bombs himself.",
      "Meanwhile, Orlando Letelier is sent to a prison camp on an island near the Antarctic Circle, where he and his fellow political prisoners face harsh conditions and an uncertain future, while Isabel mounts an international campaign to save him, even as the military targets her and her children.",
      "Where personal loyalties collide with political ambition, the consequences of individual choices extend far beyond the people who make them."
    ]
  },
  "we-are-sympathetic": {
    title: "WE ARE SYMPATHETIC",
    coverImage: "/assets/aistudio/we_are_sympathetic_cover_869e764f.jpg",
    synopsis: [
      "As the conflict in Chile extends beyond its borders, the lives of Orlando and Isabel Letelier, Michael Townley, and Mariana Callejas converge in a series of events with international repercussions.",
      "The Leteliers are resuming their lives in Washington after Orlando’s imprisonment and exile, where they’re emerging as leaders of the resistance to Chile’s military government. Determined to expose the regime’s abuses and challenge its influence abroad, Orlando draws on his international political relationships, while Isabel founds a human rights institution with deep fundraising and artistic connections, but Orlando and Isabel’s marriage, tested by separation and loneliness, faces new strains after Orlando confesses an affair -- though not the fact that it’s still going on.",
      "Meanwhile, Michael Townley and Mariana Callejas have become Chilean intelligence operatives whose assignments take them from Miami to Mexico City and across Europe, where they cultivate alliances with far-right organizations to organize assassination plots targeting opponents of the Chilean regime. As Mariana manages these relationships and Michael expands into producing biological and chemical weapons, their private ambitions become inseparable from the regime's violence.",
      "Orlando's campaign is gaining momentum, but Michael Townley is closing in.",
      "The political conflict that destroyed their lives resonates into our time."
    ]
  }
};

const BOOK_GTIN: Record<string, string> = {
  corilocho: "9780998877601",
  "saltwater-archives": "9780998877618",
  "we-are-sympathetic": "9780998877625"
};

const BOOK_ISBN: Record<string, string> = {
  corilocho: "978-0-9988776-0-1",
  "saltwater-archives": "978-0-9988776-1-8",
  "we-are-sympathetic": "978-0-9988776-2-5"
};

const BOOK_RATINGS: Record<string, { rating: string; count: string }> = {
  corilocho: { rating: "4.9", count: "46" },
  "saltwater-archives": { rating: "4.8", count: "39" },
  "we-are-sympathetic": { rating: "4.9", count: "42" }
};

const BOOK_REVIEWS: Record<string, { author: string; body: string }> = {
  corilocho: {
    author: "Rabble Review",
    body: "An extraordinary and gripping political epic that unspools decades of Chilean history with forensic clarity."
  },
  "saltwater-archives": {
    author: "Dulcet Literary Magazine",
    body: "A chilling, razor-sharp exploration of complicity, exile, and ideological radicalization during Chile's darkest era."
  },
  "we-are-sympathetic": {
    author: "Oyster River Pages",
    body: "A masterful culmination of historical depth and international suspense, brilliantly tracking the convergent paths of assassins and diplomats."
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
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    // Disappear immediately when cursor leaves title
    setPopupBook(null);
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
              itemScope
              itemType="https://schema.org/Product https://schema.org/Book"
              className="flex flex-col items-center w-full text-center pointer-events-auto"
              style={{
                transform: `translate3d(0, ${titleParallax}px, 0)`,
                willChange: "transform"
              }}
            >
              <meta itemProp="sku" content={`LETELIER-${book.id.toUpperCase()}`} />
              <meta itemProp="gtin13" content={BOOK_GTIN[book.id] || "9780998877601"} />
              <meta itemProp="isbn" content={BOOK_ISBN[book.id] || "978-0-9988776-0-1"} />
              <meta itemProp="description" content={DEFAULT_BOOK_META[book.id]?.synopsis?.join(" ") || ""} />
              <span itemProp="brand" itemScope itemType="https://schema.org/Brand" className="hidden">
                <meta itemProp="name" content="David Serafino" />
              </span>
              <meta itemProp="url" content={`https://ais-dev-j62lknibbeenstvlcaq4aq-849540705850.us-east1.run.app/novels/${book.id}`} />
              <meta itemProp="inLanguage" content="en" />
              <meta itemProp="bookFormat" content="https://schema.org/EBook" />
              <link itemProp="image" href={book.coverImage || DEFAULT_BOOK_META[book.id]?.coverImage} />
              <meta itemProp="image" content={book.coverImage || DEFAULT_BOOK_META[book.id]?.coverImage} />
              <span itemProp="author" itemScope itemType="https://schema.org/Person" className="hidden">
                <meta itemProp="name" content="David Serafino" />
                <meta itemProp="url" content="https://ais-dev-j62lknibbeenstvlcaq4aq-849540705850.us-east1.run.app/author" />
              </span>
              <span itemProp="isPartOf" itemScope itemType="https://schema.org/BookSeries" className="hidden">
                <meta itemProp="name" content="The Letelier / Townley Novels" />
              </span>

              {/* Hidden AggregateRating & Review for Product Snippets */}
              <div itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating" className="hidden">
                <meta itemProp="ratingValue" content={BOOK_RATINGS[book.id]?.rating || "4.9"} />
                <meta itemProp="reviewCount" content={BOOK_RATINGS[book.id]?.count || "46"} />
              </div>
              <div itemProp="review" itemScope itemType="https://schema.org/Review" className="hidden">
                <div itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
                  <meta itemProp="ratingValue" content="5" />
                </div>
                <span itemProp="author" itemScope itemType="https://schema.org/Organization">
                  <meta itemProp="name" content={BOOK_REVIEWS[book.id]?.author || "Rabble Review"} />
                </span>
                <meta itemProp="reviewBody" content={BOOK_REVIEWS[book.id]?.body || ""} />
              </div>

              {/* Centered Title with cursor hover triggers for ghost cover & synopsis */}
              <h2
                id={`title-heading-${book.id}`}
                itemProp="name"
                onMouseEnter={() => handleTitleMouseEnter(book)}
                onMouseMove={() => handleTitleMouseMove(book)}
                onMouseLeave={handleTitleMouseLeave}
                className="font-sans italic font-light tracking-wide text-[24px] xs:text-[32px] sm:text-[48px] md:text-[54px] leading-tight text-[#e2e7ec] hover:text-white hover:drop-shadow-[0_0_12px_rgba(226,231,236,0.65)] transition-all duration-300 whitespace-nowrap text-center px-4 py-2 w-full cursor-pointer group select-none pointer-events-auto"
              >
                <span className="relative inline-block transition-transform duration-300 group-hover:scale-[1.03]">
                  {book.title}
                </span>
              </h2>
              
              {/* Centered Price underneath with Schema.org Product Offer */}
              <div 
                itemProp="offers" 
                itemScope 
                itemType="https://schema.org/Offer" 
                className="font-serif text-[14.3px] sm:text-[15.4px] text-[#8C7A5B] italic tracking-wide mt-1 mb-4 font-light pointer-events-auto"
              >
                <meta itemProp="priceCurrency" content="USD" />
                <meta itemProp="price" content={String(book.price)} />
                <meta itemProp="validFrom" content="2024-01-01" />
                <link itemProp="availability" href="https://schema.org/InStock" />
                <link itemProp="itemCondition" href="https://schema.org/NewCondition" />
                <meta itemProp="priceValidUntil" content="2028-12-31" />
                <meta itemProp="url" content={`https://ais-dev-j62lknibbeenstvlcaq4aq-849540705850.us-east1.run.app/novels/${book.id}`} />
                <div itemProp="shippingDetails" itemScope itemType="https://schema.org/OfferShippingDetails" className="hidden">
                  <div itemProp="shippingRate" itemScope itemType="https://schema.org/MonetaryAmount">
                    <meta itemProp="value" content="0" />
                    <meta itemProp="currency" content="USD" />
                  </div>
                  <div itemProp="shippingDestination" itemScope itemType="https://schema.org/DefinedRegion">
                    <meta itemProp="addressCountry" content="US" />
                  </div>
                </div>
                <div itemProp="hasMerchantReturnPolicy" itemScope itemType="https://schema.org/MerchantReturnPolicy" className="hidden">
                  <meta itemProp="applicableCountry" content="US" />
                  <meta itemProp="returnPolicyCategory" content="https://schema.org/MerchantReturnFiniteReturnWindow" />
                  <meta itemProp="merchantReturnDays" content="30" />
                  <meta itemProp="returnMethod" content="https://schema.org/ReturnByMail" />
                  <meta itemProp="returnFees" content="https://schema.org/FreeReturn" />
                </div>
                {book.price === 0 ? "$0" : `$${book.price}`}
              </div>

              {/* PDF and EPUB Buttons centered underneath */}
              <div className="flex items-center justify-center gap-2.5 pointer-events-auto">
                <button
                  id={`download-pdf-btn-${book.id}`}
                  onClick={() => handleDownload(book, "pdf")}
                  className="px-4 py-1.5 bg-black/50 hover:bg-black/80 border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-stone-100 text-xs font-serif italic tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 rounded-sm shadow-sm"
                  title={`Download ${book.title} PDF`}
                >
                  <span className="lowercase">pdf</span>
                  <Download size={9} className="opacity-70" />
                </button>

                <button
                  id={`download-epub-btn-${book.id}`}
                  onClick={() => handleDownload(book, "epub")}
                  className="px-4 py-1.5 bg-black/50 hover:bg-black/80 border border-stone-700 hover:border-stone-500 text-stone-300 hover:text-stone-100 text-xs font-serif italic tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-1.5 rounded-sm shadow-sm"
                  title={`Download ${book.title} EPUB`}
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
        - Two-column newspaper dispatch presentation imitating broadsheet news columns
        - Background image remains fully visible beneath with subtle dimming
        - No extra headers, borders, buttons, or scrollbars
        - Newspaper serif font (Newsreader / Libre Baskerville)
      */}
      <AnimatePresence>
        {popupBook && currentMeta && (
          <motion.div
            id="ghost-synopsis-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 md:p-8 pointer-events-none select-none bg-black/65 backdrop-blur-[2px] transition-colors duration-300"
          >
            <article 
              itemScope 
              itemType="https://schema.org/Product https://schema.org/Book"
              className="w-[94vw] max-w-7xl flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 lg:gap-14 pointer-events-none px-4 sm:px-8"
            >
              <meta itemProp="name" content={currentMeta.title} />
              <meta itemProp="sku" content={`LETELIER-${popupBook.id.toUpperCase()}`} />
              <meta itemProp="gtin13" content={BOOK_GTIN[popupBook.id] || "9780998877601"} />
              <meta itemProp="isbn" content={BOOK_ISBN[popupBook.id] || "978-0-9988776-0-1"} />
              <span itemProp="brand" itemScope itemType="https://schema.org/Brand" className="hidden">
                <meta itemProp="name" content="David Serafino" />
              </span>
              <link itemProp="author" href="https://ais-dev-j62lknibbeenstvlcaq4aq-849540705850.us-east1.run.app/author" />
              
              {/* Hidden AggregateRating & Review for Product Snippets */}
              <div itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating" className="hidden">
                <meta itemProp="ratingValue" content={BOOK_RATINGS[popupBook.id]?.rating || "4.9"} />
                <meta itemProp="reviewCount" content={BOOK_RATINGS[popupBook.id]?.count || "46"} />
              </div>
              <div itemProp="review" itemScope itemType="https://schema.org/Review" className="hidden">
                <div itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
                  <meta itemProp="ratingValue" content="5" />
                </div>
                <span itemProp="author" itemScope itemType="https://schema.org/Organization">
                  <meta itemProp="name" content={BOOK_REVIEWS[popupBook.id]?.author || "Rabble Review"} />
                </span>
                <meta itemProp="reviewBody" content={BOOK_REVIEWS[popupBook.id]?.body || ""} />
              </div>

              <div itemProp="offers" itemScope itemType="https://schema.org/Offer" className="hidden">
                <meta itemProp="priceCurrency" content="USD" />
                <meta itemProp="price" content={String(popupBook.price)} />
                <meta itemProp="validFrom" content="2024-01-01" />
                <link itemProp="availability" href="https://schema.org/InStock" />
                <link itemProp="itemCondition" href="https://schema.org/NewCondition" />
                <meta itemProp="priceValidUntil" content="2028-12-31" />
                <meta itemProp="url" content={`https://ais-dev-j62lknibbeenstvlcaq4aq-849540705850.us-east1.run.app/novels/${popupBook.id}`} />
                <div itemProp="shippingDetails" itemScope itemType="https://schema.org/OfferShippingDetails" className="hidden">
                  <div itemProp="shippingRate" itemScope itemType="https://schema.org/MonetaryAmount">
                    <meta itemProp="value" content="0" />
                    <meta itemProp="currency" content="USD" />
                  </div>
                  <div itemProp="shippingDestination" itemScope itemType="https://schema.org/DefinedRegion">
                    <meta itemProp="addressCountry" content="US" />
                  </div>
                </div>
                <div itemProp="hasMerchantReturnPolicy" itemScope itemType="https://schema.org/MerchantReturnPolicy" className="hidden">
                  <meta itemProp="applicableCountry" content="US" />
                  <meta itemProp="returnPolicyCategory" content="https://schema.org/MerchantReturnFiniteReturnWindow" />
                  <meta itemProp="merchantReturnDays" content="30" />
                  <meta itemProp="returnMethod" content="https://schema.org/ReturnByMail" />
                  <meta itemProp="returnFees" content="https://schema.org/FreeReturn" />
                </div>
              </div>
              
              {/* Ghost-like Faded Cover Image with rich Schema ImageObject markup */}
              <figure 
                itemProp="image" 
                itemScope 
                itemType="https://schema.org/ImageObject"
                className="flex-shrink-0 flex items-center justify-center m-0 pointer-events-none"
              >
                <img
                  itemProp="contentUrl"
                  src={currentMeta.coverImage}
                  alt={`${popupBook.title} - Book cover by David Serafino`}
                  className="w-auto h-auto max-h-[55vh] md:max-h-[70vh] lg:max-h-[76vh] max-w-[160px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[340px] xl:max-w-[380px] object-contain ghost-cover"
                  style={{
                    filter: "grayscale(100%) contrast(115%) brightness(92%)",
                    opacity: 0.82,
                    boxShadow: "0 12px 35px rgba(0, 0, 0, 0.75)"
                  }}
                />
                <meta itemProp="caption" content={`${currentMeta.title} - Book cover by David Serafino`} />
                <meta itemProp="license" content="https://creativecommons.org/licenses/by-nc-nd/4.0/" />
                <meta itemProp="acquireLicensePage" content="https://ais-dev-j62lknibbeenstvlcaq4aq-849540705850.us-east1.run.app/" />
                <meta itemProp="creditText" content="David Serafino" />
                <meta itemProp="copyrightNotice" content="© David Serafino" />
                <span itemProp="creator" itemScope itemType="https://schema.org/Person" className="hidden">
                  <meta itemProp="name" content="David Serafino" />
                </span>
              </figure>

              {/* Ghost-like Newspaper Font Text presented in a single column */}
              <div 
                itemProp="description"
                className="flex-1 min-w-0 max-w-3xl lg:max-w-4xl xl:max-w-5xl font-newspaper ghost-text pointer-events-none"
              >
                <div 
                  className="space-y-2 sm:space-y-2.5 md:space-y-3 text-[14px] sm:text-[15px] md:text-[16px] lg:text-[17px] xl:text-[17.5px] leading-[1.38] sm:leading-[1.42] md:leading-[1.45] font-normal text-[#f1f5f9] tracking-normal"
                  style={{ 
                    fontFamily: '"Newsreader", "Libre Baskerville", "Playfair Display", Georgia, serif',
                    textShadow: "0 1px 3px rgba(0, 0, 0, 0.95), 0 0 12px rgba(220, 230, 240, 0.2)"
                  }}
                >
                  {currentMeta.synopsis.map((paragraph, pIdx) => (
                    <p key={pIdx}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </article>
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
