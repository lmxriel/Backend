const express = require("express");
const router = express.Router();
const EmailController = require("../controllers/EmailController"); // actual logic for sending emails when adoption is approved or rejected.
const auth = require("../middleware/auth");

router.put("/:id/adoptionApproved", auth, EmailController.approveAdoption);
router.put("/:id/adoptionRejected", auth, EmailController.rejectAdoption);

module.exports = router;
