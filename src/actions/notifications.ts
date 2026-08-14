import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { requireDatabase } from "@/lib/db";

export interface NotificationRow {
  id: string;
  school_id: string;
  recipient_id: string;
  title: string;
  body: string;
  severity: "info" | "success" | "warning" | "critical";
  source_entity: string | null;
  source_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const listNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  return sql<NotificationRow[]>`
    SELECT * FROM hw_notifications
    WHERE school_id = ${context.schoolId} AND recipient_id = ${context.userId}
    ORDER BY created_at DESC LIMIT 200`;
});

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const context = await requireAuth();
    const sql = requireDatabase();
    const rows = await sql<NotificationRow[]>`
      UPDATE hw_notifications SET read_at = COALESCE(read_at, NOW())
      WHERE id = ${data.id} AND school_id = ${context.schoolId} AND recipient_id = ${context.userId}
      RETURNING *`;
    if (!rows[0]) throw new Error("Notification not found or not authorized");
    return rows[0];
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const context = await requireAuth();
  const sql = requireDatabase();
  await sql`
    UPDATE hw_notifications SET read_at = COALESCE(read_at, NOW())
    WHERE school_id = ${context.schoolId} AND recipient_id = ${context.userId} AND read_at IS NULL`;
  return { ok: true as const };
});
