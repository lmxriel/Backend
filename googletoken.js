require("dotenv").config();
const { google } = require("googleapis");

const oAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  "https://pawfectcare-backend.onrender.com" // EXACT redirect URI
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/gmail.send"],
  prompt: "consent",
});

console.log("Open this URL:", authUrl);

(async () => {
  const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.question("Code: ", async (code) => {
    const { tokens } = await oAuth2Client.getToken(code);
    console.log("TOKENS:", tokens);
    readline.close();
  });
})();
