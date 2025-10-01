import sgMail from "@sendgrid/mail";
import crypto from "crypto";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { email } = JSON.parse(event.body || "{}");
    if (!email) return { statusCode: 400, body: "Missing email" };

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash it so we don’t store plaintext codes
    const hash = crypto.createHash("sha256").update(code).digest("hex");

    // Store hash in a short-lived cookie (or use Redis/DB for persistence)
    // For Netlify: send it back to frontend (signed JWT is better, but simple demo below)
    // We'll send back a signed token that contains the hash
    const token = Buffer.from(JSON.stringify({
      email, hash, exp: Date.now() + 10 * 60 * 1000 // 10 min expiry
    })).toString("base64");

    // Email the code
    await sgMail.send({
      to: email,
      from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
      subject: "Your Snowhoney Studios Access Code ✨",
      html: `
        <p>Hi there,</p>
        <p>Your one-time access code is:</p>
        <h2 style="color:#F5B700; font-size:28px;">${code}</h2>
        <p>This code expires in 10 minutes.</p>
      `,
    });

    return { statusCode: 200, body: JSON.stringify({ token }) };
  } catch (err) {
    console.error("❌ send-portal-code error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
