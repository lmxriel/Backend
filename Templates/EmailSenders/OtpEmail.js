const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

// =====================
// ENV VARIABLES
// =====================
const GMAIL_USER = process.env.GMAIL_USER;
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI;

// =====================
// OAUTH CLIENT
// =====================
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// =====================
// SEND EMAIL VIA GMAIL API
// =====================
async function sendGmail({ to, subject, html }) {
  if (!to) throw new Error("Missing recipient email");

  const cleanTo = String(to).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTo)) {
    throw new Error(`Invalid email address: ${cleanTo}`);
  }

  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

  const rawMessage = [
    `From: Pawfect Care <${GMAIL_USER}>`,
    `To: <${cleanTo}>`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });

  return res.data;
}

// =====================
// OTP EMAIL SERVICE
// =====================
exports.otpEmail = async function ({ to, userName, otp, expiresInSeconds }) {
  const templatePath = path.join(__dirname, "../ComposedEmails/OtpEmail.html");

  let htmlContent = fs.readFileSync(templatePath, "utf-8");

  htmlContent = htmlContent
    .replace(/{{userName}}/g, userName)
    .replace(/{{otp}}/g, otp)
    .replace(/{{expiresIn}}/g, String(expiresInSeconds));

  const data = await sendGmail({
    to,
    subject: "Your PawfectCare Verification Code",
    html: htmlContent,
  });
  return data;
};
