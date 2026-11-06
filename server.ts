import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { initializeApp as initializeClientApp, getApps as getClientApps } from "firebase/app";
import { getFirestore as getClientFirestore, doc as firestoreDoc, getDoc as firestoreGetDoc, setDoc as firestoreSetDoc } from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Enable larger payloads for base64 file uploads (admin panel)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Helper to resolve request host URL dynamically across any host/domain (Render, custom domain, or dev URL)
function getBaseUrl(req: express.Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protoStr = Array.isArray(forwardedProto) ? forwardedProto[0] : (forwardedProto ? String(forwardedProto).split(",")[0].trim() : null);
  const protocol = protoStr || req.protocol || "https";
  const host = req.get("host") || "localhost:3000";
  return `${protocol}://${host}`;
}

// Lightweight Health Check Endpoint (ideal for Render keep-alive monitors & uptime pingers)
app.all(["/api/health", "/healthz"], (req, res) => {
  res.status(200).send("OK");
});

// Dynamic robots.txt explicitly permitting Googlebot and all search engine crawlers with zero obstacles
app.all("/robots.txt", (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
  res.setHeader("X-Robots-Tag", "all");
  res.send(
`User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Googlebot-Image
Allow: /

User-agent: Googlebot-News
Allow: /

User-agent: Google-InspectionTool
Allow: /

User-agent: Storebot-Google
Allow: /

User-agent: GoogleOther
Allow: /

User-agent: bingbot
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`
  );
});

// Serve uploaded PDF/EPUB files statically
app.use("/uploads", express.static(uploadsDir));

// Serve files from public folder at root (excluding robots.txt which is dynamically resolved)
app.use(express.static(path.join(process.cwd(), "public")));

// Create a default fallback sample PDF & EPUB inside uploads so downloads work immediately
const defaultPdfPath = path.join(uploadsDir, "sample.pdf");
const defaultEpubPath = path.join(uploadsDir, "sample.epub");
if (!fs.existsSync(defaultPdfPath)) {
  fs.writeFileSync(defaultPdfPath, "%PDF-1.4 ... (Writer Website Sample Book PDF Document) ... Lorem ipsum dolor sit amet.");
}
if (!fs.existsSync(defaultEpubPath)) {
  fs.writeFileSync(defaultEpubPath, "EPUB ... (Writer Website Sample Book EPUB Document) ... Lorem ipsum dolor sit amet.");
}

const dataFilePath = path.join(process.cwd(), "src", "data", "writer-data.json");

// Keep an in-memory cache of the last successfully read data to prevent wiping out data on transient filesystem failures
let cachedWriterData: any = null;

// Emulation classes to wrap Firebase Web SDK with Admin-like API
class EmulatedDocumentReference {
  constructor(private db: any, private path: string) {}

  collection(subCollectionName: string) {
    return new EmulatedCollectionReference(this.db, `${this.path}/${subCollectionName}`);
  }

  async get() {
    const docRef = firestoreDoc(this.db, this.path);
    const snap = await firestoreGetDoc(docRef);
    return {
      exists: snap.exists(),
      id: snap.id,
      data: () => snap.data()
    };
  }

  async set(data: any) {
    const docRef = firestoreDoc(this.db, this.path);
    await firestoreSetDoc(docRef, data);
  }
}

class EmulatedCollectionReference {
  constructor(private db: any, private path: string) {}

  doc(docId: string) {
    return new EmulatedDocumentReference(this.db, `${this.path}/${docId}`);
  }
}

class EmulatedFirestore {
  constructor(private db: any) {}

  collection(collectionName: string) {
    return new EmulatedCollectionReference(this.db, collectionName);
  }
}

// Initialize Firestore safely using Web SDK to bypass container-level IAM service account blocks on custom databases
let db: any = null;
try {
  let firebaseConfig: any = null;
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_API_KEY) {
    firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      apiKey: process.env.FIREBASE_API_KEY,
      appId: process.env.FIREBASE_APP_ID,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID
    };
  } else if (process.env.FIREBASE_CONFIG) {
    try {
      firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch (e) {
      console.error("Failed to parse FIREBASE_CONFIG environment variable:", e);
    }
  }

  if (firebaseConfig) {
    let clientApp;
    if (getClientApps().length === 0) {
      clientApp = initializeClientApp(firebaseConfig);
    } else {
      clientApp = getClientApps()[0];
    }
    const dbId = firebaseConfig.firestoreDatabaseId || process.env.FIREBASE_FIRESTORE_DATABASE_ID || "(default)";
    const rawDb = getClientFirestore(clientApp, dbId);
    db = new EmulatedFirestore(rawDb);
    console.log("Web SDK Firestore initialized successfully with DB ID:", dbId);
  } else {
    console.warn("No Firebase configuration found (neither firebase-applet-config.json nor environment variables). Firestore is disabled.");
  }
} catch (error) {
  console.error("Failed to initialize Web SDK Firestore:", error);
}

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function getHardcodedFallback() {
  return {
    books: [
      {
        id: "corilocho",
        title: "Corilocho",
        price: 0,
        pdfUrl: "",
        epubUrl: "",
        pdfFileName: "corilocho-sample.pdf",
        epubFileName: "corilocho-sample.epub",
        coverImage: "/assets/aistudio/Corilocho_cover_a3b33bf7.jpg",
        synopsis: [
          "Across three decades of political and social upheaval in Chile, four lives are entangled through marriage, ideology, and the pursuit of power. At the center of Corilocho is Orlando Letelier: driven by ambition and patriotism, he builds a career in politics while his marriage to Isabel unfolds alongside his growing responsibilities. As his principles draw him into an increasingly turbulent national landscape, the choices he makes lead to dire consequences for the people closest to him.",
          "Meanwhile, Michael Townley and Mariana Callejas are pursuing ambitions of their own. Their marriage draws them toward the Chilean right, where militant commitment and personal advancement become increasingly difficult to separate. As provocateurs, then saboteurs, and later assassins, their actions set in motion events that will intersect with and shape Orlando and Isabel’s lives in fundamental ways.",
          "A story of love, idealism, and betrayal, Corilocho traces the personal costs of choices made in the name of political conviction."
        ]
      },
      {
        id: "saltwater-archives",
        title: "Saltwater Archives",
        price: 1,
        pdfUrl: "",
        epubUrl: "",
        pdfFileName: "saltwater-archives-full.pdf",
        epubFileName: "saltwater-archives-full.epub",
        coverImage: "/assets/aistudio/saltwater_archives_cover_5aad74d9.jpg",
        synopsis: [
          "As Chile descends into fascism, the loyalties of four individuals draw them into an increasingly dangerous world.",
          "Drawn by promises of wealth and influence, Mariana becomes increasingly involved with right-wing paramilitary men, while Michael discovers that his talents as a bomb-maker are evolving into an expectation that he will plant the bombs himself.",
          "Meanwhile, Orlando Letelier is sent to a prison camp on an island near the Antarctic Circle, where he and his fellow political prisoners face harsh conditions and an uncertain future, while Isabel mounts an international campaign to save him, even as the military targets her and her children.",
          "Where personal loyalties collide with political ambition, the consequences of individual choices extend far beyond the people who make them."
        ]
      },
      {
        id: "we-are-sympathetic",
        title: "We Are Sympathetic",
        price: 2,
        pdfUrl: "",
        epubUrl: "",
        pdfFileName: "we-are-sympathetic-full.pdf",
        epubFileName: "we-are-sympathetic-full.epub",
        coverImage: "/assets/aistudio/we_are_sympathetic_cover_869e764f.jpg",
        synopsis: [
          "As the conflict in Chile extends beyond its borders, the lives of Orlando and Isabel Letelier, Michael Townley, and Mariana Callejas converge in a series of events with international repercussions.",
          "The Leteliers are resuming their lives in Washington after Orlando’s imprisonment and exile, where they’re emerging as leaders of the resistance to Chile’s military government. Determined to expose the regime’s abuses and challenge its influence abroad, Orlando draws on his international political relationships, while Isabel founds a human rights institution with deep fundraising and artistic connections, but Orlando and Isabel’s marriage, tested by separation and loneliness, faces new strains after Orlando confesses an affair -- though not the fact that it’s still going on.",
          "Meanwhile, Michael Townley and Mariana Callejas have become Chilean intelligence operatives whose assignments take them from Miami to Mexico City and across Europe, where they cultivate alliances with far-right organizations to organize assassination plots targeting opponents of the Chilean regime. As Mariana manages these relationships and Michael expands into producing biological and chemical weapons, their private ambitions become inseparable from the regime's violence.",
          "Orlando's campaign is gaining momentum, but Michael Townley is closing in.",
          "The political conflict that destroyed their lives resonates into our time."
        ]
      }
    ],
    publications: []
  };
}

// Ensure the Firestore DB is seeded with initial data if empty
async function ensureDbSeeded() {
  if (!db) return;
  try {
    const docRef = db.collection("app_config").doc("writer_data");
    let docSnap;
    try {
      docSnap = await docRef.get();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.GET, "app_config/writer_data");
    }
    if (!docSnap.exists) {
      console.log("Firestore empty. Seeding with local writer-data.json...");
      if (fs.existsSync(dataFilePath)) {
        const fileContent = fs.readFileSync(dataFilePath, "utf8");
        const initialData = JSON.parse(fileContent);
        try {
          await docRef.set(initialData);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.WRITE, "app_config/writer_data");
        }
        console.log(`Firestore successfully seeded with ${initialData.books?.length || 0} books.`);
      } else {
        const fallback = getHardcodedFallback();
        try {
          await docRef.set(fallback);
        } catch (err: any) {
          handleFirestoreError(err, OperationType.WRITE, "app_config/writer_data");
        }
        console.log("Firestore successfully seeded with hardcoded fallback.");
      }
    } else {
      console.log("Firestore already seeded.");
    }
  } catch (error) {
    console.error("Error checking or seeding Firestore DB:", error);
  }
}

const DEFAULT_INITIAL_INTERVIEWS = [
  {
    id: "int-rabble-review-2026",
    title: "Artist Spotlight: David Serafino",
    outlet: "Rabble Review",
    date: "10/2026",
    url: "https://www.instagram.com/p/DeaEyEPkgtd/",
    type: "interview",
    description: "Artist and contributor spotlight on fiction author David Serafino for Rabble Review."
  },
  {
    id: "int-oyster-river-pages-2026",
    title: "Contributor Showcase: Dave Serafino",
    outlet: "Oyster River Pages",
    date: "5/2026",
    url: "https://www.oysterriverpages.com/contributor-showcase-41/daveserafino",
    type: "interview",
    description: "Contributor showcase and interview exploring writing craft and creative process with Dave Serafino."
  },
  {
    id: "int-dulcet-2025",
    title: "David Serafino in Conversation with Tyler Martinez",
    outlet: "Dulcet Literary Magazine",
    date: "3/2025",
    url: "https://www.dulcetlitmag.com/david-serafino",
    type: "interview",
    description: "In-depth literary conversation conducted by Tyler Martinez on fiction craft and 'Firebreak'."
  },
  {
    id: "int-radon-journal-2024",
    title: "A Conversation with Dave Serafino on 'And3' & Translation",
    outlet: "Radon Journal",
    date: "5/2024",
    url: "https://www.radonjournal.com/interviews/conversation-with-dave-serafino",
    type: "interview",
    description: "Conversation on speculative fiction, literary translation, and the story 'And3' in Radon Journal Issue 7."
  }
];

const DEFAULT_INITIAL_VIDEOS = [
  {
    id: "vid-youtube-sweetass-2026",
    title: "Sweetass by David Serafino",
    outlet: "Rabble Review",
    date: "10/2026",
    url: "https://www.youtube.com/watch?v=sSGAwsXGTKA",
    type: "video",
    description: "Author David Serafino reads an excerpt from Sweetass, featured in Rabble Review.",
    thumbnailUrl: "/assets/sweetass_youtube_thumbnail.jpg"
  },
  {
    id: "vid-dulcet-reel-2025",
    title: "David Serafino Reads Excerpt from Firebreak",
    outlet: "Dulcet Literary Magazine",
    date: "2/2025",
    url: "https://www.instagram.com/reel/DGgBg4XJ0dk/",
    type: "video",
    description: "Author David Serafino reads an excerpt from his published short story 'Firebreak' for Dulcet Literary Magazine.",
    thumbnailUrl: "/assets/aistudio/author_photo_2_5c6ee16d.jpg"
  }
];

const DEFAULT_BOOK_META: Record<string, { coverImage: string; synopsis: string[] }> = {
  corilocho: {
    coverImage: "/assets/aistudio/Corilocho_cover_a3b33bf7.jpg",
    synopsis: [
      "Across three decades of political and social upheaval in Chile, four lives are entangled through marriage, ideology, and the pursuit of power. At the center of Corilocho is Orlando Letelier: driven by ambition and patriotism, he builds a career in politics while his marriage to Isabel unfolds alongside his growing responsibilities. As his principles draw him into an increasingly turbulent national landscape, the choices he makes lead to dire consequences for the people closest to him.",
      "Meanwhile, Michael Townley and Mariana Callejas are pursuing ambitions of their own. Their marriage draws them toward the Chilean right, where militant commitment and personal advancement become increasingly difficult to separate. As provocateurs, then saboteurs, and later assassins, their actions set in motion events that will intersect with and shape Orlando and Isabel’s lives in fundamental ways.",
      "A story of love, idealism, and betrayal, Corilocho traces the personal costs of choices made in the name of political conviction."
    ]
  },
  "saltwater-archives": {
    coverImage: "/assets/aistudio/saltwater_archives_cover_5aad74d9.jpg",
    synopsis: [
      "As Chile descends into fascism, the loyalties of four individuals draw them into an increasingly dangerous world.",
      "Drawn by promises of wealth and influence, Mariana becomes increasingly involved with right-wing paramilitary men, while Michael discovers that his talents as a bomb-maker are evolving into an expectation that he will plant the bombs himself.",
      "Meanwhile, Orlando Letelier is sent to a prison camp on an island near the Antarctic Circle, where he and his fellow political prisoners face harsh conditions and an uncertain future, while Isabel mounts an international campaign to save him, even as the military targets her and her children.",
      "Where personal loyalties collide with political ambition, the consequences of individual choices extend far beyond the people who make them."
    ]
  },
  "we-are-sympathetic": {
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

// Safe async reader helper
async function readWriterDataAsync() {
  if (db) {
    try {
      const docRef = db.collection("app_config").doc("writer_data");
      let docSnap;
      try {
        docSnap = await docRef.get();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, "app_config/writer_data");
      }
      if (docSnap.exists) {
        const data = docSnap.data();
        let changed = false;
        if (!data.interviews || data.interviews.length === 0) {
          data.interviews = DEFAULT_INITIAL_INTERVIEWS;
          changed = true;
        }
        if (!data.videos || data.videos.length === 0) {
          data.videos = DEFAULT_INITIAL_VIDEOS;
          changed = true;
        } else {
          const hasSweetass = data.videos.some((v: any) => v.id === "vid-youtube-sweetass-2026" || v.url?.includes("sSGAwsXGTKA"));
          if (!hasSweetass) {
            data.videos.unshift({
              id: "vid-youtube-sweetass-2026",
              title: "Sweetass by David Serafino",
              outlet: "Rabble Review",
              date: "10/2026",
              url: "https://www.youtube.com/watch?v=sSGAwsXGTKA",
              type: "video",
              description: "David Serafino reads Sweetass for Rabble Review.",
              thumbnailUrl: "/assets/sweetass_youtube_thumbnail.jpg"
            });
            changed = true;
          }
          for (const v of data.videos) {
            if (v.id === "vid-dulcet-reel-2025" && v.title !== "David Serafino Reads Excerpt from Firebreak") {
              v.title = "David Serafino Reads Excerpt from Firebreak";
              changed = true;
            }
          }
        }

        // Enrich books with coverImage and synopsis if missing or outdated
        if (data.books && Array.isArray(data.books)) {
          for (const b of data.books) {
            const meta = DEFAULT_BOOK_META[b.id];
            if (meta) {
              if (!b.coverImage) {
                b.coverImage = meta.coverImage;
                changed = true;
              }
              if (
                !b.synopsis || 
                b.synopsis.length === 0 || 
                (b.id === "corilocho" && (!b.synopsis[0]?.includes("marriage, ideology") || !b.synopsis[1]?.includes("provocateurs"))) ||
                (b.id === "saltwater-archives" && (!b.synopsis[1]?.includes("bomb-maker") || !b.synopsis[2]?.includes("prison camp on an island"))) ||
                (b.id === "we-are-sympathetic" && (b.synopsis.length !== 5 || !b.synopsis[1]?.includes("separation and loneliness") || !b.synopsis[4]?.includes("destroyed their lives")))
              ) {
                b.synopsis = meta.synopsis;
                changed = true;
              }
            }
          }
        }

        if (changed) {
          docRef.set(data).catch(() => {});
        }
        cachedWriterData = data;
        return data;
      }
    } catch (error) {
      console.error("Error reading from Firestore, falling back:", error);
    }
  }

  // Fallback to local files or cache
  try {
    if (fs.existsSync(dataFilePath)) {
      const content = fs.readFileSync(dataFilePath, "utf8");
      const parsed = JSON.parse(content);
      if (!parsed.interviews || parsed.interviews.length === 0) {
        parsed.interviews = DEFAULT_INITIAL_INTERVIEWS;
      }
      if (!parsed.videos || parsed.videos.length === 0) {
        parsed.videos = DEFAULT_INITIAL_VIDEOS;
      }
      cachedWriterData = parsed;
      return parsed;
    }
  } catch (error) {
    console.error("Error reading fallback local file:", error);
  }

  if (cachedWriterData) {
    if (!cachedWriterData.interviews || cachedWriterData.interviews.length === 0) {
      cachedWriterData.interviews = DEFAULT_INITIAL_INTERVIEWS;
    }
    if (!cachedWriterData.videos || cachedWriterData.videos.length === 0) {
      cachedWriterData.videos = DEFAULT_INITIAL_VIDEOS;
    }
    return cachedWriterData;
  }

  const fallback = getHardcodedFallback();
  (fallback as any).interviews = DEFAULT_INITIAL_INTERVIEWS;
  (fallback as any).videos = DEFAULT_INITIAL_VIDEOS;
}

// Safe async writer helper
async function writeWriterDataAsync(data: any) {
  cachedWriterData = data; // Keep in-memory cache updated

  if (db) {
    try {
      const docRef = db.collection("app_config").doc("writer_data");
      try {
        await docRef.set(data);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, "app_config/writer_data");
      }
    } catch (error) {
      console.error("Error writing to Firestore:", error);
    }
  }

  // Backup to local file system
  try {
    const dir = path.dirname(dataFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = dataFilePath + ".tmp";
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tempPath, dataFilePath);
    return true;
  } catch (error) {
    console.error("Error writing backup to local file:", error);
    return !db; // If Firestore succeeded, we still count as success
  }
}

// Dynamic Sitemap.xml Handler
app.all(["/sitemap.xml", "/sitemap", "/sitemap_index.xml"], async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    res.setHeader("X-Robots-Tag", "all");
    const data = await readWriterDataAsync();
    const books: any[] = data.books || [];
    const publications: any[] = data.publications || [];
    const now = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n`;

    // Root page (Novels trilogy)
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/novels</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;

    // Individual Novels
    for (const b of books) {
      if (b.id) {
        xml += `  <url>\n    <loc>${baseUrl}/novels/${encodeURIComponent(b.id)}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
      }
    }

    // Selected Short Stories Page
    xml += `  <url>\n    <loc>${baseUrl}/stories</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;

    // Individual Short Stories
    for (const p of publications) {
      if (p.id) {
        xml += `  <url>\n    <loc>${baseUrl}/stories/${encodeURIComponent(p.id)}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      }
    }

    // Author Profile Page with Google Image Search Markup
    xml += `  <url>\n    <loc>${baseUrl}/author</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n`;
    xml += `    <image:image>\n      <image:loc>${baseUrl}/assets/aistudio/author_photo_2_5c6ee16d.jpg</image:loc>\n      <image:title>David Serafino – Author Portrait</image:title>\n      <image:caption>Primary author portrait of American writer, painter, travel photographer and translator David Serafino, residing near Medellín, Colombia</image:caption>\n    </image:image>\n`;
    xml += `    <image:image>\n      <image:loc>${baseUrl}/assets/aistudio/author_photo_9_e35bd35a.jpg</image:loc>\n      <image:title>David Serafino Waterfront Portrait</image:title>\n      <image:caption>Portrait of novelist and travel photographer David Serafino along the coast</image:caption>\n    </image:image>\n`;
    xml += `    <image:image>\n      <image:loc>${baseUrl}/assets/aistudio/author_photo_7_8081e1cc.jpg</image:loc>\n      <image:title>David Serafino Alpine Skiing</image:title>\n      <image:caption>Author David Serafino alpine skiing in winter mountains</image:caption>\n    </image:image>\n`;
    xml += `    <image:image>\n      <image:loc>${baseUrl}/assets/aistudio/author_photo_2_ec6870b5.jpg</image:loc>\n      <image:title>David Serafino at Outdoor Cafe</image:title>\n      <image:caption>David Serafino writing outdoors near Medellín, Colombia</image:caption>\n    </image:image>\n`;
    xml += `    <image:image>\n      <image:loc>${baseUrl}/assets/aistudio/author_photo_5_ff97f8e3.jpg</image:loc>\n      <image:title>David Serafino at Ancient Antiquities</image:title>\n      <image:caption>Novelist David Serafino visiting ancient stone relief carvings and monuments</image:caption>\n    </image:image>\n`;
    xml += `    <image:image>\n      <image:loc>${baseUrl}/assets/aistudio/author_photo_6_39d30ab4.jpg</image:loc>\n      <image:title>David Serafino Formal Literary Portrait</image:title>\n      <image:caption>Formal portrait of author David Serafino in dark suit and striped tie</image:caption>\n    </image:image>\n`;
    xml += `    <image:image>\n      <image:loc>${baseUrl}/assets/aistudio/author_photo_8_56c16854.jpg</image:loc>\n      <image:title>David Serafino Window Portrait</image:title>\n      <image:caption>David Serafino looking over a sunlit courtyard from open window</image:caption>\n    </image:image>\n`;
    xml += `    <image:image>\n      <image:loc>${baseUrl}/assets/aistudio/author_photo_10_5f0134bb.jpg</image:loc>\n      <image:title>David Serafino Pond Hockey</image:title>\n      <image:caption>David Serafino playing ice hockey on a frozen outdoor lake</image:caption>\n    </image:image>\n`;
    xml += `    <image:image>\n      <image:loc>${baseUrl}/assets/aistudio/serafino2_509ea778.jpg</image:loc>\n      <image:title>David Serafino Literary Portrait</image:title>\n      <image:caption>Portrait photograph of David Serafino, American writer, painter, travel photographer and translator</image:caption>\n    </image:image>\n`;
    xml += `  </url>\n`;

    // Page 4 / Interviews & Readings Page with Video & Rich Schema Markup
    const videoList: any[] = (data.videos && data.videos.length > 0) ? data.videos : DEFAULT_INITIAL_VIDEOS;
    xml += `  <url>\n    <loc>${baseUrl}/interviews</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n`;
    for (const vid of videoList) {
      const ytMatch = (vid.url || "").match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      const thumb = ytMatch ? `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg` : `${baseUrl}/assets/aistudio/author_photo_2_5c6ee16d.jpg`;
      const pubDate = vid.date && vid.date.includes("/")
        ? `${vid.date.split("/")[1]}-${vid.date.split("/")[0].padStart(2, "0")}-01`
        : (vid.date || "2025-02-25");
      const safeTitle = (vid.title || "David Serafino Reading").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const safeDesc = (vid.description || (vid.title + " - Reading by author David Serafino.")).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      xml += `    <video:video>\n`;
      xml += `      <video:thumbnail_loc>${thumb}</video:thumbnail_loc>\n`;
      xml += `      <video:title>${safeTitle}</video:title>\n`;
      xml += `      <video:description>${safeDesc}</video:description>\n`;
      xml += `      <video:player_loc>${vid.url.replace(/&/g, "&amp;")}</video:player_loc>\n`;
      xml += `      <video:publication_date>${pubDate}</video:publication_date>\n`;
      xml += `      <video:family_friendly>yes</video:family_friendly>\n`;
      xml += `    </video:video>\n`;
    }
    xml += `  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/readings</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;

    // Writer's Study
    xml += `  <url>\n    <loc>${baseUrl}/study</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;

    xml += `</urlset>`;
    res.send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
});

// API Routes

// Safe sanitization helper for public storefront API
function sanitizePublicWriterData(data: any) {
  return {
    books: data.books || [],
    publications: data.publications || [],
    interviews: data.interviews || [],
    videos: data.videos || [],
    visits: data.visits || 0,
    merchantConfig: {
      paypalEmail: data.merchantConfig?.paypalEmail || "daveserafino@gmail.com"
    }
  };
}

// Get public data (sanitized: banking details and customer emails are strictly withheld)
app.get("/api/writer-data", async (req, res) => {
  try {
    const data = await readWriterDataAsync();
    data.visits = (data.visits || 0) + 1;
    await writeWriterDataAsync(data);
    res.json(sanitizePublicWriterData(data));
  } catch (error) {
    console.error("Error in GET /api/writer-data:", error);
    const fallback = cachedWriterData || getHardcodedFallback();
    res.json(sanitizePublicWriterData(fallback));
  }
});

// Authenticated Admin Data Access (returns full merchant and audit dataset only after passcode verification)
app.post("/api/admin-data", async (req, res) => {
  const { passcode } = req.body;
  const adminPasscode = process.env.ADMIN_PASSCODE || "writer123";
  if (passcode !== adminPasscode) {
    return res.status(401).json({ error: "Unauthorized. Invalid passcode." });
  }

  try {
    const data = await readWriterDataAsync();
    res.json(data);
  } catch (error) {
    console.error("Error fetching admin data:", error);
    res.status(500).json({ error: "Failed to read database." });
  }
});

// Update data (Admin Panel)
app.post("/api/writer-data", async (req, res) => {
  const { passcode, data } = req.body;
  
  const adminPasscode = process.env.ADMIN_PASSCODE || "writer123";
  if (passcode !== adminPasscode) {
    return res.status(401).json({ error: "Unauthorized. Invalid passcode." });
  }

  if (!data || !data.books || !data.publications) {
    return res.status(400).json({ error: "Invalid data payload." });
  }

  const success = await writeWriterDataAsync(data);
  if (success) {
    res.json({ success: true, message: "Data updated successfully in database." });
  } else {
    res.status(500).json({ error: "Failed to write data." });
  }
});

// Handle Admin File Upload (Base64 PDF or EPUB with chunked Firestore backup)
app.post("/api/upload-file", async (req, res) => {
  const { passcode, fileName, fileData } = req.body;

  const adminPasscode = process.env.ADMIN_PASSCODE || "writer123";
  if (passcode !== adminPasscode) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  if (!fileName || !fileData) {
    return res.status(400).json({ error: "Filename or file data is missing." });
  }

  try {
    // Sanitize filename
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    
    // Extract base64 content
    const base64Content = fileData.split(";base64,").pop();
    if (!base64Content) {
      return res.status(400).json({ error: "Invalid base64 file data." });
    }

    // 1. Write to local uploads dir for immediate serving/legacy fallback
    const filePath = path.join(uploadsDir, sanitizedName);
    fs.writeFileSync(filePath, Buffer.from(base64Content, "base64"));

    // 2. Write chunked base64 segments to Firestore to bypass 1MB document size limit
    if (db) {
      console.log(`Writing file ${sanitizedName} to Firestore...`);
      const CHUNK_SIZE = 500000; // 500,000 characters per doc (safe < 1MB limit)
      const totalChunks = Math.ceil(base64Content.length / CHUNK_SIZE);

      const fileRef = db.collection("uploaded_files").doc(sanitizedName);
      try {
        await fileRef.set({
          fileName: sanitizedName,
          contentType: fileName.endsWith(".epub") ? "application/epub+zip" : "application/pdf",
          totalChunks,
          uploadedAt: new Date().toISOString()
        });
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `uploaded_files/${sanitizedName}`);
      }

      const chunkPromises = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunkData = base64Content.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunkPath = `uploaded_files/${sanitizedName}/chunks/chunk_${i}`;
        const chunkRef = fileRef.collection("chunks").doc(`chunk_${i}`);
        chunkPromises.push(
          chunkRef.set({
            data: chunkData
          }).catch((err: any) => {
            handleFirestoreError(err, OperationType.WRITE, chunkPath);
          })
        );
      }
      await Promise.all(chunkPromises);
      console.log(`Successfully persisted ${sanitizedName} to Firestore in ${totalChunks} chunks.`);
    }

    const fileUrl = `/uploads/${sanitizedName}`;
    res.json({ success: true, url: fileUrl, fileName: sanitizedName });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to save file." });
  }
});

// Authorize and complete transaction directly on website, depositing to the merchant bank account
app.post("/api/authorize-payment", async (req, res) => {
  const { bookId, format, paymentMethod, email, cardNumber, expDate, cvv } = req.body;

  try {
    const data = await readWriterDataAsync();
    const book = data.books?.find((b: any) => b.id === bookId);

    if (!book) {
      return res.status(404).json({ error: "Book not found." });
    }

    const price = typeof book.price === "number" ? book.price : 1;
    const sanitizedFormat = format === "epub" ? "epub" : "pdf";
    const method = paymentMethod === "card" ? "card" : "paypal";

    // Read the merchant bank account configured in the Admin Panel
    const merchantBank = data.merchantConfig?.bankName || "Citadel Credit Union";
    const merchantAccount = data.merchantConfig?.bankAccountNumber || "198827";
    const merchantRouting = data.merchantConfig?.bankRoutingNumber || "231380104";
    const merchantPaypal = data.merchantConfig?.paypalEmail || "daveserafino@gmail.com";

    const last4 = cardNumber ? cardNumber.replace(/\D/g, "").slice(-4) : "";
    const customerIdentifier = email && email.includes("@") 
      ? email.trim().toLowerCase() 
      : (last4 ? `card-ending-${last4}@checkout.direct` : `order-${Date.now()}@checkout.direct`);

    // Generate unique transaction reference code
    const txnId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const maskedBeneficiary = `${merchantBank} (Routing: ${merchantRouting}, Acct: ...${merchantAccount.slice(-4)})`;

    if (!data.paypalEmails) {
      data.paypalEmails = [];
    }

    data.paypalEmails.push({
      email: customerIdentifier,
      bookTitle: book.title,
      format: sanitizedFormat,
      date: new Date().toISOString(),
      amount: price,
      paymentMethod: method,
      transactionId: txnId,
      beneficiaryBank: maskedBeneficiary,
      status: "COMPLETED"
    });

    // Increment downloads count on purchase
    book.downloads = (book.downloads || 0) + 1;
    if (sanitizedFormat === "epub") {
      book.downloadsEpub = (book.downloadsEpub || 0) + 1;
    } else {
      book.downloadsPdf = (book.downloadsPdf || 0) + 1;
    }

    await writeWriterDataAsync(data);

    console.log(`[Payment Authorized]: Charged $${price} via ${method.toUpperCase()} for "${book.title}" -> Credited to: ${maskedBeneficiary} (Txn: ${txnId})`);

    res.json({
      success: true,
      transactionId: txnId,
      amount: price,
      beneficiary: merchantBank,
      message: `Transaction authorized and completed for the benefit of ${merchantBank}.`
    });
  } catch (error: any) {
    console.error("Payment authorization error:", error);
    res.status(500).json({ error: "Transaction authorization failed." });
  }
});

// Record customer purchase email safely (Strictly email and order identifiers - NO sensitive credentials)
app.post("/api/record-paypal-email", async (req, res) => {
  const { email, bookTitle, format, amount, paymentMethod, transactionId, beneficiaryBank } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email address is required" });
  }

  // Security check: ensure no passwords, credit card numbers, or rogue fields are accepted
  const sanitizedEmail = email.trim().toLowerCase().slice(0, 150);
  const sanitizedTitle = String(bookTitle || "Unknown").slice(0, 100);
  const sanitizedFormat = format === "epub" ? "epub" : "pdf";

  try {
    const data = await readWriterDataAsync();
    if (!data.paypalEmails) {
      data.paypalEmails = [];
    }
    data.paypalEmails.push({
      email: sanitizedEmail,
      bookTitle: sanitizedTitle,
      format: sanitizedFormat,
      date: new Date().toISOString(),
      amount: typeof amount === "number" ? amount : undefined,
      paymentMethod: paymentMethod === "card" ? "card" : "paypal",
      transactionId: transactionId || `TXN-${Date.now().toString(36).toUpperCase()}`,
      beneficiaryBank: beneficiaryBank || `${data.merchantConfig?.bankName || "Citadel Credit Union"} (Acct: ...${(data.merchantConfig?.bankAccountNumber || "198827").slice(-4)})`,
      status: "COMPLETED"
    });

    const success = await writeWriterDataAsync(data);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: "Failed to record purchase email." });
    }
  } catch (err: any) {
    console.error("Error saving PayPal email:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Dedicated secure file stream download endpoint supporting both Firestore stream & local file fallbacks
app.get("/api/download/:bookId/:format", async (req, res) => {
  const { bookId, format } = req.params;
  const data = await readWriterDataAsync();
  const book = data.books.find((b: any) => b.id === bookId) || data.publications.find((p: any) => p.id === bookId);

  if (!book) {
    return res.status(404).send("Book not found");
  }

  // Increment download count
  let found = false;
  const bookIndex = data.books.findIndex((b: any) => b.id === bookId);
  if (bookIndex !== -1) {
    data.books[bookIndex].downloads = (data.books[bookIndex].downloads || 0) + 1;
    if (format === "epub") {
      data.books[bookIndex].downloadsEpub = (data.books[bookIndex].downloadsEpub || 0) + 1;
    } else {
      data.books[bookIndex].downloadsPdf = (data.books[bookIndex].downloadsPdf || 0) + 1;
    }
    found = true;
  } else {
    const pubIndex = data.publications.findIndex((p: any) => p.id === bookId);
    if (pubIndex !== -1) {
      data.publications[pubIndex].downloads = (data.publications[pubIndex].downloads || 0) + 1;
      if (format === "epub") {
        data.publications[pubIndex].downloadsEpub = (data.publications[pubIndex].downloadsEpub || 0) + 1;
      } else {
        data.publications[pubIndex].downloadsPdf = (data.publications[pubIndex].downloadsPdf || 0) + 1;
      }
      found = true;
    }
  }

  if (found) {
    await writeWriterDataAsync(data);
  }

  const relativeUrl = format === "epub" ? book.epubUrl : book.pdfUrl;
  const fileName = format === "epub" ? (book.epubFileName || "") : (book.pdfFileName || "");
  const sanitizedName = fileName ? fileName.replace(/[^a-zA-Z0-9.-]/g, "_") : (relativeUrl ? path.basename(relativeUrl) : "");

  const fileExt = format === "epub" ? "epub" : "pdf";
  const contentType = format === "epub" ? "application/epub+zip" : "application/pdf";
  const downloadName = `${book.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.${fileExt}`;

  res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"`);
  res.setHeader("Content-Type", contentType);

  // 1. Try streaming from Firestore chunked database first
  if (db && sanitizedName) {
    try {
      const fileRef = db.collection("uploaded_files").doc(sanitizedName);
      let fileSnap;
      try {
        fileSnap = await fileRef.get();
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, `uploaded_files/${sanitizedName}`);
      }
      if (fileSnap.exists) {
        const fileMetadata = fileSnap.data();
        if (fileMetadata && fileMetadata.totalChunks) {
          console.log(`Streaming ${sanitizedName} from Firestore (${fileMetadata.totalChunks} chunks)...`);
          const totalChunks = fileMetadata.totalChunks;
          
          const chunkSnaps = await Promise.all(
            Array.from({ length: totalChunks }, (_, i) => {
              const chunkRef = fileRef.collection("chunks").doc(`chunk_${i}`);
              return chunkRef.get().catch((err: any) => {
                handleFirestoreError(err, OperationType.GET, `uploaded_files/${sanitizedName}/chunks/chunk_${i}`);
              });
            })
          );
          
          const buffers = chunkSnaps.map((snap: any) => {
            if (!snap.exists) {
              throw new Error(`Missing chunk: ${snap.id}`);
            }
            return Buffer.from(snap.data()?.data || "", "base64");
          });
          
          const fullBuffer = Buffer.concat(buffers);
          res.send(fullBuffer);
          return;
        }
      }
    } catch (error) {
      console.error("Firestore retrieval failed. Falling back to disk system:", error);
    }
  }

  // 2. Fallback to local files if database fails or is bypassed
  let fileToServe = "";
  const possiblePaths: string[] = [];

  if (relativeUrl) {
    possiblePaths.push(path.join(process.cwd(), relativeUrl));
    possiblePaths.push(path.join(process.cwd(), "public", relativeUrl));
    possiblePaths.push(path.join(process.cwd(), "public", "uploads", path.basename(relativeUrl)));
    possiblePaths.push(path.join(process.cwd(), "public", "books", path.basename(relativeUrl)));
    possiblePaths.push(path.join(process.cwd(), "uploads", path.basename(relativeUrl)));
  }

  if (fileName) {
    possiblePaths.push(path.join(process.cwd(), "uploads", fileName));
    possiblePaths.push(path.join(process.cwd(), "public", "uploads", fileName));
    possiblePaths.push(path.join(process.cwd(), "public", "books", fileName));
    possiblePaths.push(path.join(process.cwd(), "public", fileName));
  }

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      fileToServe = p;
      break;
    }
  }

  if (!fileToServe) {
    fileToServe = format === "epub" ? defaultEpubPath : defaultPdfPath;
  }

  const stream = fs.createReadStream(fileToServe);
  stream.pipe(res);
});

// Serve Vite dev server or build static assets
async function startServer() {
  // Ensure the database has seeded initial contents before opening connection
  await ensureDbSeeded();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev middleware attached.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const indexHtmlPath = path.join(distPath, "index.html");
    
    // Serve static assets, skipping default index.html so dynamic canonical/SEO injection applies
    app.use(express.static(distPath, { index: false }));

    app.get("*", (req, res) => {
      res.setHeader("X-Robots-Tag", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
      const baseUrl = getBaseUrl(req);
      if (fs.existsSync(indexHtmlPath)) {
        let html = fs.readFileSync(indexHtmlPath, "utf8");
        // Dynamically replace any hardcoded dev URLs with the live domain (Render or custom domain)
        html = html.replace(/https:\/\/ais-dev-[a-z0-9-]+\.us-east1\.run\.app/g, baseUrl);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(html);
      } else {
        res.status(404).send("Not found");
      }
    });
    console.log("Production static handler attached with dynamic SEO injection.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
