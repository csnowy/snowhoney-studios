import nodemailer from "nodemailer";

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method not allowed" };
    }

    const { name, email, message } = JSON.parse(event.body);

    if (!name || !email || !message) {
      return { statusCode: 400, body: "Missing required fields" };
    }

    // configure SMTP (Zoho, SendGrid, or your domain provider)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // e.g. smtp.zoho.com
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER, // e.g. support@snowhoneystudios.ca
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"Website Contact" <${process.env.SMTP_USER}>`,
      to: "support@snowhoneystudios.ca",
      replyTo: email,
      subject: `New Contact Form Submission from ${name}`,
      text: message,
      html: `<p><b>Name:</b> ${name}</p>
             <p><b>Email:</b> ${email}</p>
             <p><b>Message:</b></p>
             <p>${message}</p>`
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("❌ Contact form error:", err);
    return { statusCode: 500, body: "Failed to send message." };
  }
}
