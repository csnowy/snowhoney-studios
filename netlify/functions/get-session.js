import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

export async function handler(event) {
  try {
    const { session_id } = event.queryStringParameters;
    if (!session_id) {
      return { statusCode: 400, body: "Missing session_id" };
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["customer"],
    });

    return { statusCode: 200, body: JSON.stringify(session) };
  } catch (err) {
    console.error("❌ get-session error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
