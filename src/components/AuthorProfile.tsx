import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface AuthorProfileProps {
  onBackToNovels: () => void;
  onBackToStories: () => void;
}

interface AuthorPhotoItem {
  src: string;
  title: string;
  alt: string;
  caption: string;
  description: string;
}

const AUTHOR_PHOTOS: AuthorPhotoItem[] = [
  {
    src: "/assets/aistudio/author_photo_2_5c6ee16d.jpg",
    title: "David Serafino – Author Portrait",
    alt: "David Serafino, American writer and translator in light linen shirt outdoors",
    caption: "David Serafino – American author of the Letelier / Townley Trilogy",
    description: "Primary author portrait of American writer and translator David Serafino, residing near Medellín, Colombia, author of the Letelier / Townley Trilogy and short stories nominated for the Pushcart and O. Henry prizes."
  },
  {
    src: "/assets/aistudio/author_photo_9_e35bd35a.jpg",
    title: "David Serafino Waterfront Portrait",
    alt: "David Serafino in grey shirt outdoors with boats and nautical waterfront background",
    caption: "David Serafino along the coast",
    description: "Portrait of novelist David Serafino by a nautical harbor and boats, echoing maritime themes from The Saltwater Archives."
  },
  {
    src: "/assets/aistudio/author_photo_7_8081e1cc.jpg",
    title: "David Serafino Alpine Skiing",
    alt: "David Serafino in winter jacket, hat, and sunglasses on sunny snow-covered ski slope",
    caption: "David Serafino alpine skiing in winter mountains",
    description: "Author David Serafino on a sunny alpine ski slope with snow-covered pine slopes, reflecting his outdoor life and world travels."
  },
  {
    src: "/assets/aistudio/author_photo_2_ec6870b5.jpg",
    title: "David Serafino at Outdoor Cafe",
    alt: "Writer David Serafino seated under red sun umbrella wearing dark glasses",
    caption: "David Serafino writing outdoors near Medellín, Colombia",
    description: "Fiction author David Serafino at an outdoor courtyard cafe, writing and editing stories published in AGNI, The Common, and The Los Angeles Review."
  },
  {
    src: "/assets/aistudio/author_photo_5_ff97f8e3.jpg",
    title: "David Serafino at Ancient Antiquities",
    alt: "David Serafino standing in front of ancient Egyptian wall reliefs and hieroglyphics",
    caption: "David Serafino exploring world historical sites",
    description: "Novelist David Serafino visiting ancient stone relief carvings and monuments during his residence in a dozen countries worldwide."
  },
  {
    src: "/assets/aistudio/author_photo_6_39d30ab4.jpg",
    title: "David Serafino Formal Literary Portrait",
    alt: "Author David Serafino dressed in dark suit and striped red tie looking upwards",
    caption: "David Serafino formal literary portrait",
    description: "Formal portrait of David Serafino, holder of an MFA in Fiction from the University of Virginia and BA in English from the College of William and Mary."
  },
  {
    src: "/assets/aistudio/author_photo_8_56c16854.jpg",
    title: "David Serafino Window Portrait",
    alt: "David Serafino resting on a window sill overlooking a sunny plaza and trees",
    caption: "David Serafino looking over a sunlit courtyard",
    description: "David Serafino leaning comfortably on an open window frame looking out onto sunlit plazas and historic architecture."
  },
  {
    src: "/assets/aistudio/author_photo_10_5f0134bb.jpg",
    title: "David Serafino Pond Hockey",
    alt: "David Serafino skating with ice hockey stick and puck on frozen lake",
    caption: "David Serafino playing ice hockey on a frozen outdoor pond",
    description: "Author David Serafino skating and stickhandling a puck across natural outdoor frozen pond ice on a crisp winter afternoon."
  },
  {
    src: "/assets/aistudio/serafino2_509ea778.jpg",
    title: "David Serafino Literary Portrait",
    alt: "Portrait of American author David Serafino",
    caption: "David Serafino – Writer, Novelist, and Literary Translator",
    description: "Portrait photograph of David Serafino, American writer and translator whose fiction and novel trilogy explore historical and literary themes."
  }
];

export default function AuthorProfile({ onBackToNovels, onBackToStories }: AuthorProfileProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);

  // Preload all author photos to prevent any flicker during rotations
  useEffect(() => {
    AUTHOR_PHOTOS.forEach((photo) => {
      const img = new Image();
      img.src = photo.src;
    });
  }, []);

  // Rotate author photo every 5 seconds (5000ms)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentPhotoIndex((prev) => (prev + 1) % AUTHOR_PHOTOS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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

    const bioText = "David Serafino is an American writer, painter, travel photographer and translator who lives near Medellín, Colombia with his son and pups. His short stories have appeared in AGNI, The Common, The Los Angeles Review, and various other magazines and websites in the U.S., U.K., Canada and India, several of which have been nominated for prizes such as the O. Henry, Pushcart, Best of the Net, and the WSFA award. He has an MFA in Fiction from the University of Virginia, a BA in English from the College of William and Mary, has lived in a dozen countries, and has recently written a novel in Spanish. His travel photography is on Instagram at the link below. All novels and stories are available for representation.";

    // Schema.org ImageObject structured metadata for Google Image Search
    const imageObjects = AUTHOR_PHOTOS.map((photo, index) => ({
      "@type": "ImageObject",
      "@id": `${origin}${photo.src}#image`,
      "url": `${origin}${photo.src}`,
      "contentUrl": `${origin}${photo.src}`,
      "name": photo.title,
      "caption": photo.caption,
      "description": photo.description,
      "author": {
        "@type": "Person",
        "name": "David Serafino"
      },
      "creator": {
        "@type": "Person",
        "name": "David Serafino"
      },
      "copyrightHolder": {
        "@type": "Person",
        "name": "David Serafino"
      },
      "representativeOfPage": index === 0
    }));

    const profileData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ProfilePage",
          "@id": `${origin}/author#profilepage`,
          "url": `${origin}/author`,
          "name": "David Serafino – Author Profile",
          "headline": "The Letelier / Townley Novels & Selected Publications",
          "dateCreated": "2026-01-01T00:00:00Z",
          "dateModified": new Date().toISOString(),
          "description": "Author profile and bio of David Serafino, American writer and translator who lives near Medellín, Colombia.",
          "primaryImageOfPage": `${origin}${AUTHOR_PHOTOS[0].src}`,
          "image": imageObjects,
          "mainEntity": {
            "@id": `${origin}/#author`
          }
        },
        {
          "@type": "Person",
          "@id": `${origin}/#author`,
          "name": "David Serafino",
          "alternateName": ["Dave Serafino", "David Serafino (Author)", "David Serafino (Writer)"],
          "jobTitle": "Writer and Translator",
          "nationality": "United States",
          "homeLocation": {
            "@type": "Place",
            "name": "Medellín, Colombia"
          },
          "description": bioText,
          "image": imageObjects,
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
        },
        {
          "@type": "ImageGallery",
          "@id": `${origin}/author#gallery`,
          "name": "David Serafino Author Photographs & Portraits",
          "description": "Curated collection of author photographs, travel portraits, and biographical images of American novelist David Serafino.",
          "author": {
            "@id": `${origin}/#author`
          },
          "image": imageObjects
        }
      ]
    };

    scriptTag.text = JSON.stringify(profileData);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
    };
  }, []);

  const activePhoto = AUTHOR_PHOTOS[currentPhotoIndex] || AUTHOR_PHOTOS[0];

  return (
    <div className="w-full max-w-2xl mx-auto px-6 pt-8 sm:pt-10 pb-12 select-none font-sans flex flex-col items-center pointer-events-auto" id="author-profile-container">
      {/* Return & Navigation with Yellow Arrows (matching Page 2 style) */}
      <div className="w-full flex items-center justify-between mb-7">
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

      {/* Author Portrait - Centered Rotating Slideshow (Every 5 Seconds) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative mb-7 flex justify-center"
      >
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 md:w-60 md:h-60 rounded-full overflow-hidden p-1 bg-gradient-to-b from-[#c29f72]/40 via-stone-800/40 to-black shadow-2xl ring-1 ring-stone-700/50">
          <div className="relative w-full h-full rounded-full overflow-hidden bg-black/40">
            <AnimatePresence initial={false}>
              <motion.img
                key={activePhoto.src}
                src={activePhoto.src}
                alt={activePhoto.alt}
                title={activePhoto.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full object-cover rounded-full grayscale contrast-[112%] brightness-[92%] sepia-[8%]"
              />
            </AnimatePresence>
          </div>
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
            David Serafino is an American writer, painter, travel photographer and translator who lives near Medellín, Colombia with his son and pups. His short stories have appeared in AGNI, The Common, The Los Angeles Review, and various other magazines and websites in the U.S., U.K., Canada and India, several of which have been nominated for prizes such as the O. Henry, Pushcart, Best of the Net, and the WSFA award. He has an MFA in Fiction from the University of Virginia, a BA in English from the College of William and Mary, has lived in a dozen countries, and has recently written a novel in Spanish. His travel photography is on Instagram at the link below. All novels and stories are available for representation.
          </p>
        </div>
      </motion.div>

      {/* Search Engine Optimization (SEO) & Google Image Search Markup - Visually Hidden */}
      <section className="sr-only" aria-label="Author Photo Gallery and Descriptive Metadata">
        <h2>David Serafino – Author Photographs and Portraits</h2>
        <p>
          High-resolution photographs of American author and novelist David Serafino, writer of the Letelier / Townley Trilogy and short stories.
        </p>
        <ul>
          {AUTHOR_PHOTOS.map((photo) => (
            <li key={photo.src}>
              <figure itemScope itemType="https://schema.org/ImageObject">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  itemProp="contentUrl"
                  loading="lazy"
                />
                <figcaption>
                  <span itemProp="name">{photo.title}</span>
                  <span itemProp="caption">{photo.caption}</span>
                  <p itemProp="description">{photo.description}</p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
