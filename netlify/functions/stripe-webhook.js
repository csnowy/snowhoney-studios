import { sendEmail, buildBrandedEmail } from "../utils/email.js";
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
        const pkg = session.metadata.pkg;
        const hosting = session.metadata.hosting;
        const domains = session.metadata.domains || "—";
        const customerDetails = session.customer_details || {};
        const businessName = (JSON.parse(session.metadata.brief || "{}").businessName) || "";
        const formFields = Object.entries(briefData)
          .map(([key, val]) => `${key}: ${val}`)
          .join("\n");

        let messageText;
          if (pkg === "Hosting Only") {
            messageText = `
          🧾 New Hosting Subscription
          ───────────────────────────────
          Customer: ${customerDetails.name || businessName || "—"}
          Email: ${customerDetails.email}

          Hosting Plan: ${session.metadata.hosting}
          Domains: ${session.metadata.domains || "—"}

          Session: ${session.id}
            `;
          } else if (pkg === "Mockup Only") {
            messageText = `
          🎨 New Mockup Order
          ───────────────────────────────
          Customer: ${customerDetails.name || businessName || "—"}
          Email: ${customerDetails.email}

          Package: Mockup Only
          Session: ${session.id}
            `;
          } else {
            messageText = `
          ✨ New Website Order
          ───────────────────────────────
          Customer: ${customerDetails.name || businessName || "—"}
          Email: ${customerDetails.email}

          Package: ${pkg}
          Hosting: ${hosting}
          Domains: ${domains || "—"}

          ${formFields || "No form data submitted"}

          Session: ${session.id}
            `;
          }


        let subjectLine;
        if (session.metadata.pkg === "Hosting Only") {
          subjectLine = `🖥️ New Hosting Subscription: ${session.metadata.hosting}`;
        } else if (session.metadata.pkg === "Mockup Only") {
          subjectLine = "🎨 New Mockup Order";
        } else {
          subjectLine = `✨ New Site Order: ${session.metadata.pkg}`;
        }

        await sgMail.send({
          to: process.env.SENDGRID_TO || "support@snowhoneystudios.ca",
          from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
          subject: subjectLine,
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
          const hosting = session.metadata.hosting;
          const domains = session.metadata.domains || "—";

          // Build list of form fields
          const formFieldsHtml = Object.entries(briefData)
            .map(([key, val]) => `<li><b>${key}:</b> ${val}</li>`)
            .join("");

          let customerText, customerHtml;

          if (pkg === "Hosting Only") {
            customerText = `
        Hi ${briefData.businessName || "there"},

        Thanks for choosing Snowhoney Studios to host your website! 🐝❄️

        Your order details:
        - Hosting Plan: ${hosting}
        - Domains: ${domains}

        We’ll connect your domain(s) and activate hosting within 24 hours.  
        You’ll receive an email when everything is live and ready.

        — The Snowhoney Studios Team
            `;

            customerHtml = `
              <div style="font-family: 'Kode Mono', Arial, sans-serif; color:#29343b; background:#f9fbfc; padding:30px; border-radius:12px; max-width:600px; margin:0 auto;">
                <div style="text-align:center; margin-bottom:20px;">
                  <img src="https://snowhoneystudios.ca/icon.png" alt="Snowhoney Studios Logo" style="max-width:80px;">
                  <h2 style="color:#2D7F84; font-family:'Freckle Face', cursive; margin:10px 0;">🐝❄️ Hosting setup in progress!</h2>
                </div>

                <p style="font-size:16px;">Hi ${briefData.businessName || "there"},</p>
                <p>Thanks for choosing Snowhoney Studios to host your website! Here’s what we have on file:</p>

                <ul style="list-style:none; padding:0; margin:20px 0; font-size:15px;">
                  <li><b>Hosting Plan:</b> ${hosting}</li>
                  <li><b>Domains:</b> ${domains}</li>
                  ${formFieldsHtml}
                </ul>

                <div style="background:#E0F7FA; padding:15px; border-radius:8px; margin:20px 0;">
                  <p style="margin:0; font-weight:bold; color:#2D7F84;">Next steps</p>
                  <p style="margin:5px 0 0;">We’ll connect your domain(s) and activate hosting within 24 hours. You’ll receive another email when everything is live.</p>
                </div>

                <p style="margin-top:20px; font-size:14px; color:#555;">
                  Thanks again for trusting <b style="color:#2D7F84;">Snowhoney Studios</b> with your hosting. We’ll keep your site fast, reliable, and humming 🐝❄️.
                </p>

                <p style="font-size:13px; color:#999; text-align:center; margin-top:40px;">
                  © ${new Date().getFullYear()} Snowhoney Studios — Made with 🍯 & ❄️
                </p>
              </div>
            `;
          } else {
            customerText = `
        Hi ${briefData.businessName || "there"},

        Thank you for your purchase with Snowhoney Studios! 🐝❄️

        Your order details:
        - Package: ${pkg}
        - Hosting: ${hosting}
        - Domains: ${domains}

        We’ll review your brief and start your project within the next 24 hours.  
        You’ll receive updates by email as we progress.

        — The Snowhoney Studios Team
            `;

            customerHtml = `
              <div style="font-family: 'Kode Mono', Arial, sans-serif; color:#29343b; background:#f9fbfc; padding:30px; border-radius:12px; max-width:600px; margin:0 auto;">
                <div style="text-align:center; margin-bottom:20px;">
                  <img src="https://snowhoneystudios.ca/icon.png" alt="Snowhoney Studios Logo" style="max-width:80px;">
                  <h2 style="color:#d54830; font-family:'Freckle Face', cursive; margin:10px 0;">🐝❄️ Thank you for your order!</h2>
                </div>

                <p style="font-size:16px;">Hi ${briefData.businessName || "there"},</p>
                <p>We’re excited to get started on your new website. Here’s a summary of your order:</p>

                <ul style="list-style:none; padding:0; margin:20px 0; font-size:15px;">
                  <li><b>Package:</b> ${pkg}</li>
                  <li><b>Hosting:</b> ${hosting}</li>
                  <li><b>Domains:</b> ${domains}</li>
                  ${formFieldsHtml}
                </ul>

                <div style="background:#FFF8E1; padding:15px; border-radius:8px; margin:20px 0;">
                  <p style="margin:0; font-weight:bold; color:#d54830;">What happens next?</p>
                  <p style="margin:5px 0 0;">We’ll review your brief and begin work within 24 hours. Expect updates by email as we progress 🛠️.</p>
                </div>

                <p style="margin-top:20px; font-size:14px; color:#555;">
                  Thanks again for trusting <b style="color:#d54830;">Snowhoney Studios</b> — where ideas drip with honey and sparkle with snow ✨.
                </p>

                <p style="font-size:13px; color:#999; text-align:center; margin-top:40px;">
                  © ${new Date().getFullYear()} Snowhoney Studios — Made with 🍯 & ❄️
                </p>
              </div>
            `;
          }

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
