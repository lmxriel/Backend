const db = require("../config/db");

exports.getUserCount = async (req, res) => {
  const sql = "SELECT COUNT(*) AS count FROM `user` WHERE role = 'pet owner'";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error fetching users" });
    }
    res.json({ count: results[0].count });
  });
};
exports.getAppointmentCount = (req, res) => {
  const sql =
    "SELECT COUNT(*) AS count FROM `appointment` WHERE review = 'Pending'";
  db.query(sql, (err, results) => {
    if (err)
      return res.status(500).json({ message: "Error fetching appointments" });
    res.json({ count: results[0].count });
  });
};
exports.getAdoptionCount = (req, res) => {
  const sql =
    "SELECT COUNT(*) AS count FROM `adoption` WHERE status = 'pending'";
  db.query(sql, (err, results) => {
    if (err)
      return res.status(500).json({ message: "Error fetching adoptions" });
    res.json({ count: results[0].count });
  });
};
exports.getAdoptionDetails = async (req, res) => {
  const sql = `
    SELECT 
      a.adoption_id,
      CONCAT(u.first_name, ' ', u.last_name) AS adopter_name,
      p.name,
      u.email,
      a.dateRequested,
      a.dateAdopted,
      a.purpose_of_adoption,
      a.status
    FROM adoption a
    INNER JOIN user u ON a.user_id = u.user_id
    INNER JOIN pet p ON a.pet_id = p.pet_id
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Error fetching adoption details" });
    }
    res.json(results);
  });
};
