const { adoptionEmail } = require("../Templates/EmailSenders/AdoptionEmail");
const db = require("../config/db");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

exports.updateReview = async (req, res) => {
  const { id } = req.params;
  const { review } = req.body;

  if (!review) {
    return res.status(400).json({ error: "Review is required" });
  }

  const sql = `
  UPDATE appointment
  SET review = ?
  WHERE appointment_id = ?
`;

  db.query(sql, [review, id], (err, result) => {
    if (err) {
      console.error("Error updating review:", err);
      return res.status(500).json({ error: "Failed to update review" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.json({ message: "Review updated successfully" });
  });
};
exports.getAllAppointment = async (req, res) => {
  const sql = `
  SELECT 
    a.appointment_id,
    a.user_id,
    u.first_name,
    u.last_name,
    u.email,
    CONCAT(u.first_name, ' ', u.last_name) AS appointmentSetter,
    a.appointment_type,
    a.review,
    a.appointment_date,
    a.timeSchedule
  FROM appointment a
  JOIN user u ON a.user_id = u.user_id
`;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
};
exports.submitAdoptionRequest = async (req, res) => {
  const { pet_id, purpose_of_adoption } = req.body;
  const user_id = req.user.user_id; // Extracted from JWT token

  if (!pet_id || !purpose_of_adoption) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1) Get user age from DB
    const ageQuery = `
      SELECT TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) AS age
      FROM user
      WHERE user_id = ?
    `;
    db.query(ageQuery, [user_id], async (ageErr, ageRows) => {
      if (ageErr) {
        console.error("Error getting user age:", ageErr);
        return res.status(500).json({ error: "Failed to validate user age" });
      }

      if (!ageRows.length || ageRows[0].age == null) {
        return res.status(400).json({
          error: "User birthdate is missing. Cannot process request.",
        });
      }

      const age = ageRows[0].age;

      // If user is below 18 → reject immediately
      if (age < 18) {
        return res.status(403).json({
          status: "UNDERAGE",
          message:
            "You must be at least 18 years old to submit an adoption request.",
        });
      }
      // 2) Age is 18+ → proceed with AI validation as before
      const prompt = `
        Respond ONLY in JSON format:
        { "decision": "VALID" } or { "decision": "INVALID" }

        Rules:
        - VALID: purpose includes love, care, sheltering, or protection.
        - INVALID: purpose includes harm, slavery, abuse, profit, neglect.
        - INVALID: if the purpose is only one sentence. Must be at least two sentences.

        Input: "${purpose_of_adoption}"
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      const match = responseText.match(/\{[^}]+\}/);
      if (!match) {
        console.error("AI did not return JSON:", responseText);
        return res.status(500).json({ error: "AI validation failed" });
      }

      let decisionObj;
      try {
        decisionObj = JSON.parse(match[0]);
      } catch (parseErr) {
        console.error(
          "JSON parse error:",
          parseErr,
          "Raw response:",
          responseText
        );
        return res.status(500).json({ error: "AI validation failed" });
      }

      const petQuery = `SELECT name FROM pet WHERE pet_id = ?`;
      db.query(petQuery, [pet_id], (err, petResult) => {
        if (err) {
          console.error("Error getting pet details:", err);
          return res.status(500).json({ error: "Failed to fetch pet details" });
        }

        const petName =
          petResult && petResult.length ? petResult[0].name : null;

        const userQuery = `SELECT email, last_name FROM user WHERE user_id = ?`;
        db.query(userQuery, [user_id], (err2, userResult) => {
          if (err2) {
            console.error("Error getting user details:", err2);
            return res
              .status(500)
              .json({ error: "Failed to fetch user details" });
          }

          const adopterEmail =
            userResult && userResult.length ? userResult[0].email : null;
          const adopterLastname =
            userResult && userResult.length ? userResult[0].last_name : null;

          // If INVALID → reject + send email
          if (decisionObj.decision !== "VALID") {
            setTimeout(async () => {
              try {
                await adoptionEmail(
                  {
                    body: {
                      to: adopterEmail,
                      userName: adopterLastname,
                      petName: petName,
                      type: "rejected",
                    },
                  },
                  { status: () => ({ json: () => {} }) }
                );
                console.log(
                  `Rejection email sent to ${adopterEmail} for ${petName}`
                );
              } catch (mailErr) {
                console.error("Error sending rejection email:", mailErr);
              }
            }, 1000);

            return res.json({
              status: "INVALID",
              message: "Invalid adoption purpose. Request rejected.",
              petName,
            });
          }

          // If VALID → insert into DB
          const sql = `
            INSERT INTO adoption (pet_id, user_id, dateRequested, purpose_of_adoption, status)
            VALUES (?, ?, NOW(), ?, 'Pending')
          `;

          db.query(
            sql,
            [pet_id, user_id, purpose_of_adoption],
            (insertErr, result) => {
              if (insertErr) {
                console.error("Error inserting adoption request:", insertErr);
                return res
                  .status(500)
                  .json({ error: "Failed to submit adoption request" });
              }

              res.json({
                message: "Adoption request submitted successfully",
                adoption_id: result.insertId,
                petName,
              });
            }
          );
        });
      });
    });
  } catch (error) {
    console.error("Validation error:", error);
    res.status(500).json({ error: "Adoption validation process failed" });
  }
};
exports.getAppointmentAvailability = (req, res) => {
  const { date } = req.query; // 'YYYY-MM-DD'

  if (!date) {
    return res.status(400).json({ error: "date query param is required" });
  }

  const sql = `
    SELECT timeSchedule
    FROM appointment
    WHERE appointment_date = ?
  `;

  db.query(sql, [date], (err, rows) => {
    if (err) {
      console.error("Error fetching availability:", err);
      return res.status(500).json({ error: "Failed to fetch availability" });
    }

    // Normalize TIME "HH:MM:SS" -> "HH:MM" and skip nulls
    const booked = rows
      .filter((r) => r.timeSchedule != null)
      .map((r) => r.timeSchedule.toString().slice(0, 5));

    return res.json({ date, booked });
  });
};
