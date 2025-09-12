// netlify/functions/stripe-webhook.js
import Stripe from "stripe";
import sgMail from "@sendgrid/mail";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function handler(event) {
  try {
    const sig = event.headers["stripe-signature"];
    const body = event.body; // raw string from Netlify

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

        // -----------------------------
        // 1) Internal notification
        // -----------------------------
        const messageText = `
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

        await sgMail.send({
          to: process.env.SENDGRID_TO,
          from: process.env.SENDGRID_FROM,
          subject: `New Order: ${session.metadata.pkg}`,
          text: messageText,
          html: `<pre>${messageText}</pre>`,
        });

        console.log("📧 Internal order email sent!");

        // -----------------------------
        // 2) Customer confirmation
        // -----------------------------
        if (session.customer_details?.email) {
          const customerEmail = session.customer_details.email;
          const pkg = session.metadata.pkg;

          const customerText = `
Hi ${briefData.businessName || "there"},

Thank you for your purchase with Snowhoney Studios! 🐝❄️

Your order details:
- Package: ${pkg}
- Hosting: ${session.metadata.hosting}
- Domains: ${session.metadata.domains || "—"}

We’ll review your brief and start your project within the next 24 hours.  
You’ll receive updates by email as we progress.

— The Snowhoney Studios Team
          `;

          const customerHtml = `
            <div style="font-family: Arial, sans-serif; color:#222; line-height:1.6;">
              <h2 style="color:#F5B700;">Thanks for your order with Snowhoney Studios! 🐝❄️</h2>
              <p>Hi ${briefData.businessName || "there"},</p>
              <p>We’re excited to get started on your new website. Here’s a summary of your order:</p>
              <ul style="margin:16px 0; padding-left:18px; color:#333;">
                <li><b>Package:</b> ${pkg}</li>
                <li><b>Hosting:</b> ${session.metadata.hosting}</li>
                <li><b>Domains:</b> ${session.metadata.domains || "—"}</li>
              </ul>
              <p style="margin:16px 0; padding:12px; background:#FFF8E1; border-left:4px solid #F5B700; border-radius:6px;">
                We’ll review your brief and begin work within 24 hours.  
                Expect updates by email as we progress. 🛠️
              </p>
              <p style="margin-top:20px;">
                Thanks again for trusting <b>Snowhoney Studios</b> — where ideas drip with honey and sparkle with snow. ✨
              </p>
              <br/>
              <p>— The Snowhoney Studios Team</p>
            </div>
          `;

          await sgMail.send({
            to: customerEmail,
            from: process.env.SENDGRID_FROM,
            replyTo: process.env.SENDGRID_TO,
            subject: "🐝❄️ Order Confirmation – Snowhoney Studios",
            text: customerText,
            html: customerHtml,
          });

          console.log(`📧 Confirmation email sent to ${customerEmail}`);
        } else {
          console.warn("⚠️ No customer email found in session.");
        }

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
