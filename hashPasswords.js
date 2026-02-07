const bcrypt = require("bcryptjs");
const db = require("./config/db"); // Make sure path is correct

const saltRounds = 10;

// Fetch all users
db.query("SELECT user_id, password FROM user", async (err, results) => {
  if (err) {
    console.error("Database query error:", err);
    process.exit(1);
  }

  for (let user of results) {
    // Skip if already hashed
    if (user.password.startsWith("$2b$")) continue;

    const hashedPassword = await bcrypt.hash(user.password, saltRounds);

    db.query(
      "UPDATE user SET password = ? WHERE user_id = ?",
      [hashedPassword, user.user_id],
      (err) => {
        if (err) console.error(`Error updating user ${user.user_id}:`, err);
        else console.log(`Password hashed for user ${user.user_id}`);
      }
    );
  }

  console.log("Password hashing complete!");
  db.end();
});
