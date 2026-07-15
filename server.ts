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

// Serve uploaded PDF/EPUB files statically
app.use("/uploads", express.static(uploadsDir));

// Serve files from public folder at root
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
      { id: "corilocho", title: "Corilocho", price: 0, pdfUrl: "", epubUrl: "", pdfFileName: "corilocho-sample.pdf", epubFileName: "corilocho-sample.epub" },
      { id: "saltwater-archives", title: "Saltwater Archives", price: 1, pdfUrl: "", epubUrl: "", pdfFileName: "saltwater-archives-full.pdf", epubFileName: "saltwater-archives-full.epub" },
      { id: "we-are-sympathetic", title: "We Are Sympathetic", price: 2, pdfUrl: "", epubUrl: "", pdfFileName: "we-are-sympathetic-full.pdf", epubFileName: "we-are-sympathetic-full.epub" }
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
      cachedWriterData = parsed;
      return parsed;
    }
  } catch (error) {
    console.error("Error reading fallback local file:", error);
  }

  if (cachedWriterData) {
    return cachedWriterData;
  }

  return getHardcodedFallback();
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

// API Routes

// Get data
app.get("/api/writer-data", async (req, res) => {
  try {
    const data = await readWriterDataAsync();
    data.visits = (data.visits || 0) + 1;
    await writeWriterDataAsync(data);
    res.json(data);
  } catch (error) {
    console.error("Error in GET /api/writer-data:", error);
    const fallback = cachedWriterData || getHardcodedFallback();
    res.json(fallback);
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

// Record PayPal Email Address
app.post("/api/record-paypal-email", async (req, res) => {
  const { email, bookTitle, format } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const data = await readWriterDataAsync();
    if (!data.paypalEmails) {
      data.paypalEmails = [];
    }
    data.paypalEmails.push({
      email: email.trim(),
      bookTitle: bookTitle || "Unknown",
      format: format || "pdf",
      date: new Date().toISOString()
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
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static handler attached.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
