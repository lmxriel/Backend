const express = require("express");
const router = express.Router();
const EmailController = require("../controllers/EmailController");
const auth = require("../middleware/auth");

router.put("/:id/adoptionApproved", auth, EmailController.approveAdoption);
router.put("/:id/adoptionRejected", auth, EmailController.rejectAdoption);

module.exports = router;
