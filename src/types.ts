export interface PaypalEmail {
  email: string;
  bookTitle: string;
  format: string;
  date: string;
  amount?: number;
  paymentMethod?: "paypal" | "card";
  transactionId?: string;
  beneficiaryBank?: string;
  status?: string;
}

export interface Book {
  id: string;
  title: string;
  price: number;
  pdfUrl: string;
  epubUrl: string;
  pdfFileName?: string;
  epubFileName?: string;
  downloads?: number;
  downloadsPdf?: number;
  downloadsEpub?: number;
  coverImage?: string;
  synopsis?: string[];
}

export interface Publication {
  id: string;
  title: string;
  outlet: string;
  date: string;
  url: string;
  pdfUrl: string;
  epubUrl: string;
  pdfFileName?: string;
  epubFileName?: string;
  downloads?: number;
  downloadsPdf?: number;
  downloadsEpub?: number;
}

export interface PaymentMerchantConfig {
  paypalEmail: string;
  bankName: string;
  bankAccountNumber: string;
  bankRoutingNumber: string;
}

export interface MediaItem {
  id: string;
  title: string;
  outlet: string;
  date: string;
  url: string;
  type: "interview" | "video";
  description?: string;
  thumbnailUrl?: string;
  logoUrl?: string;
  videoSrc?: string;
}

export interface WriterData {
  books: Book[];
  publications: Publication[];
  interviews?: MediaItem[];
  videos?: MediaItem[];
  paypalEmails?: PaypalEmail[];
  merchantConfig?: PaymentMerchantConfig;
  visits?: number;
}
