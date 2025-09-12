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

    // Support SMTP transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_SUPPORT_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_SUPPORT_USER,
        pass: process.env.SMTP_SUPPORT_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Website Contact" <${process.env.SMTP_SUPPORT_USER}>`,
      to: "support@snowhoneystudios.ca", // primary inbox
      replyTo: email,
      subject: `New Contact Form Submission from ${name}`,
      text: message,
      html: `<p><b>Name:</b> ${name}</p>
             <p><b>Email:</b> ${email}</p>
             <p><b>Message:</b></p>
             <p>${message}</p>`,
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (err) {
    console.error("❌ Contact form error:", err);
    return { statusCode: 500, body: "Failed to send message." };
  }
}
