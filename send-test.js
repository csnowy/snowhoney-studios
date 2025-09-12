import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: 'support@snowhoneystudios.ca',
    pass: 'APP_PASSWORD',
  },
});

transporter.sendMail({
  from: "support@snowhoneystudios.ca",   // ✅ must match auth.user
  to: "support@snowhoneystudios.ca",     // you can test by sending to yourself
  subject: "SMTP test",
  text: "If you got this, SMTP works!",
})
.then(() => console.log("✅ Sent"))
.catch(err => console.error("❌ Error:", err));
