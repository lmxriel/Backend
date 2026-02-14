const { adoptionEmail } = require("../Templates/EmailSenders/AdoptionEmail");
const {
  acceptedAppointment,
} = require("../Templates/EmailSenders/AcceptedAppointment");
const {
  rejectedAppointment,
} = require("../Templates/EmailSenders/RejectedAppointment");
const { otpEmail } = require("../Templates/EmailSenders/OtpEmail");
const db = require("../config/db");
const crypto = require("crypto");

exports.approveAdoption = (req, res) => {
  try {
    const adoptionId = req.params.id;
    const { adopterName, email, petName } = req.body;

    // 1. Get the pet_id from adoption table
    db.query(
      "SELECT pet_id FROM adoption WHERE adoption_id = ?",
      [adoptionId],
      (err, rows) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: "DB error" });
        }

        if (rows.length === 0) {
          return res.status(404).json({ error: "Adoption record not found" });
        }

        const petId = rows[0].pet_id;

        // 2. Update adoption status + dateAdopted
        db.query(
          "UPDATE adoption SET status = 'Approved', dateAdopted = CURDATE(), reasons = 'Approved by admin after review.' WHERE adoption_id = ?",
          [adoptionId],
          (err) => {
            if (err) {
              console.error(err);
              return res
                .status(500)
                .json({ error: "Failed to update adoption" });
            }

            // 3. Update pet status
            db.query(
              "UPDATE pet SET status = 'Unavailable' WHERE pet_id = ?",
              [petId],
              async (err) => {
                if (err) {
                  console.error(err);
                  return res
                    .status(500)
                    .json({ error: "Failed to update pet" });
                }

                try {
                  // 4. Send email with template
                  await adoptionEmail(
                    {
                      body: {
                        to: email,
                        userName: adopterName,
                        petName,
                        type: "approved",
                      },
                    },
                    { status: () => ({ json: () => {} }) },
                  );

                  return res.json({
                    success: true,
                    message:
                      "Adoption approved, date stamped, pet unavailable & email sent",
                  });
                } catch (emailErr) {
                  console.error(emailErr);
                  return res
                    .status(500)
                    .json({ error: "Failed to send email" });
                }
              },
            );
          },
        );
      },
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve adoption" });
  }
};

function queryAsync(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

exports.rejectAdoption = async (req, res) => {
  try {
    const adoptionId = req.params.id;
    const { adopterName, email, petName } = req.body;

    if (!adoptionId || !adopterName || !email || !petName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Use promise wrapper instead of await db.query(...)
    const result = await queryAsync(
      "UPDATE adoption SET status = 'Rejected', reasons = 'Rejected by admin due to incomplete documents.' WHERE adoption_id = ?",
      [adoptionId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Adoption request not found" });
    }

    console.log("Rejecting adoption:", { adoptionId, petName, email });

    await adoptionEmail(
      {
        body: {
          to: email,
          userName: adopterName,
          petName: petName,
          type: "rejected",
        },
      },
      { status: () => ({ json: () => {} }) },
    );

    return res.json({
      success: true,
      message: "Adoption rejected & email sent",
    });
  } catch (err) {
    console.error("rejectAdoption error:", err);
    res.status(500).json({ error: "Failed to reject adoption" });
  }
};

exports.approveAppointment = (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { appointmentSetter, email } = req.body;

    // 1. Update appointment review
    db.query(
      "UPDATE appointment SET review = 'Accepted' WHERE appointment_id = ?",
      [appointmentId],
      (err) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ error: "Failed to update appointment review" });
        }

        // 2. Fetch appointment details
        db.query(
          "SELECT appointment_date, timeSchedule, appointment_type FROM appointment WHERE appointment_id = ? LIMIT 1",
          [appointmentId],
          async (err, rows) => {
            if (err) {
              console.error(err);
              return res
                .status(500)
                .json({ error: "DB error while fetching appointment" });
            }

            if (rows.length === 0) {
              return res.status(404).json({ error: "Appointment not found" });
            }

            const { appointment_date, timeSchedule, appointment_type } =
              rows[0];

            // Format appointment_date (e.g. February 6, 2025)
            const formattedDate = new Intl.DateTimeFormat("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }).format(appointment_date);

            // Format timeSchedule (e.g. 12:00 PM)
            let [hours, minutes] = timeSchedule.split(":").map(Number);
            const formattedTime = new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }).format(new Date(0, 0, 0, hours, minutes));

            console.log("Formatted:", formattedDate, formattedTime);

            try {
              // 3. Send email with template
              await acceptedAppointment(
                {
                  body: {
                    to: email,
                    userName: appointmentSetter,
                    appointmentDate: formattedDate,
                    appointmentTime: formattedTime,
                    type: appointment_type,
                    status: "approved",
                  },
                },
                { status: () => ({ json: () => {} }) },
              );

              return res.json({
                success: true,
                message: `Appointment accepted, review updated & ${appointment_type} email sent with schedule details`,
              });
            } catch (emailErr) {
              console.error(emailErr);
              return res.status(500).json({ error: "Failed to send email" });
            }
          },
        );
      },
    );
  } catch (err) {
    console.error("Error accepting appointment:", err);
    res.status(500).json({ error: "Failed to accept appointment" });
  }
};

exports.rejectAppointment = (req, res) => {
  try {
    const appointmentId = req.params.id;
    const { appointmentSetter, email } = req.body;

    // 1. Update appointment review
    db.query(
      "UPDATE appointment SET review = 'Rejected' WHERE appointment_id = ?",
      [appointmentId],
      (err) => {
        if (err) {
          console.error(err);
          return res
            .status(500)
            .json({ error: "Failed to update appointment" });
        }

        // 2. Get appointment_type for the email
        db.query(
          "SELECT appointment_type FROM appointment WHERE appointment_id = ?",
          [appointmentId],
          async (err, rows) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ error: "DB error" });
            }

            if (rows.length === 0) {
              return res.status(404).json({ error: "Appointment not found" });
            }

            const { appointment_type } = rows[0];

            try {
              // 3. Send rejection email
              await rejectedAppointment(
                {
                  body: {
                    to: email,
                    userName: appointmentSetter,
                    type: appointment_type,
                    status: "rejected",
                  },
                },
                { status: () => ({ json: () => {} }) },
              );

              // 4. Success response
              return res.json({
                success: true,
                message: `Appointment rejected, review updated & ${appointment_type} email sent`,
              });
            } catch (emailErr) {
              console.error(emailErr);
              return res.status(500).json({ error: "Failed to send email" });
            }
          },
        );
      },
    );
  } catch (err) {
    console.error("Error rejecting appointment:", err);
    res.status(500).json({ error: "Failed to reject appointment" });
  }
};

exports.sendRegistrationOtp = (req, res) => {
  try {
    let { email, userName } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    email = String(email).trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresInSeconds = 120;

    const insertSql = `
      INSERT INTO otp (email, code, created_at)
      VALUES (?, ?, NOW())
    `;

    db.query(insertSql, [email, otp], async (err) => {
      if (err) {
        console.error("❌ OTP insert error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      try {
        await otpEmail({
          to: email,
          userName: userName || "PawfectCare User",
          otp,
          expiresInSeconds,
        });

        return res.status(201).json({
          message: "OTP generated and email sent",
          // REMOVE OTP IN PRODUCTION
          otp,
          expires_in_seconds: expiresInSeconds,
        });
      } catch (emailErr) {
        console.error("❌ Send OTP email error:", emailErr.message);
        return res.status(500).json({ message: "Failed to send OTP email" });
      }
    });
  } catch (error) {
    console.error("❌ sendRegistrationOtp error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
