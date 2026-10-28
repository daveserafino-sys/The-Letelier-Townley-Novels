import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

interface AuthorProfileProps {
  onBackToNovels: () => void;
  onBackToStories: () => void;
}

export default function AuthorProfile({ onBackToNovels, onBackToStories }: AuthorProfileProps) {
  const [photoSrc, setPhotoSrc] = useState<string>("/assets/aistudio/author_photo_2_5c6ee16d.jpg");

  // In-page ProfilePage Schema.org Structured Data Injection
  useEffect(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://ais-dev-j62lknibbeenstvlcaq4aq-849540705850.us-east1.run.app";
    const scriptId = "schema-profile-page-jsonld";

    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement("script");
      scriptTag.id = scriptId;
      scriptTag.type = "application/ld+json";
      document.head.appendChild(scriptTag);
    }

    const bioText = "David Serafino is an American writer and translator who lives near Medellín, Colombia, and whose work has appeared in AGNI, The Common, The Los Angeles Review, and various other magazines and websites in the U.S., U.K., Canada and India, several of which have been nominated for prizes such as the O. Henry, Pushcart, Best of the Net, and the WSFA award. He has an MFA in Fiction from the University of Virginia, a BA in English from the College of William and Mary, has lived in a dozen countries, and has also written a novel in Spanish. All novels and stories are available for representation.";

    const profileData = {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "@id": `${origin}/author#profilepage`,
      "url": `${origin}/author`,
      "name": "David Serafino – Author Profile",
      "headline": "Novels & Stories by David Serafino",
      "dateCreated": "2026-01-01T00:00:00Z",
      "dateModified": new Date().toISOString(),
      "description": "Author profile and bio of David Serafino, American writer and translator who lives near Medellín, Colombia.",
      "mainEntity": {
        "@type": "Person",
        "@id": `${origin}/#author`,
        "name": "David Serafino",
        "alternateName": ["Dave Serafino", "David Serafino (Author)"],
        "jobTitle": "Writer and Translator",
        "nationality": "United States",
        "homeLocation": {
          "@type": "Place",
          "name": "Medellín, Colombia"
        },
        "description": bioText,
        "image": {
          "@type": "ImageObject",
          "url": `${origin}/assets/aistudio/author_photo_2_5c6ee16d.jpg`,
          "caption": "David Serafino – Author Photo"
        },
        "alumniOf": [
          {
            "@type": "CollegeOrUniversity",
            "name": "University of Virginia",
            "description": "MFA in Fiction"
          },
          {
            "@type": "CollegeOrUniversity",
            "name": "College of William and Mary",
            "description": "BA in English"
          }
        ],
        "knowsAbout": [
          "Fiction Writing",
          "Literary Translation",
          "Chilean History",
          "Operation Condor",
          "The Letelier / Townley Novels",
          "Spanish Language Literature"
        ],
        "sameAs": [
          "https://www.instagram.com/daveserafino/",
          "https://www.facebook.com/dave.serafino.7"
        ]
      }
    };

    scriptTag.text = JSON.stringify(profileData);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto px-6 pt-[12vh] pb-32 select-none font-sans flex flex-col items-center pointer-events-auto" id="author-profile-container">
      {/* Return & Navigation with Yellow Arrows (matching Page 2 style) */}
      <div className="w-full flex items-center justify-between mb-10">
        <button
          onClick={onBackToStories}
          className="font-serif italic text-[11px] tracking-wider text-[#8C7A5B] hover:text-[#C5B395] transition-colors cursor-pointer flex items-center gap-1.5"
          id="profile-back-to-stories"
        >
          <span>← stories</span>
        </button>
        <button
          onClick={onBackToNovels}
          className="font-serif italic text-[11px] tracking-wider text-[#8C7A5B] hover:text-[#C5B395] transition-colors cursor-pointer flex items-center gap-1.5"
          id="profile-forward-to-novels"
        >
          <span>novels →</span>
        </button>
      </div>

      {/* Author Portrait - Centered */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative mb-10 flex justify-center"
      >
        <div className="relative w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full overflow-hidden p-1 bg-gradient-to-b from-[#c29f72]/40 via-stone-800/40 to-black shadow-2xl ring-1 ring-stone-700/50">
          <img
            src={photoSrc}
            onError={() => setPhotoSrc("/author_photo.jpg")}
            alt="David Serafino"
            className="w-full h-full object-cover rounded-full grayscale contrast-[112%] brightness-[92%] sepia-[8%] transition-transform duration-700 hover:scale-105"
          />
        </div>
        {/* Subtle photographic glow */}
        <div className="absolute inset-0 rounded-full bg-[#c29f72]/5 blur-xl pointer-events-none -z-10" />
      </motion.div>

      {/* Author Biography Text */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="w-full max-w-xl text-center px-4"
      >
        <div className="p-6 sm:p-8 rounded-lg bg-black/40 border border-stone-800/60 backdrop-blur-xs shadow-xl relative">
          <p className="font-serif italic font-light text-stone-200 text-sm sm:text-base md:text-[17px] leading-relaxed tracking-wide text-center">
            David Serafino is an American writer and translator who lives near Medellín, Colombia, and whose work has appeared in AGNI, The Common, The Los Angeles Review, and various other magazines and websites in the U.S., U.K., Canada and India, several of which have been nominated for prizes such as the O. Henry, Pushcart, Best of the Net, and the WSFA award. He has an MFA in Fiction from the University of Virginia, a BA in English from the College of William and Mary, has lived in a dozen countries, and has also written a novel in Spanish. All novels and stories are available for representation.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
