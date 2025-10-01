import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const SECRET = process.env.PORTAL_SECRET || "changeme";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { verifiedToken } = JSON.parse(event.body || "{}");
    if (!verifiedToken) {
      return { statusCode: 400, body: "Missing verified token" };
    }

    // Decode and validate token
    let payload;
    try {
      payload = JSON.parse(Buffer.from(verifiedToken, "base64").toString());
    } catch {
      return { statusCode: 400, body: "Invalid token" };
    }

    const { email, exp, sig } = payload;
    if (!email || Date.now() > exp) {
      return { statusCode: 400, body: "Token expired or invalid" };
    }

    const raw = JSON.stringify({ email, exp });
    const expectedSig = crypto.createHmac("sha256", SECRET).update(raw).digest("hex");
    if (sig !== expectedSig) {
      return { statusCode: 400, body: "Token signature mismatch" };
    }

    // Look up Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) {
      return { statusCode: 404, body: "No customer found" };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${event.headers.origin}/index.html`,
    });

    return { statusCode: 200, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    console.error("❌ create-portal-session error:", err);
    return { statusCode: 500, body: "Server error" };
  }
}
