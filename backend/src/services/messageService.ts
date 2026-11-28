import * as messageModel from "../models/messageModel";
import * as userModel from "../models/userModel";

// ============================================================
// CHAT RULES
// ============================================================

const CHAT_ROLES = ["admin", "manager"];

const parseUserId = (value: unknown, label: string): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw { status: 400, message: `Invalid ${label}.` };
  }
  return id;
};

const normalizeDueAt = (value: unknown): string | null => {
  if (value === undefined || value === null || value === "") return null;

  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(text)) {
    throw {
      status: 400,
      message: "Due date must use YYYY-MM-DD HH:mm format.",
    };
  }

  return text.length === 16 ? `${text}:00` : text;
};

const assertChatUser = async (userId: number): Promise<void> => {
  const user = await userModel.findById(userId);
  if (!user || !CHAT_ROLES.includes(user.role)) {
    throw { status: 404, message: "Chat user not found." };
  }
};

// ============================================================
// CONTACTS
// ============================================================

export const getContacts = async (currentUserId: number) => {
  return messageModel.findChatContacts(currentUserId);
};

// ============================================================
// CONVERSATION
// ============================================================

export const getConversation = async (
  currentUserId: number,
  otherUserIdInput: unknown,
): Promise<messageModel.MessageRecord[]> => {
  const otherUserId = parseUserId(otherUserIdInput, "recipient");
  if (otherUserId === currentUserId) {
    throw { status: 400, message: "Choose another admin or manager." };
  }
  await assertChatUser(otherUserId);
  return messageModel.findConversation(currentUserId, otherUserId);
};

// ============================================================
// SEND MESSAGE
// ============================================================

export const sendMessage = async (
  fromUserId: number,
  input: { to_user_id?: unknown; body?: unknown; due_at?: unknown },
): Promise<messageModel.MessageRecord | null> => {
  const toUserId = parseUserId(input.to_user_id, "recipient");
  if (toUserId === fromUserId) {
    throw { status: 400, message: "You cannot message yourself." };
  }

  const body = String(input.body ?? "").trim();
  if (!body) {
    throw { status: 400, message: "Message cannot be empty." };
  }
  if (body.length > 2000) {
    throw { status: 400, message: "Message must be 2000 characters or fewer." };
  }

  const dueAt = normalizeDueAt(input.due_at);
  await assertChatUser(toUserId);

  const messageId = await messageModel.createMessage(
    fromUserId,
    toUserId,
    body,
    dueAt,
  );
  return messageModel.findById(messageId);
};

// ============================================================
// MARK AS READ
// ============================================================

export const markRead = async (
  currentUserId: number,
  messageIdInput: unknown,
): Promise<{ changed: boolean }> => {
  const messageId = parseUserId(messageIdInput, "message ID");
  const changed = (await messageModel.markRead(messageId, currentUserId)) > 0;
  return { changed };
};
