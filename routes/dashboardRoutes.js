// routes/dashboardRoutes.js
const express = require("express");
const DashboardController = require("../controllers/DashboardController");
const auth = require("../middleware/auth");
const router = express.Router();

router.get("/user/count", auth, DashboardController.getUserCount);
router.get(
  "/user/appointment/count",
  auth,
  DashboardController.getAppointmentCount
);
router.get("/user/adoption/count", auth, DashboardController.getAdoptionCount);
router.get(
  "/user/adoption/detail",
  auth,
  DashboardController.getAdoptionDetails
);

module.exports = router;
