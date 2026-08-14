import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";

export interface ChatMessage {
  id: string;
  school_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  receiver_id: string;
  receiver_name: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  partner_id: string;
  partner_name: string;
  partner_role: string;
  last_message: string;
  last_at: string;
  unread_count: number;
}

export const listConversations = createServerFn({ method: "POST" })
  .validator((d: { schoolId: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (data.schoolId !== context.schoolId || data.userId !== context.userId)
      throw new Error("Authenticated identity mismatch");
    const { sql } = await import("@/lib/db");
    return sql<Conversation[]>`
      WITH partners AS (
        SELECT DISTINCT
          CASE WHEN sender_id = ${context.userId} THEN receiver_id ELSE sender_id END AS partner_id,
          CASE WHEN sender_id = ${context.userId} THEN receiver_name ELSE sender_name END AS partner_name,
          CASE WHEN sender_id = ${context.userId} THEN 'peer' ELSE sender_role END AS partner_role,
          MAX(created_at) AS last_at
        FROM hw_chat_messages
        WHERE school_id = ${context.schoolId}
          AND (sender_id = ${context.userId} OR receiver_id = ${context.userId})
        GROUP BY partner_id, partner_name, partner_role
      )
      SELECT p.*,
        (SELECT body FROM hw_chat_messages m
         WHERE school_id = ${context.schoolId}
           AND ((sender_id = ${context.userId} AND receiver_id = p.partner_id)
             OR (receiver_id = ${context.userId} AND sender_id = p.partner_id))
         ORDER BY created_at DESC LIMIT 1) AS last_message,
        (SELECT COUNT(*) FROM hw_chat_messages m
         WHERE school_id = ${context.schoolId}
           AND receiver_id = ${context.userId}
           AND sender_id = p.partner_id
           AND is_read = FALSE)::int AS unread_count
      FROM partners p
      ORDER BY p.last_at DESC`;
  });

export const getMessages = createServerFn({ method: "POST" })
  .validator((d: { schoolId: string; userId: string; partnerId: string }) => d)
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (data.schoolId !== context.schoolId || data.userId !== context.userId)
      throw new Error("Authenticated identity mismatch");
    const { sql } = await import("@/lib/db");
    await sql`
      UPDATE hw_chat_messages SET is_read = TRUE
      WHERE school_id = ${context.schoolId}
        AND receiver_id = ${context.userId}
        AND sender_id = ${data.partnerId}`;
    return sql<ChatMessage[]>`
      SELECT * FROM hw_chat_messages
      WHERE school_id = ${context.schoolId}
        AND ((sender_id = ${context.userId} AND receiver_id = ${data.partnerId})
          OR (receiver_id = ${context.userId} AND sender_id = ${data.partnerId}))
      ORDER BY created_at ASC`;
  });

export const sendMessage = createServerFn({ method: "POST" })
  .validator(
    (d: {
      schoolId: string;
      senderId: string;
      senderName: string;
      senderRole: string;
      receiverId: string;
      receiverName: string;
      body: string;
    }) => ({ ...d, body: z.string().trim().min(1).max(5000).parse(d.body) }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    if (data.schoolId !== context.schoolId || data.senderId !== context.userId)
      throw new Error("Authenticated identity mismatch");
    const { sql } = await import("@/lib/db");
    const rows = await sql<ChatMessage[]>`
      INSERT INTO hw_chat_messages
        (school_id, sender_id, sender_name, sender_role, receiver_id, receiver_name, body)
      VALUES
        (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role},
         ${data.receiverId}, ${data.receiverName}, ${data.body})
      RETURNING *`;
    return rows[0]!;
  });
