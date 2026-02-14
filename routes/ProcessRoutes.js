const express = require("express");
const ProcessController = require("../controllers/ProcessController");
const auth = require("../middleware/auth");
const router = express.Router();

router.get("/getAllAppointment", auth, ProcessController.getAllAppointment);
router.put("/updateReview/:id", auth, ProcessController.updateReview);
router.post("/adoption", auth, ProcessController.submitAdoptionRequest);
router.put("/updateProfile", auth, ProcessController.updateUserProfile);
router.get(
  "/appointments/availability",
  ProcessController.getAppointmentAvailability
);
module.exports = router;
