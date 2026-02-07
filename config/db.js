require("dotenv").config();
const mysql = require("mysql2");

let db;

function handleDisconnect() {
  db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
  });

  db.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log("✅ Connected to MySQL Database");
    }
  });

  db.on("error", (err) => {
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.error("Database disconnected. Reconnecting...");
      handleDisconnect();
    } else {
      throw err;
    }
  });
}

handleDisconnect();
module.exports = db;
