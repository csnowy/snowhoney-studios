// netlify/functions/edit-request.js
import sg from "@sendgrid/mail";
sg.setApiKey(process.env.SENDGRID_API_KEY);

const SUPPORT_TO = process.env.SUPPORT_INBOX || "support@snowhoneystudios.ca";
const FROM_EMAIL = process.env.SEND_FROM || "noreply@snowhoneystudios.ca";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const body = JSON.parse(event.body || "{}");
    const {
      businessName = "",
      requestType = "",
      requestDetails = "",
      contactEmail = "",
      attachments = []
    } = body;

    // ==================
    // Validation
    // ==================
    if (!businessName || !requestType || !requestDetails || !contactEmail) {
      return { statusCode: 400, body: "Missing required fields." };
    }

    if (
      businessName.length > 100 ||
      contactEmail.length > 120 ||
      requestDetails.length < 20 ||
      requestDetails.length > 1000
    ) {
      return { statusCode: 400, body: "Field length requirements not met." };
    }

    // Build attachments summary for auto-reply
    const fileSummary = (attachments || []).map(a => a.filename).join(", ");

    // ==================
    // Email to Support
    // ==================
    const subject = `Edit Request: ${businessName} (${requestType})`;
    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial">
        <h2>New Edit Request</h2>
        <p><b>Business:</b> ${escapeHtml(businessName)}</p>
        <p><b>Type:</b> ${escapeHtml(requestType)}</p>
        <p><b>Details:</b></p>
        <pre style="white-space:pre-wrap;font-family:inherit;border:1px solid #eee;padding:10px;border-radius:8px;background:#fafafa">${escapeHtml(requestDetails)}</pre>
        <p><b>Client Email:</b> ${escapeHtml(contactEmail)}</p>
        <p><b>Files:</b> ${fileSummary || "None"}</p>
        <hr>
        <p style="color:#6b7280;font-size:13px">Sent from Snowhoney Client Dashboard</p>
      </div>
    `;

    await sg.send({
      to: SUPPORT_TO,
      from: FROM_EMAIL,
      subject,
      html,
      replyTo: contactEmail,
      attachments: attachments || [] // 👈 send files to support
    });

    // ==================
    // Auto-Reply to Client
    // ==================
    await sg.send({
      to: contactEmail,
      from: FROM_EMAIL,
      subject: `We received your request at Snowhoney Studios`,
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial">
          <h2>Thanks, we’ve received your edit request ✅</h2>
          <p>Hi ${escapeHtml(businessName)},</p>
          <p>Your request for <b>${escapeHtml(requestType)}</b> was received and added to our queue.</p>

          <h3>Here’s a summary of what you sent us:</h3>
          <ul>
            <li><b>Business:</b> ${escapeHtml(businessName)}</li>
            <li><b>Type:</b> ${escapeHtml(requestType)}</li>
            <li><b>Details:</b><br>
              <pre style="white-space:pre-wrap;font-family:inherit;border:1px solid #eee;padding:10px;border-radius:8px;background:#fafafa">
${escapeHtml(requestDetails)}</pre>
            </li>
            <li><b>Files:</b> ${fileSummary || "None"}</li>
          </ul>

          <p>We’ll review your request and get back to you shortly.</p>

          <hr>
          <p style="color:#6b7280;font-size:13px">
            Snowhoney Studios<br>
            support@snowhoneystudios.ca
          </p>
        </div>
      `,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("SendGrid error", err);
    return { statusCode: 500, body: "Failed to send email." };
  }
};

// Escape helper to avoid injection
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}
