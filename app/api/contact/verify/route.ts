import { NextRequest, NextResponse } from "next/server";
import { verifyContactToken } from "../../../../lib/contactToken";
import { sendContactToAdmin } from "../../../../lib/email";
import { fetchAndDeletePendingImage } from "../../../../lib/imageSubmissions";

export const dynamic = "force-dynamic";

const HTML_TEMPLATE = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #1f2937;
      margin-top: 0;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    ${body}
  </div>
</body>
</html>`;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new NextResponse(
        HTML_TEMPLATE(
          "Invalid verification link",
          `
            <h1>Invalid verification link</h1>
            <p>This verification link is missing a token. Please check your email and try the link again.</p>
            <p><a href="/">Return to homepage</a></p>
          `
        ),
        {
          status: 400,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    const payload = verifyContactToken(token);

    if (!payload) {
      return new NextResponse(
        HTML_TEMPLATE(
          "Verification link expired",
          `
            <h1>Verification link expired</h1>
            <p>This verification link is invalid or has expired. Verification links are valid for 7 days.</p>
            <p>Please submit a new contact form if you still need to reach us.</p>
            <p><a href="/about">Submit a new message</a></p>
          `
        ),
        {
          status: 410,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // Send email to admin (with the photo attached, if one was submitted).
    try {
      let attachment:
        | { filename: string; content: Buffer; contentType: string }
        | undefined;
      if (payload.submissionId) {
        try {
          const img = await fetchAndDeletePendingImage(payload.submissionId);
          if (img) {
            attachment = {
              filename: img.imageName || "photo",
              content: img.imageBytes,
              contentType: img.imageType || "application/octet-stream",
            };
          }
        } catch (imgErr) {
          console.error("[contact-verify] Failed to load submitted photo:", imgErr);
        }
      }
      await sendContactToAdmin(payload, attachment);
    } catch (emailError) {
      console.error("[contact-verify] Failed to send email to admin:", emailError);
      return new NextResponse(
        HTML_TEMPLATE(
          "Delivery error",
          `
            <h1>There was a problem delivering your message</h1>
            <p>Your email was verified, but we encountered an error while delivering your message. Please try submitting the contact form again.</p>
            <p><a href="/about">Submit a new message</a></p>
          `
        ),
        {
          status: 500,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        }
      );
    }

    // Success
    return new NextResponse(
      HTML_TEMPLATE(
        "Message sent – TubeBenderReviews",
        `
          <h1>Message sent</h1>
          <p>Thanks for confirming your email. We've delivered your message to a reviewer.</p>
          <p>You should receive a response within a few business days.</p>
          <p><a href="/">Return to homepage</a></p>
        `
      ),
      {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  } catch (error) {
    console.error("[contact-verify] Unexpected error:", error);
    return new NextResponse(
      HTML_TEMPLATE(
        "Error",
        `
          <h1>An error occurred</h1>
          <p>Something went wrong while processing your verification. Please try again later.</p>
          <p><a href="/">Return to homepage</a></p>
        `
      ),
      {
        status: 500,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}

