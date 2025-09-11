import Stripe from "stripe";
import nodemailer from "nodemailer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Create a reusable transporter (SendGrid SMTP)
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false,
  auth: {
    user: "apikey", // this must literally be the string "apikey"
    pass: process.env.SENDGRID_API_KEY, // store your SendGrid API key in env vars
  },
});

export async function handler(event) {
  try {
    const sig = event.headers["stripe-signature"];
    const body = event.body; // raw string from Netlify

    // Verify Stripe webhook signature
    const stripeEvent = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log("✅ Webhook received:", stripeEvent.type);

    switch (stripeEvent.type) {
      case "checkout.session.completed": {
        const session = stripeEvent.data.object;

        let briefData = {};
        try {
          briefData = JSON.parse(session.metadata.brief || "{}");
        } catch (e) {
          console.error("Failed to parse brief metadata:", e);
        }

        // ===============================
        // 1) Internal order notification
        // ===============================
        const adminMessage = `
✅ New Paid Order
───────────────────────────────
Package: ${session.metadata.pkg}
Hosting: ${session.metadata.hosting}
Business: ${briefData.businessName || "—"}
Email: ${briefData.contactEmail || "—"}

Domains: ${session.metadata.domains || "—"}

Full Brief:
${JSON.stringify(briefData, null, 2)}
        `;

        await transporter.sendMail({
          from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
          to: "support@snowhoneystudios.ca",
          subject: `New Order: ${session.metadata.pkg}`,
          text: adminMessage,
        });

        console.log("📧 Sent internal order email");

        // ===============================
        // 2) Customer confirmation email
        // ===============================
        await transporter.sendMail({
          from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
          to: session.customer_details.email, // customer’s email from Stripe
          subject: "Your Snowhoney order is confirmed!",
          text: `Hi ${session.customer_details.name || "there"},

Thanks for your purchase of ${session.metadata.pkg} with Snowhoney Studios.

We’ll be in touch soon with next steps. If you have questions, just reply to this email.

— Snowhoney Studios`,
          html: `
            <p>Hi ${session.customer_details.name || "there"},</p>
            <p>Thanks for your purchase of <b>${session.metadata.pkg}</b> with <b>Snowhoney Studios</b>.</p>
            <p>We’ll be in touch soon with next steps. If you have any questions, just reply to this email.</p>
            <p>🍯❄️<br/>— Snowhoney Studios</p>
          `,
        });

        console.log("📧 Sent confirmation email to customer");
        break;
      }

      case "invoice.paid": {
        const invoice = stripeEvent.data.object;
        console.log("Invoice paid:", invoice.id);
        break;
      }

      case "invoice.payment_failed": {
        const failedInvoice = stripeEvent.data.object;
        console.log("Invoice failed:", failedInvoice.id);
        break;
      }

      default:
        console.log("Unhandled event type:", stripeEvent.type);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }
}
