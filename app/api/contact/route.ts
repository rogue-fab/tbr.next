import { NextRequest, NextResponse } from "next/server";
import { createContactToken } from "../../../lib/contactToken";
import { sendContactVerificationEmail } from "../../../lib/email";

type ContactPayload = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  messageType?: string;
  securityAnswer?: string;
  website?: string;
};

// Simple in-memory rate limiting (resets on cold start)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];

  // Remove requests outside the window
  const recentRequests = requests.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  // Add current request
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);

  // Clean up old entries periodically (simple cleanup)
  if (rateLimitMap.size > 1000) {
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const filtered = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
      if (filtered.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, filtered);
      }
    }
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body: ContactPayload = await req.json();

    const { name, email, subject, message, messageType, securityAnswer, website } = body;

    // Basic validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || typeof email !== "string" || typeof subject !== "string" || typeof message !== "string") {
      return NextResponse.json(
        { ok: false, error: "Invalid field types" },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Invalid email address" },
        { status: 400 }
      );
    }

    if (securityAnswer !== "5") {
      return NextResponse.json(
        { ok: false, error: "Security verification failed" },
        { status: 400 }
      );
    }

    // Honeypot check - if filled, treat as spam but return success
    if (website && website.trim()) {
      return NextResponse.json({ ok: true });
    }

    // Rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : req.ip || "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Build payload
    const payload = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      messageType: messageType || "General",
      message: message.trim(),
      createdAt: Date.now(),
    };

    // Create verification token
    const token = createContactToken(payload);

    // Construct verification URL
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://tubebenderreviews.com";
    const verifyUrl = new URL("/api/contact/verify", base);
    verifyUrl.searchParams.set("token", token);

    // Send verification email
    await sendContactVerificationEmail({
      to: payload.email,
      name: payload.name,
      subject: payload.subject,
      messageType: payload.messageType,
      message: payload.message,
      verifyUrl: verifyUrl.toString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[contact-form] Error processing request:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
