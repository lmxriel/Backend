const express = require("express");
const router = express.Router();
const EmailController = require("../controllers/EmailController");
const auth = require("../middleware/auth");

router.put("/:id/approved", auth, EmailController.approveAppointment);
router.put("/:id/rejected", auth, EmailController.rejectAppointment);

module.exports = router;
