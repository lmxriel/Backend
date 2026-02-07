// controllers/conversationController.js
const db = require("../config/db"); // your existing MySQL connection / pool

// Admin: get all conversations with user info + last message
exports.getAllConversations = (req, res) => {
  // optionally check role
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Forbidden" });

  const sql = `
    SELECT
      c.conversation_id,
      c.user_id,
      u.first_name,
      u.last_name,
      c.status,
      c.last_message_preview,
      c.last_message_at,
      c.updated_at
    FROM conversation c
    JOIN user u ON u.user_id = c.user_id
    ORDER BY c.last_message_at DESC, c.updated_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("getAllConversations error:", err);
      return res.status(500).json({ error: "Failed to fetch conversations" });
    }
    res.json(rows);
  });
};

// User: get or create conversation for current user
exports.getOrCreateMyConversation = (req, res) => {
  const userId = req.user.user_id;

  const findSql = "SELECT * FROM conversation WHERE user_id = ? LIMIT 1";
  db.query(findSql, [userId], (err, rows) => {
    if (err) {
      console.error("getOrCreateMyConversation find error:", err);
      return res.status(500).json({ error: "Failed to fetch conversation" });
    }

    if (rows.length > 0) {
      return res.json(rows[0]);
    }

    const insertSql = "INSERT INTO conversation (user_id) VALUES (?)";
    db.query(insertSql, [userId], (err2, result) => {
      if (err2) {
        console.error("getOrCreateMyConversation insert error:", err2);
        return res.status(500).json({ error: "Failed to create conversation" });
      }

      const newConversation = {
        conversation_id: result.insertId,
        user_id: userId,
        status: "open",
      };
      res.status(201).json(newConversation);
    });
  });
};

// Get messages for a conversation
exports.getMessagesByConversation = (req, res) => {
  const { conversationId } = req.params;

  const sql = `
    SELECT
      m.message_id,
      m.conversation_id,
      m.sender_id,
      m.sender_role,
      m.content,
      m.is_read,
      m.created_at
    FROM message m
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
  `;

  db.query(sql, [conversationId], (err, rows) => {
    if (err) {
      console.error("getMessagesByConversation error:", err);
      return res.status(500).json({ error: "Failed to fetch messages" });
    }
    res.json(rows);
  });
};
