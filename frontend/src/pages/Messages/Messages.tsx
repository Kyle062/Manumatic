import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Toast, { ToastType } from "../../components/Toast";
import {
  CheckCheck,
  Clock3,
  MessageSquare,
  RefreshCw,
  Send,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getMessageContacts,
  getMessages,
  markMessageRead,
  sendMessage,
} from "../../services/api";
import { ChatContact, ChatMessage } from "../../types";
import "./Messages.css";

interface ToastState {
  message: string;
  type: ToastType;
}

const formatStamp = (value: string | null) => {
  if (!value) return "";
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export default function Messages() {
  const { user } = useAuth();

  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type });
  };

  const loadContacts = useCallback(async () => {
    try {
      const res = await getMessageContacts();
      const list = res.data as ChatContact[];
      setContacts(list);

      setSelectedId((current) => {
        if (current && list.some((c) => c.user_id === current)) return current;
        const otherRole = list.find((c) => c.role !== user?.role);
        return otherRole?.user_id ?? list[0]?.user_id ?? null;
      });
    } catch (err) {
      console.error("Failed to load chat contacts:", err);
      showToast("Failed to load chat contacts.", "error");
    }
  }, [user?.role]);

  const loadMessages = useCallback(
    async (silent = false) => {
      if (selectedId === null) return;
      if (!silent) setLoading(true);
      try {
        const res = await getMessages(selectedId);
        const list = res.data as ChatMessage[];
        setMessages(list);

        const unread = list.filter(
          (m) => m.to_user_id === user?.user_id && !m.read_at,
        );
        if (unread.length > 0) {
          await Promise.all(
            unread.map((m) => markMessageRead(m.message_id).catch(() => null)),
          );
          setMessages((current) =>
            current.map((m) =>
              m.to_user_id === user?.user_id && !m.read_at
                ? { ...m, read_at: new Date().toISOString() }
                : m,
            ),
          );
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
        if (!silent) showToast("Failed to load messages.", "error");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedId, user?.user_id],
  );

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (selectedId === null) return;
    loadMessages();

    const timer = window.setInterval(() => loadMessages(true), 7000);
    const onFocus = () => loadMessages(true);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [selectedId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const selectedContact = contacts.find((c) => c.user_id === selectedId);

  const handleSend = async () => {
    if (selectedId === null || !draft.trim() || sending) return;

    setSending(true);
    try {
      const normalizedDue = dueAt
        ? `${dueAt.length === 16 ? `${dueAt}:00` : dueAt}`.replace("T", " ")
        : null;

      await sendMessage({
        to_user_id: selectedId,
        body: draft.trim(),
        due_at: normalizedDue,
      });

      setDraft("");
      setDueAt("");
      await loadMessages(true);
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to send message.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <Header title="Messages" />

        <div className="msg-content fade-in">
          <div className="msg-shell">
            <aside className="msg-contacts">
              <div className="msg-contacts__head">
                <MessageSquare size={16} />
                <span>Conversations</span>
              </div>

              {contacts.length === 0 ? (
                <div className="msg-empty">No admin or manager accounts.</div>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.user_id}
                    type="button"
                    className={`msg-contact ${selectedId === contact.user_id ? "is-active" : ""}`}
                    onClick={() => setSelectedId(contact.user_id)}
                  >
                    <span className="msg-contact__avatar">
                      {initials(contact.name || contact.username)}
                    </span>
                    <span className="msg-contact__info">
                      <strong>{contact.name}</strong>
                      <small>
                        @{contact.username} · {contact.role}
                      </small>
                    </span>
                  </button>
                ))
              )}
            </aside>

            <section className="msg-thread">
              <div className="msg-thread__head">
                <div>
                  <h2>
                    {selectedContact
                      ? selectedContact.name
                      : "Select a conversation"}
                  </h2>
                  {selectedContact && (
                    <span className="msg-thread__sub">
                      {selectedContact.role === "admin"
                        ? "Admin / Owner"
                        : "Manager"}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="msg-refresh"
                  onClick={() => loadMessages()}
                  disabled={selectedId === null || loading}
                  title="Refresh messages"
                >
                  <RefreshCw size={15} className={loading ? "is-spinning" : ""} />
                </button>
              </div>

              <div className="msg-thread__body">
                {loading && messages.length === 0 ? (
                  <div className="msg-empty">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="msg-empty msg-empty--large">
                    <MessageSquare size={28} />
                    <p>No messages yet.</p>
                    <span>Send the first task or update.</span>
                  </div>
                ) : (
                  messages.map((message) => {
                    const mine = message.from_user_id === user?.user_id;
                    return (
                      <div
                        key={message.message_id}
                        className={`msg-bubble-row ${mine ? "is-mine" : ""}`}
                      >
                        <div className="msg-bubble">
                          {message.due_at && (
                            <div className="msg-due">
                              <Clock3 size={12} /> Due {formatStamp(message.due_at)}
                            </div>
                          )}
                          <div className="msg-bubble__body">{message.body}</div>
                          <div className="msg-bubble__meta">
                            <span>{formatStamp(message.created_at)}</span>
                            {mine && (
                              <span className={message.read_at ? "is-read" : ""}>
                                <CheckCheck size={12} />
                                {message.read_at ? "Read" : "Sent"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <div className="msg-composer">
                <div className="msg-composer__row">
                  <label className="msg-due-input">
                    <Clock3 size={14} />
                    <input
                      type="datetime-local"
                      value={dueAt}
                      onChange={(e) => setDueAt(e.target.value)}
                      aria-label="When should this be done?"
                    />
                  </label>
                </div>
                <div className="msg-composer__row msg-composer__row--send">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      selectedContact
                        ? `Message ${selectedContact.name}...`
                        : "Select a conversation first"
                    }
                    disabled={selectedId === null}
                    rows={2}
                  />
                  <button
                    type="button"
                    className="msg-send"
                    onClick={handleSend}
                    disabled={!draft.trim() || sending || selectedId === null}
                  >
                    <Send size={15} />
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
