// backend/routes/reportRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const report = require("../controllers/ReportController");

router.get("/adoption", auth, report.getAdoptionReport);
router.get("/appointment", auth, report.getAppointmentReport);

module.exports = router;
