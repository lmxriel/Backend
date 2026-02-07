// Templates/EmailSenders/rejectedAppointmentEmail.js
const fs = require("fs");
const path = require("path");
const { sendGmail } = require("./GmailClient");

exports.rejectedAppointment = async (req, res) => {
  try {
    const { to, userName, type, status } = req.body;

    if (!to || !type || !status) {
      return res
        .status(400)
        .json({ success: false, error: "to, type, and status are required" });
    }

    const templateFile =
      type === "consultation"
        ? "consultationRejected.html"
        : "vaccinationRejected.html";

    const templatePath = path.join(
      __dirname,
      `../ComposedEmails/${templateFile}`
    );

    let htmlContent = fs.readFileSync(templatePath, "utf-8");

    htmlContent = htmlContent.replace(
      /{{userName}}/g,
      userName || "PawfectCare User"
    );

    const subject =
      status === "approved" ? "Appointment Approved" : "Appointment Rejected";

    const data = await sendGmail({
      to,
      subject,
      html: htmlContent,
    });

    console.log("Rejected appointment email sent via Gmail API:", data.id);

    return res.status(200).json({ success: true, messageId: data.id });
  } catch (error) {
    console.error("Rejected appointment email error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
