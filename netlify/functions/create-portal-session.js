// netlify/functions/create-portal-session.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { email } = JSON.parse(event.body || "{}");
    if (!email) {
      return { statusCode: 400, body: "Missing email" };
    }

    // 🔎 Search Stripe for a customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) {
      throw new Error("No customer found for this email");
    }

    const customerId = customers.data[0].id;

    // ✅ Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${event.headers.origin}/index.html`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("❌ Portal session error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
