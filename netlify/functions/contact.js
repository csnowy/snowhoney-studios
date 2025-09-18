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
    // 1) Internal notification
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
            from: `"Snowhoney Studios Support" <noreply@snowhoneystudios.ca>`,
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
    // 2) Confirmation to Sender
    // -----------------------------    

    await sendEmail({
      to: formData.email, // sender’s email
      from: `"Snowhoney Studios" <noreply@snowhoneystudios.ca>`,
      subject: "Thanks for contacting Snowhoney Studios ✨",
      html: buildBrandedEmail({
        title: "Message Received 📨",
        message: `Hi ${formData.name},<br><br>Thanks for reaching out! We’ve received your message and our team will review it shortly.<br><br><i>Your message:</i><br>${formData.message}`,
      }),
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
