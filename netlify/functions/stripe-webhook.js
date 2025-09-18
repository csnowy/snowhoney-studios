// netlify/functions/stripe-webhook.js
import Stripe from "stripe";
import sgMail from "@sendgrid/mail";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function buildBrandedEmail({ title, message, highlight }) {
  return `
  <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
              background:#f9fafb; padding:24px; color:#111827">
    <div style="max-width:600px;margin:auto;background:#fff;
                border-radius:12px;padding:24px;
                border:1px solid #eee;">
      <img src="https://snowhoneystudios.ca/logo.webp" 
           alt="Snowhoney Studios" width="60" 
           style="display:block;margin-bottom:20px;">

      <h2 style="color:#F5B700;margin-top:0;">${title}</h2>
      <p style="font-size:16px;line-height:1.5;">${message}</p>

      ${
        highlight
          ? `<div style="background:#F5B700;color:#111827;
                        padding:12px;border-radius:8px;
                        text-align:center;font-weight:600;
                        margin:20px 0;">
               ${highlight}
             </div>`
          : ""
      }

      <p style="font-size:15px;line-height:1.6;">
        Thank you for trusting <b>Snowhoney Studios</b> to keep your site humming 🐝.<br>
        If you need help, just hit reply or visit our 
        <a href="https://snowhoneystudios.ca/#contact" 
           style="color:#F5B700;text-decoration:none;">contact page</a>.
      </p>

      <hr style="margin:30px 0;border:none;border-top:1px solid #eee;">
      <p style="font-size:12px;color:#6b7280;">
        Snowhoney Studios · Saskatoon, SK<br>
        support@snowhoneystudios.ca
      </p>
    </div>
  </div>
  `;
}


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
          from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
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
            from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
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

      case "customer.subscription.updated": {
        const subscription = stripeEvent.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const email = customer.email;

        let newPlan;
        if (subscription.items.data[0].plan.nickname) {
          newPlan = subscription.items.data[0].plan.nickname;
        } else {
          const product = await stripe.products.retrieve(
            subscription.items.data[0].plan.product
          );
          newPlan = product.name;
        }

        if (subscription.cancel_at_period_end) {
          // Scheduled cancel
          await sendEmail({
            to: email,
            from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
            subject: "Your subscription will end soon 💛",
            html: buildBrandedEmail({
              title: "Subscription Ending Soon",
              message: `Hi ${email},<br><br>Your subscription will end on <b>${new Date(
                subscription.current_period_end * 1000
              ).toLocaleDateString()}</b>. We’ll miss you, but you’re always welcome back.`,
              highlight: `Plan: ${newPlan}`,
            }),
          });
        } else {
          // Plan changed
          await sendEmail({
            to: email,
            from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
            subject: "Your subscription has been updated ✨",
            html: buildBrandedEmail({
              title: "Subscription Updated ✨",
              message: `Hi ${email},<br><br>Your subscription has been updated successfully.`,
              highlight: `New Plan: ${newPlan}`,
            }),
          });
        }

        // Notify support
        await sendEmail({
          to: "support@snowhoneystudios.ca",
          from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
          subject: "Customer subscription change",
          text: `Customer ${email} updated their subscription. Plan: ${newPlan}`,
        });

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = stripeEvent.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const email = customer.email;

        await sendEmail({
          to: email,
          from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
          subject: "Your subscription has been canceled ❌",
          html: buildBrandedEmail({
            title: "Subscription Canceled ❌",
            message: `Hi ${email},<br><br>Your subscription has been canceled. 
                      You will no longer be billed. If this wasn’t intentional, 
                      you can resubscribe anytime through our website.`,
            highlight: "",
          }),
        });

        await sendEmail({
          to: "support@snowhoneystudios.ca",
          from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
          subject: "Customer canceled subscription",
          text: `Customer ${email} canceled their subscription.`,
        });

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
