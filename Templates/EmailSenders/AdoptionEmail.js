// Templates/EmailSenders/adoptionEmail.js
const fs = require("fs");
const path = require("path");
const { sendGmail } = require("./GmailClient"); // make sure path is correct

exports.adoptionEmail = async (req, res) => {
  try {
    const { to, userName, petName, type } = req.body;

    if (!to || !type) {
      return res
        .status(400)
        .json({ success: false, error: "to and type are required" });
    }

    const templateFile =
      type === "approved" ? "adoptionAccepted.html" : "adoptionRejected.html";

    const templatePath = path.join(
      __dirname,
      `../ComposedEmails/${templateFile}`
    );

    let htmlContent = fs.readFileSync(templatePath, "utf-8");

    htmlContent = htmlContent
      .replace(/{{userName}}/g, userName || "PawfectCare User")
      .replace(/{{petName}}/g, petName || "your pet");

    const subject =
      type === "approved" ? "Adoption Approved" : "Adoption Rejected";

    const data = await sendGmail({
      to,
      subject,
      html: htmlContent,
    });

    console.log("Adoption email sent via Gmail API:", data.id);
    return res.status(200).json({ success: true, messageId: data.id });
  } catch (error) {
    console.error("Adoption email error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
