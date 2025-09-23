// netlify/utils/email.js
import sgMail from "@sendgrid/mail";

// Load API key once
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Build a Snowhoney Studios branded HTML email
 */
export function buildBrandedEmail({ title, message, highlight }) {
  return `
  <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
              background:#f9fafb; padding:24px; color:#111827">
    <div style="max-width:600px;margin:auto;background:#fff;
                border-radius:12px;padding:24px;
                border:1px solid #eee;">
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

/**
 * Send an email using SendGrid
 */
export async function sendEmail(msg) {
  try {
    await sgMail.send(msg);
    console.log("📧 Email sent:", msg.subject);
  } catch (err) {
    console.error("❌ SendGrid error:", err.response?.body || err);
    throw err;
  }
}
