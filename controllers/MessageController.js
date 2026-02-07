// controllers/messageController.js
const db = require("../config/db");
const { getIO } = require("../socket");

// Helper to update conversation last message data
const updateConversationMeta = (conversationId, content, cb) => {
  const preview =
    content.length > 250 ? content.slice(0, 247) + "..." : content;

  const sql = `
    UPDATE conversation
    SET last_message_preview = ?, last_message_at = NOW()
    WHERE conversation_id = ?
  `;

  db.query(sql, [preview, conversationId], (err) => {
    if (err) console.error("updateConversationMeta error:", err);
    if (cb) cb(err);
  });
};

exports.sendMessage = (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Content is required" });
  }

  const senderId = req.user.user_id;

  // Map your app roles to ENUM('pet owner','admin')
  let senderRole;
  if (req.user.role === "admin") {
    senderRole = "admin";
  } else {
    senderRole = "pet owner";
  }

  const insertSql = `
    INSERT INTO message (conversation_id, sender_id, sender_role, content)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    insertSql,
    [conversationId, senderId, senderRole, content.trim()],
    (err, result) => {
      if (err) {
        console.error("sendMessage insert error:", err);
        return res.status(500).json({ error: "Failed to send message" });
      }

      const messageId = result.insertId;

      // update conversation last message fields
      updateConversationMeta(conversationId, content.trim(), () => {});

      const selectSql = `
        SELECT
          m.message_id,
          m.conversation_id,
          m.sender_id,
          m.sender_role,
          m.content,
          m.is_read,
          m.created_at
        FROM message m
        WHERE m.message_id = ?
        LIMIT 1
      `;

      db.query(selectSql, [messageId], (err2, rows) => {
        if (err2 || rows.length === 0) {
          console.error("sendMessage select error:", err2);
          return res.status(201).json({ message_id: messageId });
        }

        const saved = rows[0];

        // emit to all sockets in this conversation room (user + admin)
        const io = getIO();
        io.to(`conversation:${conversationId}`).emit("new_message", saved);

        res.status(201).json(saved);
      });
    }
  );
};

// Mark all messages in a conversation as read for current user
exports.markConversationRead = (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.user_id;

  const sql = `
    UPDATE message
    SET is_read = 1
    WHERE conversation_id = ?
      AND sender_id <> ?
  `;

  db.query(sql, [conversationId, userId], (err, result) => {
    if (err) {
      console.error("markConversationRead error:", err);
      return res.status(500).json({ error: "Failed to mark messages as read" });
    }

    // optional: tell the other side that their messages were read
    const io = getIO();
    io.to(`conversation:${conversationId}`).emit("messages_read", {
      conversationId: Number(conversationId),
      reader_id: userId,
    });

    res.json({ success: true, affectedRows: result.affectedRows });
  });
};
