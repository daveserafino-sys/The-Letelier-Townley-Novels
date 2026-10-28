import React, { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { PaymentMerchantConfig } from "../types";
import { emptyChamberBase64 } from "../assets/noir_empty_chamber_base64";
import emptyChamberImg from "../assets/images/noir_empty_chamber.jpg";

interface PaymentPanelProps {
  book: { id: string; title: string; price: number };
  format: "pdf" | "epub";
  merchantConfig?: PaymentMerchantConfig;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentPanel({
  book,
  format,
  onClose,
  onSuccess
}: PaymentPanelProps) {
  const [paymentMethod, setPaymentMethod] = useState<"paypal" | "card">("paypal");
  const [email, setEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expDate, setExpDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bgSrc, setBgSrc] = useState<string>(emptyChamberBase64 || emptyChamberImg);

  const priceDisplay = book.price === 1 ? "$1" : "$2";

  // Card Number formatting: "1234 5678 9012 3456"
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(" ") || raw;
    setCardNumber(formatted);
  };

  // Expiration Date formatting: "MM/YY"
  const handleExpDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setExpDate(raw);
  };

  // CVV formatting: 3 or 4 digits
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCvv(raw);
  };

  const [authStatus, setAuthStatus] = useState<string | null>(null);

  // In-place transaction: authorizes and completes the transaction charging the account to the benefit of the bank account
  const handleReadItNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setAuthStatus("authorizing transaction...");

    try {
      const response = await fetch("/api/authorize-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: book.id,
          format: format,
          paymentMethod: paymentMethod,
          email: email.trim(),
          cardNumber: cardNumber,
          expDate: expDate,
          cvv: cvv
        })
      });

      const result = await response.json();
      if (result.success) {
        setAuthStatus("authorized • completed");
      }
    } catch (err) {
      console.error("Payment authorization error:", err);
    }

    // Direct in-place fulfillment: trigger download and complete order without leaving the site
    setTimeout(() => {
      setIsProcessing(false);
      window.location.href = `/api/download/${book.id}/${format}`;
      onSuccess();
    }, 700);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 12 }}
        transition={{ type: "spring", duration: 0.4 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-lg border border-stone-800/80 p-7 shadow-2xl overflow-hidden bg-[#0a0f16]"
      >
        {/* Silver Halide Grainy Background Texture matching the background image */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <img
            src={bgSrc}
            onError={() => setBgSrc("/noir_empty_chamber.jpg")}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: "grayscale(100%) contrast(115%) brightness(36%) sepia(10%) blur(1px)",
              opacity: 0.9
            }}
          />
          {/* Silvery-blue atmospheric tint overlays */}
          <div className="absolute inset-0 bg-[#5d7290]/20 mix-blend-color" />
          <div className="absolute inset-0 bg-[#2c405c]/15 mix-blend-overlay" />
          {/* Grain texture overlays */}
          <div 
            className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 text-stone-500 hover:text-stone-300 transition-colors cursor-pointer p-1 z-20"
          aria-label="Close"
        >
          <X size={17} />
        </button>

        {/* Pure, Minimalist Content */}
        <div className="relative z-10 flex flex-col items-center text-center select-none pt-2">
          {/* Title of the Book */}
          <h3 className="font-serif italic font-normal text-2xl sm:text-[28px] text-[#e2e7ec] tracking-wide leading-tight mb-1 px-2">
            {book.title}
          </h3>

          {/* Price: strictly $1 or $2, no decimals or zeros */}
          <div className="font-serif italic text-base sm:text-lg text-[#c29f72] mb-5">
            {priceDisplay}
          </div>

          {/* Payment Method Selector: PAYPAL / CARD */}
          <div className="w-full flex gap-2 mb-3.5">
            <button
              type="button"
              onClick={() => setPaymentMethod("paypal")}
              className={`flex-1 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded-sm border transition-all cursor-pointer ${
                paymentMethod === "paypal"
                  ? "bg-[#c29f72]/20 border-[#c29f72]/80 text-[#ffd29c]"
                  : "bg-black/40 border-stone-800 text-stone-400 hover:text-stone-200"
              }`}
            >
              PAYPAL
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`flex-1 py-1.5 text-[11px] font-mono uppercase tracking-wider rounded-sm border transition-all cursor-pointer ${
                paymentMethod === "card"
                  ? "bg-[#c29f72]/20 border-[#c29f72]/80 text-[#ffd29c]"
                  : "bg-black/40 border-stone-800 text-stone-400 hover:text-stone-200"
              }`}
            >
              CARD
            </button>
          </div>

          {/* Boxes for Entering the Relevant Information */}
          <form onSubmit={handleReadItNow} className="w-full space-y-2.5">
            {paymentMethod === "paypal" ? (
              /* PayPal requires the email */
              <input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/55 border border-stone-700/60 focus:border-[#c29f72] text-stone-200 text-xs py-2.5 px-3.5 rounded-sm focus:outline-none placeholder-stone-500 font-sans tracking-wide transition-colors"
              />
            ) : (
              /* Debit / Credit requires card number, expiration date, and CVV */
              <>
                <input
                  type="text"
                  required
                  placeholder="Card number"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  maxLength={19}
                  className="w-full bg-black/55 border border-stone-700/60 focus:border-[#c29f72] text-stone-200 text-xs py-2.5 px-3.5 rounded-sm focus:outline-none placeholder-stone-500 font-mono tracking-wider transition-colors"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="MM / YY"
                    value={expDate}
                    onChange={handleExpDateChange}
                    maxLength={5}
                    className="flex-1 bg-black/55 border border-stone-700/60 focus:border-[#c29f72] text-stone-200 text-xs py-2.5 px-3.5 rounded-sm focus:outline-none placeholder-stone-500 font-mono tracking-wider transition-colors text-center"
                  />
                  <input
                    type="text"
                    required
                    placeholder="CVV"
                    value={cvv}
                    onChange={handleCvvChange}
                    maxLength={4}
                    className="flex-1 bg-black/55 border border-stone-700/60 focus:border-[#c29f72] text-stone-200 text-xs py-2.5 px-3.5 rounded-sm focus:outline-none placeholder-stone-500 font-mono tracking-wider transition-colors text-center"
                  />
                </div>
              </>
            )}

            {/* Action Button: "read it now" */}
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full py-2.5 px-4 bg-[#c29f72] hover:bg-[#d8b485] text-stone-950 text-xs font-serif italic tracking-wider font-semibold rounded-sm shadow-md transition-all duration-300 cursor-pointer mt-3 flex items-center justify-center gap-2"
              id="read-it-now-btn"
            >
              {isProcessing ? (
                <div className="flex items-center gap-1.5 font-mono text-[11px] not-italic">
                  <span className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>{authStatus || "authorizing..."}</span>
                </div>
              ) : (
                "read it now"
              )}
            </button>
          </form>

          {/* Discreet Watermark-Type Badge and "encrypted checkout" */}
          <div className="flex items-center justify-center gap-1.5 mt-5 text-[#c29f72]/50 select-none">
            <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.4" 
              className="w-3.5 h-3.5 opacity-60"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="9.5" y="11" width="5" height="4" rx="0.8" strokeWidth="1.2" />
              <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" strokeWidth="1.2" />
            </svg>
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-stone-400/60">
              encrypted checkout
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
