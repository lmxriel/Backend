const db = require("../config/db");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

exports.getAllPets = async (req, res) => {
  const sql = "SELECT * FROM pet WHERE status = 'Available'";

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err });

    const pets = rows.map((pet) => ({
      ...pet,
      imageUrl: pet.image
        ? `data:image/jpeg;base64,${pet.image.toString("base64")}`
        : null,
    }));

    res.json(pets);
  });
};

exports.getCatPets = async (req, res) => {
  const sql =
    "SELECT * FROM pet WHERE status = 'Available' AND pet_type = 'Cat'";

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err });

    const pets = rows.map((pet) => ({
      ...pet,
      imageUrl: pet.image
        ? `data:image/jpeg;base64,${pet.image.toString("base64")}`
        : null,
    }));

    res.json(pets);
  });
};

exports.getDogPets = async (req, res) => {
  const sql =
    "SELECT * FROM pet WHERE status = 'Available' AND pet_type = 'Dog'";

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err });

    const pets = rows.map((pet) => ({
      ...pet,
      imageUrl: pet.image
        ? `data:image/jpeg;base64,${pet.image.toString("base64")}`
        : null,
    }));

    res.json(pets);
  });
};

exports.addPet = async (req, res) => {
  try {
    const {
      name,
      breed,
      size,
      gender,
      weight,
      medical_status,
      color,
      status,
      image, // base64 string from frontend
    } = req.body;

    // Convert image to buffer if provided
    const imageBuffer = image
      ? Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64")
      : null;

    // --- AI classification (unchanged) ---
    let petType = "unknown";
    try {
      const prompt = `
        You are a pet classification AI. 
        Based on the following details, determine if the pet is a DOG or CAT.
        Only answer with "dog" or "cat". Nothing else.
        
        Name: ${name || "unknown"}
        Breed: ${breed || "unknown"}
        Size: ${size || "unknown"}
        Color: ${color || "unknown"}
      `;

      const result = await model.generateContent(prompt);
      const rawOutput = result.response.text().trim().toLowerCase();

      if (rawOutput.includes("dog")) petType = "Dog";
      else if (rawOutput.includes("cat")) petType = "Cat";
    } catch (aiError) {
      console.error("AI classification failed:", aiError);
      petType = "Unknown";
    }

    // --- CORRECT SQL: 10 columns => 10 placeholders (no trailing comma) ---
    const sql = `
      INSERT INTO pet
      (name, breed, pet_type, size, gender, weight, medical_status, color, status, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      name || null,
      breed || null,
      petType || null,
      size || null,
      gender || null,
      weight || null,
      medical_status || null,
      color || null,
      status || null,
      imageBuffer,
    ];

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error("Error inserting pet:", err);
        return res.status(500).json({ error: "Failed to add pet" });
      }

      res.json({
        message: "Pet added successfully",
      });
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.approveAdoption = async (req, res) => {
  const { id: adoption_id } = req.params;

  if (!adoption_id) {
    return res.status(400).json({ error: "Adoption ID is required" });
  }
  const getPetSql = `
    SELECT pet_id FROM adoption
    WHERE adoption_id = ? AND status = 'Pending'
  `;

  db.query(getPetSql, [adoption_id], (err, petResult) => {
    if (err) {
      console.error("Database error while fetching pet_id:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.sqlMessage });
    }

    if (petResult.length === 0) {
      return res
        .status(404)
        .json({ error: "Adoption request not found or already processed" });
    }

    const pet_id = petResult[0].pet_id;

    const updateAdoptionSql = `
      UPDATE adoption
      SET status = 'Approved', dateAdopted = NOW()
      WHERE adoption_id = ? AND status = 'Pending'
    `;

    db.query(updateAdoptionSql, [adoption_id], (err, adoptionUpdateResult) => {
      if (err) {
        console.error("Database error while updating adoption:", err);
        return res
          .status(500)
          .json({ error: "Database error", details: err.sqlMessage });
      }

      if (adoptionUpdateResult.affectedRows === 0) {
        return res
          .status(400)
          .json({ error: "Failed to approve adoption request" });
      }

      // 3. Update the pet status to 'Unavailable'
      const updatePetSql = `
        UPDATE pet
        SET status = 'Unavailable'
        WHERE pet_id = ? 
      `;
      db.query(updatePetSql, [pet_id], (err, petUpdateResult) => {
        if (err) {
          console.error("Database error while updating pet status:", err);
          return res
            .status(500)
            .json({ error: "Database error", details: err.sqlMessage });
        }
        // 4. Send final success response
        res.json({
          message: "Adoption approved and pet status updated successfully",
          adoption_id,
          pet_id,
        });
      });
    });
  });
};

exports.updatePet = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    breed,
    size,
    gender,
    weight,
    medical_status,
    color,
    status,

    image, // base64 string from frontend
  } = req.body;

  const imageBuffer = image
    ? Buffer.from(image.replace(/^data:image\/\w+;base64,/, ""), "base64")
    : null;

  let sql = `
      UPDATE pet 
      SET name=?, breed=?, size=?, gender=?, weight=?, medical_status=?, color=?, status=?`;
  const params = [
    name,
    breed,
    size,
    gender,
    weight,
    medical_status,
    color,
    status,
  ];

  if (imageBuffer) {
    sql += ", image=?";
    params.push(imageBuffer);
  }

  sql += " WHERE pet_id=?";
  params.push(id);

  db.query(sql, params, (err) => {
    if (err) return res.status(500).json({ error: "Database update failed" });
    res.json({ message: "Pet updated successfully" });
  });
};
exports.deletePet = (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM pet WHERE pet_id = ?`;

  db.query(sql, [id], (err, result) => {
    if (err)
      return res.status(500).json({
        success: false,
        error: "Error deleting pet" || err.sqlMessage,
      });

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, error: "Pet not found" });

    res.status(200).json({
      success: true,
      message: "Pet deleted successfully",
      deletedId: id,
    });
  });
};
