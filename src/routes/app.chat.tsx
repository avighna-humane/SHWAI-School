import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useAppState } from "@/app/providers/app-state";
import { getDemoIds, CHAT_CONTACTS } from "@/lib/demo-ids";
import {
  listConversations,
  getMessages,
  sendMessage,
  type ChatMessage,
  type Conversation,
} from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export const Route = createFileRoute("/app/chat")({ component: ChatPage });

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
function hslForName(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h},60%,55%)`;
}
function fmtDateTime(d: string) {
  const dt = new Date(d);
  const now = new Date();
  if (dt.toDateString() === now.toDateString())
    return dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface Contact {
  userId: string;
  userName: string;
  role: string;
}

function ChatPage() {
  const { role, schoolId } = useAppState();
  const { userId, userName } = getDemoIds(role);
  const qc = useQueryClient();
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [body, setBody] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Available contacts for this role
  const contacts: Contact[] = CHAT_CONTACTS[role] ?? [];

  // Conversations (people I've chatted with before)
  const { data: conversations = [] } = useQuery({
    queryKey: ["conversations", schoolId, userId],
    queryFn: () => listConversations({ data: {} }),
    refetchInterval: 5000,
  });

  // Messages for active conversation
  const { data: messages = [] } = useQuery({
    queryKey: ["messages", schoolId, userId, activeContact?.userId],
    queryFn: () => getMessages({ data: { partnerId: activeContact!.userId } }),
    enabled: !!activeContact,
    refetchInterval: 3000,
  });

  const sendMut = useMutation({
    mutationFn: () => sendMessage({ data: { receiverId: activeContact!.userId, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function openContact(c: Contact) {
    setActiveContact(c);
    inputRef.current?.focus();
  }

  // Merge conversations + contacts (contacts not yet chatted with)
  const chattedIds = new Set(conversations.map((c) => c.partner_id));
  const newContacts = contacts.filter((c) => !chattedIds.has(c.userId));

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden rounded-xl border">
      {/* Left – contact list */}
      <div className="flex w-full flex-col border-r md:w-72 lg:w-80">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Messages</h2>
          <p className="text-xs text-muted-foreground">
            Chat with {role === "student" ? "your teachers" : "students"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* Existing conversations */}
          {conversations.map((conv) => (
            <button
              key={conv.partner_id}
              onClick={() =>
                openContact({
                  userId: conv.partner_id,
                  userName: conv.partner_name,
                  role: conv.partner_role,
                })
              }
              className={`w-full flex items-center gap-3 px-4 py-3 border-b text-left transition-colors hover:bg-muted/50 ${activeContact?.userId === conv.partner_id ? "bg-muted/70" : ""}`}
            >
              <Avatar className="size-9 shrink-0">
                <AvatarFallback
                  style={{ backgroundColor: hslForName(conv.partner_name), color: "#fff" }}
                  className="text-xs font-bold"
                >
                  {initials(conv.partner_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p
                    className={`truncate text-sm ${Number(conv.unread_count) > 0 ? "font-semibold" : "font-medium"}`}
                  >
                    {conv.partner_name}
                  </p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {fmtDateTime(conv.last_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="truncate text-xs text-muted-foreground">{conv.last_message}</p>
                  {Number(conv.unread_count) > 0 && (
                    <Badge className="ml-1 shrink-0 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                      {conv.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* New contacts */}
          {newContacts.length > 0 && (
            <>
              <div className="px-4 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {conversations.length > 0 ? "Start a conversation" : "Contacts"}
                </p>
              </div>
              {newContacts.map((c) => (
                <button
                  key={c.userId}
                  onClick={() => openContact(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b text-left transition-colors hover:bg-muted/50 ${activeContact?.userId === c.userId ? "bg-muted/70" : ""}`}
                >
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback
                      style={{ backgroundColor: hslForName(c.userName), color: "#fff" }}
                      className="text-xs font-bold"
                    >
                      {initials(c.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.userName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{c.role}</p>
                  </div>
                </button>
              ))}
            </>
          )}

          {contacts.length === 0 && conversations.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <Icons.MessageCircle className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No contacts available</p>
            </div>
          )}
        </div>
      </div>

      {/* Right – message thread */}
      <div className="hidden flex-1 flex-col md:flex overflow-hidden">
        {activeContact ? (
          <>
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Avatar className="size-8">
                <AvatarFallback
                  style={{ backgroundColor: hslForName(activeContact.userName), color: "#fff" }}
                  className="text-xs font-bold"
                >
                  {initials(activeContact.userName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{activeContact.userName}</p>
                <p className="text-xs text-muted-foreground capitalize">{activeContact.role}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 p-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_id === userId;
                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe && (
                        <Avatar className="mr-2 size-6 shrink-0 self-end">
                          <AvatarFallback
                            style={{ backgroundColor: hslForName(m.sender_name), color: "#fff" }}
                            className="text-[9px] font-bold"
                          >
                            {initials(m.sender_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isMe ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted"}`}
                      >
                        <p className="text-sm">{m.body}</p>
                        <p
                          className={`mt-0.5 text-[10px] ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                        >
                          {fmtDateTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t p-3 flex items-center gap-2">
              <Input
                ref={inputRef}
                className="flex-1"
                placeholder={`Message ${activeContact.userName}…`}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && body.trim()) {
                    e.preventDefault();
                    sendMut.mutate();
                  }
                }}
              />
              <Button
                size="icon"
                disabled={!body.trim() || sendMut.isPending}
                onClick={() => sendMut.mutate()}
              >
                {sendMut.isPending ? (
                  <Icons.Loader2 className="size-4 animate-spin" />
                ) : (
                  <Icons.Send className="size-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Icons.MessageCircle className="size-12 text-muted-foreground/30" />
            <p className="font-medium">Select a conversation</p>
            <p className="text-sm text-muted-foreground">
              Choose someone from the list to start chatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
