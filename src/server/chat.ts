// SERVER-ONLY. Teacher ↔ student chat, scoped strictly to real teacher/student
// class relationships — a teacher can never open or message a student outside
// their assigned classes, and vice versa.
import { createServerFn } from "@tanstack/react-start";
import type { ChatMessage, Conversation } from "@/types";
import { studentById, teacherById } from "./auth-context";
import { supabaseAdmin } from "./supabase-admin";
import { assertValidFile, signedUrlFor, uploadToBucket } from "./files";
import {
  type ActorRole,
  ForbiddenError,
  NotFoundError,
  assertTeacherOwnsStudent,
  resolveActor,
} from "./auth-context";

interface ConversationRow {
  id: string;
  school_id: string;
  teacher_id: string;
  student_id: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_type: "teacher" | "student";
  sender_id: string;
  body: string;
  read_by_teacher_at: string | null;
  read_by_student_at: string | null;
  created_at: string;
  message_attachments?: { file_path: string; file_name: string; size_bytes: number; mime_type: string }[];
}

function mapMessage(row: MessageRow): ChatMessage {
  const att = row.message_attachments?.[0];
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderType: row.sender_type,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    readByTeacherAt: row.read_by_teacher_at,
    readByStudentAt: row.read_by_student_at,
    attachment: att ? { id: "", filePath: att.file_path, fileName: att.file_name, sizeBytes: att.size_bytes, mimeType: att.mime_type } : undefined,
  };
}

async function assertRelationship(actorRole: ActorRole, teacherId: string, studentId: string) {
  if (actorRole === "teacher") {
    const teacher = teacherById(teacherId);
    if (!teacher) throw new NotFoundError();
  }
  const student = studentById(studentId);
  if (!student) throw new NotFoundError("Student not found.");
}

/** Opens (or creates) the conversation between a teacher and student, validating the relationship first. */
export const getOrCreateConversation = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; otherId: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    let teacherId: string;
    let studentId: string;

    if (actor.role === "teacher") {
      teacherId = actor.id;
      studentId = data.otherId;
      assertTeacherOwnsStudent(actor, studentId);
    } else if (actor.role === "student") {
      studentId = actor.id;
      teacherId = data.otherId;
      // A student may only chat with a teacher who teaches their class.
      const teacher = teacherById(teacherId);
      if (!teacher) throw new NotFoundError("Teacher not found.");
      const teacherActor = resolveActor({ role: "teacher", actorId: teacherId });
      if (!teacherActor.classIds?.includes(actor.classId ?? "")) {
        throw new ForbiddenError("This teacher does not teach your class.");
      }
    } else {
      throw new ForbiddenError("The principal chat surface is not part of this workflow.");
    }

    await assertRelationship(actor.role, teacherId, studentId);

    const { data: existing } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("school_id", actor.schoolId)
      .eq("teacher_id", teacherId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (existing) return { id: existing.id as string };

    const { data: inserted, error } = await supabaseAdmin
      .from("conversations")
      .insert({ school_id: actor.schoolId, teacher_id: teacherId, student_id: studentId })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Could not open conversation.");
    return { id: inserted.id as string };
  });

export const listConversations = createServerFn({ method: "GET" })
  .validator((data: { role: ActorRole; actorId?: string }) => data)
  .handler(async ({ data }): Promise<Conversation[]> => {
    const actor = resolveActor(data);
    if (actor.role === "principal") return [];

    const column = actor.role === "teacher" ? "teacher_id" : "student_id";
    const { data: rows, error } = await supabaseAdmin.from("conversations").select("*").eq(column, actor.id);
    if (error) throw new Error(error.message);
    const conversations = (rows ?? []) as ConversationRow[];
    if (conversations.length === 0) return [];

    const ids = conversations.map((c) => c.id);
    const { data: messages } = await supabaseAdmin
      .from("messages")
      .select("*")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false });

    const lastByConv = new Map<string, MessageRow>();
    const unreadByConv = new Map<string, number>();
    for (const m of (messages ?? []) as MessageRow[]) {
      if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);
      const isUnreadForActor =
        actor.role === "teacher" ? m.sender_type === "student" && !m.read_by_teacher_at : m.sender_type === "teacher" && !m.read_by_student_at;
      if (isUnreadForActor) unreadByConv.set(m.conversation_id, (unreadByConv.get(m.conversation_id) ?? 0) + 1);
    }

    return conversations.map((c) => {
      const otherId = actor.role === "teacher" ? c.student_id : c.teacher_id;
      const otherName = actor.role === "teacher" ? studentById(otherId)?.name ?? "Unknown student" : teacherById(otherId)?.name ?? "Unknown teacher";
      const last = lastByConv.get(c.id);
      return {
        id: c.id,
        schoolId: c.school_id,
        teacherId: c.teacher_id,
        studentId: c.student_id,
        otherId,
        otherName,
        lastMessageBody: last?.body,
        lastMessageAt: last?.created_at,
        unreadCount: unreadByConv.get(c.id) ?? 0,
        createdAt: c.created_at,
      };
    });
  });

async function loadConversationOrThrow(actorRole: ActorRole, actorId: string, conversationId: string) {
  const { data: convo, error } = await supabaseAdmin.from("conversations").select("*").eq("id", conversationId).single();
  if (error || !convo) throw new NotFoundError("Conversation not found.");
  const owns = actorRole === "teacher" ? convo.teacher_id === actorId : actorRole === "student" ? convo.student_id === actorId : false;
  if (!owns) throw new ForbiddenError("You do not have access to this conversation.");
  return convo as ConversationRow;
}

export const listMessages = createServerFn({ method: "GET" })
  .validator((data: { role: ActorRole; actorId?: string; conversationId: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    await loadConversationOrThrow(actor.role, actor.id, data.conversationId);
    const { data: rows, error } = await supabaseAdmin
      .from("messages")
      .select("*, message_attachments(*)")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => mapMessage(r as MessageRow));
  });

export const sendMessage = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const role = data.get("role") as ActorRole;
    const actorId = (data.get("actorId") as string) || undefined;
    const actor = resolveActor({ role, actorId });
    if (actor.role !== "teacher" && actor.role !== "student") throw new ForbiddenError();

    const conversationId = String(data.get("conversationId") ?? "");
    await loadConversationOrThrow(actor.role, actor.id, conversationId);

    const body = String(data.get("body") ?? "").trim();
    const file = data.get("attachment");
    if (!body && !(file instanceof File && file.size > 0)) throw new Error("Enter a message or attach a file.");

    const senderType = actor.role;
    const now = new Date().toISOString();
    const { data: inserted, error } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_type: senderType,
        sender_id: actor.id,
        body,
        read_by_teacher_at: senderType === "teacher" ? now : null,
        read_by_student_at: senderType === "student" ? now : null,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "Could not send message.");

    if (file instanceof File && file.size > 0) {
      assertValidFile(file);
      const meta = await uploadToBucket(`chat/${conversationId}`, file);
      await supabaseAdmin.from("message_attachments").insert({ message_id: inserted.id, ...meta });
    }

    return { id: inserted.id as string };
  });

export const markConversationRead = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; conversationId: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    await loadConversationOrThrow(actor.role, actor.id, data.conversationId);
    const now = new Date().toISOString();
    const column = actor.role === "teacher" ? "read_by_teacher_at" : "read_by_student_at";
    const senderToMark = actor.role === "teacher" ? "student" : "teacher";
    const { error } = await supabaseAdmin
      .from("messages")
      .update({ [column]: now })
      .eq("conversation_id", data.conversationId)
      .eq("sender_type", senderToMark)
      .is(column, null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMessageAttachmentUrl = createServerFn({ method: "POST" })
  .validator((data: { role: ActorRole; actorId?: string; conversationId: string; filePath: string }) => data)
  .handler(async ({ data }) => {
    const actor = resolveActor(data);
    await loadConversationOrThrow(actor.role, actor.id, data.conversationId);
    return { url: await signedUrlFor(data.filePath) };
  });
