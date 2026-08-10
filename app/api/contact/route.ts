import { NextRequest, NextResponse } from "next/server";
import { createContactToken } from "../../../lib/contactToken";
import { sendContactVerificationEmail } from "../../../lib/email";
import { insertPendingImage } from "../../../lib/imageSubmissions";

export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB

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
    // Accept JSON (text-only) or multipart/form-data (with an optional photo).
    let name: string | undefined,
      email: string | undefined,
      subject: string | undefined,
      message: string | undefined,
      messageType: string | undefined,
      securityAnswer: string | undefined,
      website: string | undefined;
    let file: File | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      name = form.get("name")?.toString();
      email = form.get("email")?.toString();
      subject = form.get("subject")?.toString();
      message = form.get("message")?.toString();
      messageType = form.get("messageType")?.toString();
      securityAnswer = form.get("securityAnswer")?.toString();
      website = form.get("website")?.toString();
      const f = form.get("photo");
      if (f && typeof f === "object" && "arrayBuffer" in f) file = f as File;
    } else {
      const body: ContactPayload = await req.json();
      ({ name, email, subject, message, messageType, securityAnswer, website } = body);
    }

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

    // Optional photo: validate + store transiently (deleted after email confirmation).
    let submissionId: string | undefined;
    if (file) {
      const type = (file.type || "").toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(type)) {
        return NextResponse.json(
          { ok: false, error: "Photo must be a JPEG, PNG, or WebP image." },
          { status: 400 },
        );
      }
      if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { ok: false, error: "Photo must be under 6 MB." },
          { status: 400 },
        );
      }
      try {
        const bytes = Buffer.from(await file.arrayBuffer());
        submissionId = await insertPendingImage({
          imageBytes: bytes,
          imageType: type,
          imageName: (file.name || "photo").slice(0, 120),
        });
      } catch (err) {
        console.error("[contact-form] photo store failed:", err);
        return NextResponse.json(
          {
            ok: false,
            error:
              "Photo uploads are temporarily unavailable — you can still send a message without a photo.",
          },
          { status: 503 },
        );
      }
    }

    // Build payload
    const payload = {
      name: name.trim(),
      email: email.trim(),
      subject: subject.trim(),
      messageType: messageType || "General",
      message: message.trim(),
      createdAt: Date.now(),
      ...(submissionId ? { submissionId } : {}),
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
      message: submissionId
        ? `${payload.message}\n\n[A product photo is attached and will be sent to us once you confirm.]`
        : payload.message,
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
