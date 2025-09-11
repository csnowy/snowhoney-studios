import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// Map your UI strings to Price IDs you created in the Dashboard
const PRICE_MAP = {
  // one-time site builds:
  "One-Page Site": process.env.PRICE_ONEPAGE,
  "Two-Page Site": process.env.PRICE_TWOPAGE,
  "Three-Page Site": process.env.PRICE_THREEPAGE,
  "Mockup Only": process.env.PRICE_MOCKUP,

  // subscriptions (monthly hosting):
  "Basic Hosting": process.env.PRICE_HOST_BASIC,
  "Grow Hosting": process.env.PRICE_HOST_GROW,
  "Local SEO Hosting": process.env.PRICE_HOST_SEO,
};

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const parsed = JSON.parse(event.body || "{}");
    const { pkg, hosting, email, businessName, domains, brief } = parsed;

    if (!pkg || !PRICE_MAP[pkg]) {
      return { statusCode: 400, body: JSON.stringify({ error: "Unknown package selection" }) };
    }

    const oneTimePriceId = PRICE_MAP[pkg];
    const isManagedHosting = hosting && hosting !== "self";
    const recurringPriceId = isManagedHosting ? PRICE_MAP[hosting] : null;

    // Build line items
    const line_items = [{ price: oneTimePriceId, quantity: 1 }];
    if (recurringPriceId) line_items.push({ price: recurringPriceId, quantity: 1 });

    // Choose mode: 'payment' for one-time only, 'subscription' if hosting included
    const mode = recurringPriceId ? "subscription" : "payment";

    // Create a Customer if email provided
    const customer = email
      ? await stripe.customers.create({ email, name: businessName })
      : undefined;

    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customer?.id,
      line_items,
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto" },
      allow_promotion_codes: true,

      // ✅ correctly pass brief + other info
      metadata: {
        pkg,
        hosting,
        domains: JSON.stringify(domains || []),
        brief: JSON.stringify(brief || {}),
      },

      success_url: `${event.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${event.headers.origin}/#payment`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        sessionId: session.id,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      }),
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Stripe error. Check server logs." }) };
  }
}
