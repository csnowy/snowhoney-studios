import nodemailer from "nodemailer";

async function main() {
  const transporter = nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 587,
    auth: {
      user: "apikey", // literally the string "apikey"
      pass: process.env.SENDGRID_API_KEY, // your key in env vars
    },
  });

  const info = await transporter.sendMail({
    from: `"Snowhoney Studios" <noreply@snowhoney.ca>`, // must match your verified sender
    to: "yourpersonalemail@gmail.com", // replace with your inbox
    subject: "Test email from SendGrid SMTP",
    text: "Hello! This is a plain-text test email.",
    html: "<strong>Hello!</strong><p>This is a test email via <b>SMTP</b>.</p>",
  });

  console.log("✅ Message sent:", info.messageId);
}

main().catch(console.error);
