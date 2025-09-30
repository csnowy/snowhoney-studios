import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

const PRICE_MAP = {
  "Test": process.env.PRICE_TEST,

  // one-time site builds:
  "One-Page Site": process.env.PRICE_ONEPAGE,
  "Two-Page Site": process.env.PRICE_TWOPAGE,
  "Three-Page Site": process.env.PRICE_THREEPAGE,
  "Mockup Only": process.env.PRICE_MOCKUP,
  "Extra Page": process.env.PRICE_EXTRAPAGE,

  // subscriptions:
  "Basic Hosting": process.env.PRICE_HOST_BASIC,
  "Boost Hosting": process.env.PRICE_HOST_BOOST,
  "Dominate Hosting": process.env.PRICE_HOST_DOMINATE,
};

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
    }

    const parsed = JSON.parse(event.body || "{}");
    const { pkg, hosting, email, businessName, domains, brief, extraPages, mockupCredit } = parsed;

    if (!pkg || !PRICE_MAP[pkg]) {
      return { statusCode: 400, body: JSON.stringify({ error: "Unknown package selection" }) };
    }

    const oneTimePriceId = PRICE_MAP[pkg];
    const isManagedHosting = hosting && hosting !== "self";
    const recurringPriceId = isManagedHosting ? PRICE_MAP[hosting] : null;

    // Build line items
    const line_items = [{ price: oneTimePriceId, quantity: 1 }];
    if (recurringPriceId) line_items.push({ price: recurringPriceId, quantity: 1 });
    if (extraPages && extraPages > 0) {
      line_items.push({ price: PRICE_MAP["Extra Page"], quantity: extraPages });
    }

    // Mode
    const mode = recurringPriceId ? "subscription" : "payment";

    // Trial logic
    let subscription_data;
    if (recurringPriceId) {
      let trialDays = 7;
      if (pkg === "Two-Page Site" && hosting === "Basic Hosting") trialDays = 30 + 7;
      if (pkg === "Three-Page Site" && hosting === "Basic Hosting") trialDays = 60 + 7;
      subscription_data = { trial_period_days: trialDays };
    }

    // Discount logic (Boost/Dominate auto-discounts)
    const discounts = [];
    if (hosting === "Boost Hosting" || hosting === "Dominate Hosting") {
      if (pkg === "Two-Page Site") {
        discounts.push({ coupon: process.env.COUPON_24_OFF_1M });
      }
      if (pkg === "Three-Page Site") {
        discounts.push({ coupon: process.env.COUPON_24_OFF_2M });
      }
    }

    // Ensure customer exists
    let customer;
    if (email) {
      const existing = await stripe.customers.list({ email, limit: 1 });
      if (existing.data.length) {
        customer = existing.data[0];
      } else {
        customer = await stripe.customers.create({ email, name: businessName });
      }
    }

    // ✅ Check if they already bought a mockup
    let hasMockup = false;
    if (customer) {
      const invoices = await stripe.invoices.list({ customer: customer.id, limit: 10 });
      for (const inv of invoices.data) {
        // Only consider paid invoices
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
    }

    // ✅ Apply credit if they actually purchased a mockup
    if (hasMockup) {
      await stripe.customers.createBalanceTransaction(customer.id, {
        amount: -9900, // $99 in cents
        currency: "cad",
        description: "Mockup credit applied",
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customer?.id,
      line_items,
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto" },

      ...(subscription_data ? { subscription_data } : {}),
      ...(discounts.length ? { discounts } : { allow_promotion_codes: true }),

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
