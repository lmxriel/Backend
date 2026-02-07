const express = require("express");
const UserController = require("../controllers/UserController");
const EmailController = require("../controllers/EmailController");
const auth = require("../middleware/auth");
const router = express.Router();

// Register new user
router.post("/register", UserController.registerUser);

// Login existing user
router.post("/login", UserController.login);

// Get logged-in user info
router.get("/me", auth, UserController.me);

// Books a user
router.post("/booking", auth, UserController.createBooking);

// Refresh Token
router.post("/refresh-token", UserController.refreshToken);

router.post("/logout", UserController.logout);
//Send Otp to email
router.post("/otp/send-registration-otp", EmailController.sendRegistrationOtp);
//Verify the entered Otp
router.post(
  "/otp/verify-registration-otp",
  UserController.verifyRegistrationOtp
);

router.get("/notification", auth, UserController.getNotifications);

router.post("/forgot-password", UserController.forgotPassword);
router.post(
  "/verify-forgot-otp-reset",
  UserController.verifyForgotOtpAndResetPassword
);

module.exports = router;
