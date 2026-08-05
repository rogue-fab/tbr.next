"use client";

import { useState } from "react";

type MessageType = "Accuracy" | "Fairness" | "Manufacturer" | "General";

type Status = "idle" | "submitting" | "success" | "error";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("General");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    // Basic validation
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setStatus("error");
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (!email.includes("@")) {
      setStatus("error");
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (securityAnswer !== "5") {
      setStatus("error");
      setErrorMessage("Security verification failed. Please try again.");
      return;
    }

    // Honeypot check - if filled, treat as spam but return success
    if (honeypot.trim()) {
      setStatus("success");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setMessageType("General");
      setSecurityAnswer("");
      setHoneypot("");
      return;
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          messageType,
          securityAnswer,
          website: honeypot,
        }),
      });

      if (response.ok) {
        setStatus("success");
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
        setMessageType("General");
        setSecurityAnswer("");
        setHoneypot("");
      } else {
        const data = await response.json();
        setStatus("error");
        setErrorMessage(
          data.error || "Something went wrong sending your message. Please try again later."
        );
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Something went wrong sending your message. Please try again later.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Heading */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Contact Us</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          We welcome feedback on accuracy, fairness, and product information.
        </p>
      </div>

      {/* Callout boxes */}
      <div className="space-y-4">
        {/* Independence Notice */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Independence Notice</h3>
          <p className="text-xs text-blue-800">
            We do not manufacture any tube bending equipment on this site. Reviews are based on
            publicly available information and shop experience. RogueFab.com is a separate company
            and is disclosed where relevant.
          </p>
        </div>

        {/* Product Support */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900 mb-1">Product Support</h3>
          <p className="text-xs text-amber-800">
            For technical support, warranty issues, or product-specific troubleshooting, please
            contact the manufacturer directly. We cannot provide official support for any brand.
          </p>
        </div>
      </div>

      {/* Contact Form */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Send Us a Message</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* Message Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["Accuracy", "Fairness", "Manufacturer", "General"] as MessageType[]).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setMessageType(type)}
                    className={[
                      "rounded border px-3 py-2 text-xs font-medium transition",
                      messageType === type
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                    ].join(" ")}
                  >
                    {type}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="subject"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* Security Verification */}
          <div>
            <label htmlFor="security" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Security verification: what is 1 + 4? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="security"
              required
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              className="w-full max-w-xs rounded border border-gray-300 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={status === "submitting"}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "submitting" ? "Sending…" : "Send Message"}
            </button>
          </div>

          {/* Privacy Statement */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Privacy:</strong> We only use this info to reply to your message. We don&apos;t sell it, share it, or add you to any mailing list, and we don&apos;t store your message in our database.
          </p>

          {/* Honeypot */}
          <div className="hidden">
            <label htmlFor="website">Website</label>
            <input
              type="text"
              id="website"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Status Messages */}
          {status === "success" && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800">
                Check your email for a verification link. We&apos;ll only receive your message after you confirm.
              </p>
            </div>
          )}

          {status === "error" && errorMessage && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{errorMessage}</p>
            </div>
          )}
        </form>
      </div>

      {/* Contact Guidelines */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Contact Guidelines</h2>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Accuracy Concerns</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              If you believe we&apos;ve made an error in specs, pricing, or capabilities, please
              include specific claims and sources. We prioritize accuracy and will update
              information with verifiable documentation.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Fairness Questions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Our scoring is criteria-based and transparent. If you have concerns about fairness,
              please reference specific scoring categories and explain why you believe the
              evaluation is incorrect.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Manufacturers</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We welcome corrections, updated specs, images, or pricing from manufacturers. Please
              provide official documentation or links to product pages when submitting updates.
            </p>
          </div>
        </div>
      </div>

      {/* Manufacturer Contacts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Manufacturer Contacts</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          For product-specific questions and warranty claims, please contact manufacturers
          directly. We cannot provide official support for any brand.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: "RogueFab", url: "https://roguefab.com" },
            { name: "Baileigh Industrial", url: "https://www.baileigh.com" },
            { name: "JD Squared", url: "https://www.jd2.com" },
            { name: "Pro-Tools", url: "https://www.pro-tools.com" },
            { name: "JMR Manufacturing", url: "https://www.jmrmfg.com" },
            { name: "SWAG Off Road", url: "https://www.swagoffroad.com" },
          ].map((manufacturer) => (
            <a
              key={manufacturer.name}
              href={manufacturer.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {manufacturer.name} →
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

