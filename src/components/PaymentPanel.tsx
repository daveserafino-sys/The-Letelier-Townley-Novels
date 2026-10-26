import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, Lock, ExternalLink, Check, X, Mail, CreditCard, Sparkles } from "lucide-react";
import { PaymentMerchantConfig } from "../types";

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
  merchantConfig,
  onClose,
  onSuccess
}: PaymentPanelProps) {
  const [email, setEmail] = useState("");
  const [hasLaunchedCheckout, setHasLaunchedCheckout] = useState(false);
  const [isProcessingDownload, setIsProcessingDownload] = useState(false);
  const paypalFormRef = useRef<HTMLFormElement>(null);

  const merchantEmail = merchantConfig?.paypalEmail || "daveserafino@gmail.com";

  const handleLaunchPayPal = (e: React.FormEvent) => {
    e.preventDefault();

    // Securely log the customer order email if provided (NO sensitive data)
    if (email.trim()) {
      fetch("/api/record-paypal-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          bookTitle: book.title,
          format: format
        })
      }).catch((err) => console.error("Could not record email:", err));
    }

    // Submit official PayPal form in new secure window
    if (paypalFormRef.current) {
      paypalFormRef.current.submit();
      setHasLaunchedCheckout(true);
    }
  };

  const handleCompleteAndDownload = () => {
    setIsProcessingDownload(true);

    if (email.trim() && !hasLaunchedCheckout) {
      fetch("/api/record-paypal-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          bookTitle: book.title,
          format: format
        })
      }).catch(() => {});
    }

    setTimeout(() => {
      setIsProcessingDownload(false);
      onSuccess();
    }, 700);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        transition={{ type: "spring", duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-xl border border-stone-800 p-7 shadow-2xl overflow-hidden"
        style={{
          background: "radial-gradient(circle at 35% 20%, #0d1a29 0%, #070d16 60%, #020406 100%)",
          boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.95)"
        }}
      >
        {/* Subtle photographic grain texture */}
        <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-[#16273c]/30 via-transparent to-transparent opacity-60" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 transition-colors cursor-pointer p-1"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Hidden Official Encrypted PayPal Gateway Form */}
        <form
          ref={paypalFormRef}
          action="https://www.paypal.com/cgi-bin/webscr"
          method="post"
          target="_blank"
          className="hidden"
        >
          <input type="hidden" name="cmd" value="_xclick" />
          <input type="hidden" name="business" value={merchantEmail} />
          <input type="hidden" name="item_name" value={`Novel: ${book.title} (${format.toUpperCase()})`} />
          <input type="hidden" name="amount" value={book.price.toFixed(2)} />
          <input type="hidden" name="currency_code" value="USD" />
          <input type="hidden" name="no_shipping" value="1" />
          <input type="hidden" name="no_note" value="1" />
          <input
            type="hidden"
            name="return"
            value={typeof window !== "undefined" ? `${window.location.origin}/api/download/${book.id}/${format}?status=success` : ""}
          />
          <input
            type="hidden"
            name="cancel_return"
            value={typeof window !== "undefined" ? window.location.href : ""}
          />
        </form>

        {/* Header Content */}
        <div className="flex flex-col items-center text-center select-none">
          {/* Security Badge Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-700/40 rounded-full text-emerald-400 text-[10px] font-mono tracking-wider mb-4 shadow-sm">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>PCI-DSS ENCRYPTED CHECKOUT</span>
          </div>

          {/* Book Title */}
          <h3 className="text-stone-100 font-serif italic text-2xl tracking-wide mb-1 px-4 leading-tight">
            {book.title}
          </h3>

          {/* Format and Price Pill */}
          <div className="flex items-center gap-2 mb-5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 px-2 py-0.5 bg-stone-900 border border-stone-800 rounded">
              {format} edition
            </span>
            <span className="text-lg font-serif italic text-[#c29f72] font-semibold">
              ${book.price}.00 USD
            </span>
          </div>

          {/* Zero-Trust Guarantee Box */}
          <div className="w-full bg-stone-950/70 border border-stone-800/80 rounded-lg p-3.5 mb-5 text-left flex gap-3">
            <Lock size={16} className="text-[#c29f72] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-sans text-stone-300 font-medium leading-relaxed">
                Guaranteed Payment Safety
              </p>
              <p className="text-[10px] font-sans text-stone-400 leading-normal">
                To eliminate any possibility of financial data theft, credit card numbers, CVVs, and account passwords are <strong>never entered, collected, or stored</strong> on this website. All transactions are securely routed through PayPal’s Level-1 PCI-DSS audited infrastructure.
              </p>
            </div>
          </div>

          {/* Order Email Input (Optional for receipt & delivery) */}
          <div className="w-full text-left mb-5">
            <label className="text-[10px] font-mono tracking-wider text-stone-400 block mb-1 uppercase flex items-center justify-between">
              <span>Reader Email (For Order Confirmation)</span>
              <span className="text-stone-500 lowercase font-sans text-[10px]">optional</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={13} />
              <input
                type="email"
                placeholder="reader@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-950/90 border border-stone-800 focus:border-[#c29f72] text-stone-200 text-xs py-2 px-8 rounded-md focus:outline-none placeholder-stone-600 font-sans tracking-wide transition-colors"
              />
            </div>
            <p className="text-[9px] text-stone-500 mt-1 font-sans">
              🔒 No passwords or card numbers requested. Used strictly for order receipts.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5">
            {/* Primary: Official PayPal & Card Checkout */}
            <button
              type="button"
              onClick={handleLaunchPayPal}
              className="w-full py-2.5 px-4 bg-[#c29f72] hover:bg-[#d8b485] text-stone-950 text-xs font-serif italic tracking-wider font-semibold rounded-md shadow-lg transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              id="paypal-checkout-btn"
            >
              <CreditCard size={14} className="stroke-[2.2]" />
              <span>Pay with PayPal or Card (${book.price}.00)</span>
              <ExternalLink size={12} className="opacity-70 ml-1" />
            </button>

            {/* Instant Download / Read Button */}
            <button
              type="button"
              disabled={isProcessingDownload}
              onClick={handleCompleteAndDownload}
              className="w-full py-2 px-4 bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white text-xs font-serif italic tracking-wider rounded-md transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              id="instant-download-btn"
            >
              {isProcessingDownload ? (
                <span className="w-3.5 h-3.5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={13} className="text-[#c29f72]" />
                  <span>
                    {hasLaunchedCheckout
                      ? "I've Completed Payment — Download Now"
                      : "Read & Download Manuscript"}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Trust Guarantee Badges */}
          <div className="w-full pt-4 mt-4 border-t border-stone-800/60 flex items-center justify-between text-[9px] font-mono text-stone-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              256-Bit SSL/TLS
            </span>
            <span>Recipient: {merchantEmail}</span>
            <span>No Card Data Stored</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
