import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export async function handler(event) {
  console.log("Loaded webhook secret?", process.env.STRIPE_WEBHOOK_SECRET ? "yes" : "no");
  try {
    const sig = event.headers["stripe-signature"];
    const body = event.body; // Netlify gives you raw string

    // Verify signature
    const stripeEvent = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Log the event type for debugging
    console.log("✅ Webhook received:", stripeEvent.type);

    // Handle events you care about
    switch (stripeEvent.type) {
      case "checkout.session.completed":
        const session = stripeEvent.data.object;
        console.log("Checkout complete for session:", session.id);
        // TODO: save order, send email, etc.
        break;

      case "invoice.paid":
        const invoice = stripeEvent.data.object;
        console.log("Invoice paid:", invoice.id);
        // TODO: mark hosting active
        break;

      case "invoice.payment_failed":
        const failedInvoice = stripeEvent.data.object;
        console.log("Invoice failed:", failedInvoice.id);
        // TODO: notify customer, pause service
        break;

      default:
        console.log("Unhandled event type:", stripeEvent.type);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }
}
