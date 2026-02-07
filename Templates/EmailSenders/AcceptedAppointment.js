// Templates/EmailSenders/AcceptedAppointmentEmail.js
const fs = require("fs");
const path = require("path");
const { sendGmail } = require("./GmailClient"); // adjust path if needed

exports.acceptedAppointment = async (req, res) => {
  try {
    const { to, userName, appointmentDate, appointmentTime, type, status } =
      req.body;

    if (!to || !type || !status) {
      return res.status(400).json({
        success: false,
        error: "to, type, and status are required",
      });
    }

    const templateFile =
      type === "consultation"
        ? "consultationAccepted.html"
        : "vaccinationAccepted.html";

    const templatePath = path.join(
      __dirname,
      `../ComposedEmails/${templateFile}`
    );

    let htmlContent = fs.readFileSync(templatePath, "utf-8");

    htmlContent = htmlContent
      .replace(/{{userName}}/g, userName || "PawfectCare User")
      .replace(/{{date}}/g, appointmentDate || "")
      .replace(/{{time}}/g, appointmentTime || "");

    const subject =
      status === "approved" ? "Appointment Approved" : "Appointment Rejected";

    const data = await sendGmail({
      to,
      subject,
      html: htmlContent,
    });

    console.log("Accepted appointment email sent via Gmail API:", data.id);
    return res.status(200).json({ success: true, messageId: data.id });
  } catch (error) {
    console.error("Accepted appointment email error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
