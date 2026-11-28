import pool from "../config/database";

// ============================================================
// MESSAGE RECORD
// ============================================================

export interface MessageRecord {
  message_id: number;
  from_user_id: number;
  to_user_id: number;
  body: string;
  due_at: Date | string | null;
  created_at: Date | string;
  read_at: Date | string | null;
}

// ============================================================
// BOOTSTRAP TABLE
// ============================================================

export const initializeMessageTable = async (): Promise<void> => {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      message_id INT AUTO_INCREMENT PRIMARY KEY,
      from_user_id INT NOT NULL,
      to_user_id INT NOT NULL,
      body TEXT NOT NULL,
      due_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME NULL,
      INDEX idx_messages_participants (from_user_id, to_user_id, created_at),
      INDEX idx_messages_recipient (to_user_id, read_at, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
};

// ============================================================
// CONVERSATION
// ============================================================

export const findConversation = async (
  firstUserId: number,
  secondUserId: number,
): Promise<MessageRecord[]> => {
  const [rows] = await pool.execute(
    `SELECT message_id, from_user_id, to_user_id, body, due_at, created_at, read_at
     FROM messages
     WHERE (from_user_id = ? AND to_user_id = ?)
        OR (from_user_id = ? AND to_user_id = ?)
     ORDER BY created_at ASC, message_id ASC`,
    [firstUserId, secondUserId, secondUserId, firstUserId],
  );
  return rows as MessageRecord[];
};

// ============================================================
// CHAT CONTACTS
// ============================================================

export const findChatContacts = async (
  currentUserId: number,
): Promise<Array<{
  user_id: number;
  username: string;
  role: "admin" | "manager";
  name: string;
}>> => {
  const [rows] = await pool.execute(
    `SELECT user_id, username, role, name
     FROM users
     WHERE role IN ('admin', 'manager')
       AND user_id <> ?
       AND is_active = 1
     ORDER BY role ASC, name ASC`,
    [currentUserId],
  );
  return rows as Array<{
    user_id: number;
    username: string;
    role: "admin" | "manager";
    name: string;
  }>;
};

// ============================================================
// CREATE / READ / MARK MESSAGE
// ============================================================

export const createMessage = async (
  fromUserId: number,
  toUserId: number,
  body: string,
  dueAt: string | null,
): Promise<number> => {
  const [result] = await pool.execute(
    `INSERT INTO messages (from_user_id, to_user_id, body, due_at)
     VALUES (?, ?, ?, ?)`,
    [fromUserId, toUserId, body, dueAt],
  );
  return (result as any).insertId;
};

export const findById = async (
  messageId: number,
): Promise<MessageRecord | null> => {
  const [rows] = await pool.execute(
    `SELECT message_id, from_user_id, to_user_id, body, due_at, created_at, read_at
     FROM messages WHERE message_id = ? LIMIT 1`,
    [messageId],
  );
  const messages = rows as MessageRecord[];
  return messages.length > 0 ? messages[0] : null;
};

export const markRead = async (
  messageId: number,
  userId: number,
): Promise<number> => {
  const [result] = await pool.execute(
    `UPDATE messages
     SET read_at = NOW()
     WHERE message_id = ? AND to_user_id = ? AND read_at IS NULL`,
    [messageId, userId],
  );
  return (result as any).affectedRows;
};
