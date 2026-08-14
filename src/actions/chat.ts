import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { consumeSecurityRateLimit } from "@/lib/security";

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
  .validator(z.object({}))
  .handler(async () => {
    const context = await requireAuth();
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
  .validator(z.object({ partnerId: z.string().trim().min(1).max(160) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
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
    z.object({
      receiverId: z.string().trim().min(1).max(160),
      body: z.string().trim().min(1).max(5000),
    }),
  )
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const { sql } = await import("@/lib/db");
    await consumeSecurityRateLimit(sql, {
      scope: "chat_send_user",
      subject: context.userId,
      limit: 60,
      windowSeconds: 60,
    });
    const recipients = await sql<{ id: string; name: string }[]>`
      SELECT u.id, u.name
      FROM hw_users u
      JOIN hw_memberships m ON m.user_id = u.id AND m.school_id = ${context.schoolId} AND m.active = TRUE
      JOIN hw_schools s ON s.id = m.school_id AND s.active = TRUE
      WHERE u.id = ${data.receiverId} AND u.active = TRUE
      LIMIT 1`;
    const recipient = recipients[0];
    if (!recipient || recipient.id === context.userId)
      throw new Error("Recipient is not available in this school");
    const rows = await sql<ChatMessage[]>`
      INSERT INTO hw_chat_messages
        (school_id, sender_id, sender_name, sender_role, receiver_id, receiver_name, body)
      VALUES
        (${context.schoolId}, ${context.userId}, ${context.name}, ${context.role},
         ${data.receiverId}, ${recipient.name}, ${data.body})
      RETURNING *`;
    return rows[0]!;
  });
