// netlify/functions/contact.js
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const data = JSON.parse(event.body || "{}");
    const { name, email, message } = data;

    if (!name || !email || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" }),
      };
    }

    // -----------------------------
    // 1) Internal notification (to you)
    // -----------------------------
    const internalText = `
📩 New Contact Form Message
───────────────────────────────
Name: ${name}
Email: ${email}

Message:
${message}
    `;

    await sgMail.send({
      to: process.env.SENDGRID_TO,         // your Zoho inbox
      from: process.env.SENDGRID_FROM,     // verified noreply in SendGrid
      replyTo: email,                      // reply straight to sender
      subject: `📩 New Contact Form Message from ${name}`,
      text: internalText,
      html: `
        <h2>📩 New Contact Form Message</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b></p>
        <blockquote style="border-left:3px solid #F5B700; padding-left:10px; color:#444;">
          ${message.replace(/\n/g, "<br>")}
        </blockquote>
      `,
    });

    console.log("📧 Internal contact form email sent!");

    // -----------------------------
    // 2) Confirmation to the sender
    // -----------------------------
    const confirmText = `
Hi ${name},

Thanks for reaching out to Snowhoney Studios! 🐝❄️

We’ve received your message and our team will review it shortly.

Your message:
"${message}"

We’ll get back to you as soon as possible (usually within 1–2 business days).

In the meantime, thanks for checking out Snowhoney Studios — where ideas drip with honey and sparkle with snow. ✨

— The Snowhoney Studios Team
    `;

    const confirmHtml = `
      <div style="font-family: Arial, sans-serif; color: #222; line-height:1.6;">
        <h2 style="color:#F5B700;">Thanks for contacting Snowhoney Studios! 🐝❄️</h2>
        <p>Hi ${name},</p>
        <p>We’ve received your message and our team will review it shortly.</p>
        <p style="margin:16px 0; font-style:italic; border-left:3px solid #F5B700; padding-left:10px; color:#555;">
          ${message.replace(/\n/g, "<br>")}
        </p>
        <p>We’ll get back to you as soon as possible (usually within 1–2 business days).</p>
        <p style="margin-top:20px;">
          Thanks for visiting <b>Snowhoney Studios</b> — where ideas drip with honey and sparkle with snow. ✨
        </p>
        <br/>
        <p>— The Snowhoney Studios Team</p>
      </div>
    `;

    await sgMail.send({
      to: email,                           // back to the sender
      from: process.env.SENDGRID_FROM,     // noreply address
      replyTo: process.env.SENDGRID_TO,    // replies land in your support inbox
      subject: "🐝❄️ We’ve received your message – Snowhoney Studios",
      text: confirmText,
      html: confirmHtml,
    });

    console.log(`📧 Confirmation email sent to ${email}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("❌ Contact form error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to send message" }),
    };
  }
}
