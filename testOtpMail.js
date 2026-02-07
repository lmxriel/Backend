require("dotenv").config();
const { otpEmail } = require("./Templates/EmailSenders/OtpEmail"); // adjust path if needed

(async () => {
  try {
    const result = await otpEmail({
      to: "@gmail.com", // Change to your email
      userName: "Test User",
      otp: "123456",
      expiresInSeconds: "120",
    });

    console.log("✅ Email sent successfully!");
    console.log("Message ID:", result.id);
    console.log("Thread ID:", result.threadId);
  } catch (error) {
    console.error("❌ Email failed:", error.message);
    if (error.response) {
      console.error("Google API error:", error.response.data);
    }
  }
})();
