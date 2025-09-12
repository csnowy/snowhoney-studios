import Stripe from "stripe";
import nodemailer from "nodemailer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Support transporter (internal notifications)
const supportTransporter = nodemailer.createTransport({
  host: process.env.SMTP_SUPPORT_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_SUPPORT_USER,
    pass: process.env.SMTP_SUPPORT_PASS,
  },
});

// Noreply transporter (customer confirmations)
const noreplyTransporter = nodemailer.createTransport({
  host: process.env.SMTP_NOREPLY_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_NOREPLY_USER,
    pass: process.env.SMTP_NOREPLY_PASS,
  },
});

export async function handler(event) {
  try {
    const sig = event.headers["stripe-signature"];
    const body = event.body; // raw string

    // Verify webhook signature
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

        // 1) Internal notification → Support
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

        await supportTransporter.sendMail({
          from: `"Snowhoney Studios Orders" <${process.env.SMTP_SUPPORT_USER}>`,
          to: "support@snowhoneystudios.ca",
          subject: `New Order: ${session.metadata.pkg}`,
          text: adminMessage,
        });

        console.log("📧 Sent internal order email");

        // 2) Customer confirmation → Noreply
        await noreplyTransporter.sendMail({
          from: `"Snowhoney Studios" <${process.env.SMTP_NOREPLY_USER}>`,
          to: session.customer_details.email,
          subject: "Your Snowhoney order is confirmed!",
          text: `Hi ${session.customer_details.name || "there"},

Thanks for your purchase of ${session.metadata.pkg} with Snowhoney Studios.

We’ll be in touch soon with next steps. If you have questions, reply to support@snowhoneystudios.ca.

— Snowhoney Studios`,
          html: `
            <p>Hi ${session.customer_details.name || "there"},</p>
            <p>Thanks for your purchase of <b>${session.metadata.pkg}</b> with <b>Snowhoney Studios</b>.</p>
            <p>We’ll be in touch soon with next steps. If you have any questions, reply to <a href="mailto:support@snowhoneystudios.ca">support@snowhoneystudios.ca</a>.</p>
            <p>🍯❄️<br/>— Snowhoney Studios</p>
          `,
        });

        console.log("📧 Sent confirmation email to customer");
        break;
      }

      case "invoice.paid": {
        console.log("Invoice paid:", stripeEvent.data.object.id);
        break;
      }

      case "invoice.payment_failed": {
        console.log("Invoice failed:", stripeEvent.data.object.id);
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
