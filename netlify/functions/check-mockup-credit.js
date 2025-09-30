import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
const PRICE_MAP = {
  "Mockup Only": process.env.PRICE_MOCKUP,
};

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }

    const { email } = JSON.parse(event.body || "{}");
    if (!email) {
      return { statusCode: 400, body: "Missing email" };
    }

    // Look up customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (!customers.data.length) {
      return { statusCode: 200, body: JSON.stringify({ hasMockup: false }) };
    }
    const customer = customers.data[0];

    // Look at invoices
    const invoices = await stripe.invoices.list({ customer: customer.id, limit: 10 });
    let hasMockup = false;
    for (const inv of invoices.data) {
      if (inv.status === "paid" && inv.lines?.data) {
        for (const line of inv.lines.data) {
          if (line.price?.id === PRICE_MAP["Mockup Only"]) {
            hasMockup = true;
            break;
          }
        }
      }
      if (hasMockup) break;
    }

    return { statusCode: 200, body: JSON.stringify({ hasMockup }) };
  } catch (err) {
    console.error("❌ check-mockup-credit error:", err);
    return { statusCode: 500, body: "Server error" };
  }
}
