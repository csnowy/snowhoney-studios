import crypto from "crypto";

const SECRET = process.env.PORTAL_SECRET || "changeme"; // long random string

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { code, token } = JSON.parse(event.body || "{}");
    if (!code || !token) {
      return { statusCode: 400, body: "Missing code or token" };
    }

    // Decode token from send-portal-code
    let payload;
    try {
      payload = JSON.parse(Buffer.from(token, "base64").toString());
    } catch {
      return { statusCode: 400, body: "Invalid token" };
    }

    if (Date.now() > payload.exp) {
      return { statusCode: 400, body: "Code expired" };
    }

    const hash = crypto.createHash("sha256").update(code).digest("hex");
    if (hash !== payload.hash) {
      return { statusCode: 400, body: "Invalid code" };
    }

    // ✅ Issue a signed verification token
    const verified = {
      email: payload.email,
      exp: Date.now() + 60 * 60 * 1000 // valid 1 hour
    };
    const raw = JSON.stringify(verified);
    const sig = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
    const verifiedToken = Buffer.from(JSON.stringify({ ...verified, sig })).toString("base64");

    return {
      statusCode: 200,
      body: JSON.stringify({ verified: true, token: verifiedToken, email: payload.email }),
    };
  } catch (err) {
    console.error("❌ verify-portal-code error:", err);
    return { statusCode: 500, body: "Server error" };
  }
}
