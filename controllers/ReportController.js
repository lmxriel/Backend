// backend/controllers/ReportController.js
const db = require("../config/db");

const parseDate = (v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

// GET /process/report/adoptions?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getAdoptionReport = (req, res) => {
  const from = parseDate(req.query.from) || "1970-01-01";
  const to = parseDate(req.query.to) || "2999-12-31";

  const qApprovedAdoptions = `
    SELECT
      ad.adoption_id,
      ad.pet_id,
      p.name       AS pet_name,
      p.breed      AS pet_breed,
      p.pet_type,
      ad.user_id   AS adopter_id,
      u.first_name AS adopter_first_name,
      u.last_name  AS adopter_last_name,
      u.email      AS adopter_email,
      ad.dateRequested,
      ad.dateAdopted,
      ad.purpose_of_adoption,
      ad.status,
      ad.reasons
    FROM adoption ad
    JOIN pet  p ON p.pet_id = ad.pet_id
    JOIN user u ON u.user_id = ad.user_id
    WHERE ad.dateRequested BETWEEN ? AND ?
    ORDER BY ad.dateRequested DESC, ad.adoption_id DESC
  `;

  db.query(qApprovedAdoptions, [from, to], (err, rows) => {
    if (err) {
      console.error("Approved adoptions report error:", err);
      return res
        .status(500)
        .json({ message: "DB error (adoptions)", error: err });
    }

    return res.status(200).json({
      range: { from, to },
      approvedAdoptions: rows || [],
    });
  });
};

// GET /process/report/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getAppointmentReport = (req, res) => {
  const from = parseDate(req.query.from) || "1970-01-01";
  const to = parseDate(req.query.to) || "2999-12-31";

  const qApprovedAppointments = `
    SELECT
      a.appointment_id,
      a.user_id,
      u.first_name,
      u.last_name,
      u.email,
      a.appointment_type,
      a.review       AS status,
      a.appointment_date,
      a.timeSchedule
    FROM appointment a
    JOIN user u ON u.user_id = a.user_id
    WHERE a.appointment_date BETWEEN ? AND ?
    ORDER BY a.appointment_date DESC,
             a.timeSchedule DESC,
             a.appointment_id DESC
  `;

  db.query(qApprovedAppointments, [from, to], (err, rows) => {
    if (err) {
      console.error("Approved appointments report error:", err);
      return res
        .status(500)
        .json({ message: "DB error (appointments)", error: err });
    }

    return res.status(200).json({
      range: { from, to },
      approvedAppointments: rows || [],
    });
  });
};
