// routes/conversationRoutes.js
const express = require("express");
const router = express.Router();
const {
  getAllConversations,
  getOrCreateMyConversation,
  getMessagesByConversation,
} = require("../controllers/ConversationController");
const {
  sendMessage,
  markConversationRead,
} = require("../controllers/MessageController");
const authMiddleware = require("../middleware/auth"); // your existing JWT auth

// all routes require auth
router.use(authMiddleware);

// admin: get all conversations
router.get("/", getAllConversations);

// user: get or create their conversation (for customer chat widget)
router.get("/me", getOrCreateMyConversation);

// messages in a conversation
router.get("/:conversationId/messages", getMessagesByConversation);

// send a message
router.post("/:conversationId/messages", sendMessage);

// mark read
router.post("/:conversationId/read", markConversationRead);

module.exports = router;
