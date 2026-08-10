import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { useAppState } from '@/app/providers/app-state';
import { getDemoIds } from '@/lib/demo-ids';
import {
  listNotices, createNotice, editNotice, markNoticeRead, deleteNotice,
  getAudienceOptions, type NoticeWithRead,
} from '@/actions/notices';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

export const Route = createFileRoute('/app/notices')({ component: NoticesPage });

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Only school leadership can publish from this shared school-wide Notices area.
// Teachers can read their relevant notices, including principal-to-teacher notices.
const CAN_CREATE = ['principal', 'admin', 'owner'];

type FormState = {
  title: string;
  content: string;
  audience: string[];
  attachmentName: string;
  attachmentData: string;
};

const EMPTY_FORM: FormState = { title: '', content: '', audience: [], attachmentName: '', attachmentData: '' };

function NoticesPage() {
  const { role, schoolId } = useAppState();
  const { userId, userName, classId } = getDemoIds(role);
  const qc = useQueryClient();

  const [createOpen, setCreateOpen]   = useState(false);
  const [editOpen, setEditOpen]       = useState(false);
  const [selected, setSelected]       = useState<NoticeWithRead | null>(null);
  const [form, setForm]               = useState<FormState>(EMPTY_FORM);
  const fileRef                       = useRef<HTMLInputElement>(null);
  const editFileRef                   = useRef<HTMLInputElement>(null);

  const audienceOpts = getAudienceOptions(role);
  const canCreate    = CAN_CREATE.includes(role);

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices', schoolId, role, userId, classId],
    queryFn: () => listNotices({ data: { schoolId, role, userId, classId } }),
    refetchInterval: 15_000,
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: () => createNotice({ data: {
      schoolId, role, authorId: userId, authorName: userName, authorRole: role,
      title: form.title, content: form.content, audience: form.audience,
      attachmentName: form.attachmentName, attachmentData: form.attachmentData,
    }}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice posted!');
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: () => editNotice({ data: {
      id: selected!.id, authorId: userId, role,
      title: form.title, content: form.content, audience: form.audience,
      attachmentName: form.attachmentName, attachmentData: form.attachmentData,
    }}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice updated!');
      setEditOpen(false);
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteNotice({ data: { id, authorId: userId, role } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notices'] });
      toast.success('Notice deleted.');
      setSelected(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  function openNotice(n: NoticeWithRead) {
    setSelected(n);
    if (!n.is_read) {
      markNoticeRead({ data: { noticeId: n.id, readerId: userId } })
        .then(() => qc.invalidateQueries({ queryKey: ['notices'] }));
    }
  }

  function toggleAudience(val: string) {
    setForm(f => ({
      ...f,
      audience: f.audience.includes(val)
        ? f.audience.filter(a => a !== val)
        : [...f.audience, val],
    }));
  }

  function pickFile(file: File, setter: (name: string, data: string) => void) {
    const reader = new FileReader();
    reader.onload = () => setter(file.name, reader.result as string);
    reader.readAsDataURL(file);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  }

  function openEdit() {
    if (!selected) return;
    setForm({
      title: selected.title,
      content: selected.content,
      audience: selected.audience,
      attachmentName: selected.attachment_name ?? '',
      attachmentData: selected.attachment_data ?? '',
    });
    setEditOpen(true);
  }

  const canEdit = selected && ['principal', 'admin', 'owner'].includes(role);
  const canDelete = selected && ['principal', 'admin', 'owner'].includes(role);

  const unreadCount = notices.filter(n => !n.is_read).length;

  // ── Audience option groups ────────────────────────────────────────────────
  const schoolWideOpts = audienceOpts.filter(o =>
    ['entire-school', 'all-students', 'all-teachers', 'all-parents'].includes(o.value)
  );
  const specificTeacherOpts = audienceOpts.filter(o => o.value.startsWith('teacher-'));
  const classOpts           = audienceOpts.filter(o => o.value.startsWith('class-'));

  // ── Shared form body ─────────────────────────────────────────────────────
  function NoticeFormBody({ fileInputRef }: { fileInputRef: React.RefObject<HTMLInputElement | null> }) {
    return (
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Title <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Notice title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Content <span className="text-destructive">*</span></Label>
          <Textarea
            rows={5}
            placeholder="Write your notice here…"
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          />
        </div>

        {audienceOpts.length > 0 && (
          <div className="space-y-2">
            <Label>Audience <span className="text-destructive">*</span></Label>

            {/* School-wide options */}
            {schoolWideOpts.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {schoolWideOpts.map(opt => (
                  <button key={opt.value} type="button" onClick={() => toggleAudience(opt.value)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors
                      ${form.audience.includes(opt.value)
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'hover:bg-muted/50'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Specific teachers (principal/admin only) */}
            {specificTeacherOpts.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground pt-1">Specific teacher</p>
                <ScrollArea className="h-28 rounded-lg border p-2">
                  <div className="grid grid-cols-2 gap-1.5">
                    {specificTeacherOpts.map(opt => (
                      <button key={opt.value} type="button" onClick={() => toggleAudience(opt.value)}
                        className={`rounded-md border px-2 py-1.5 text-left text-xs transition-colors
                          ${form.audience.includes(opt.value)
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted/50'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* Class sections */}
            {classOpts.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground pt-1">Specific class / section</p>
                <ScrollArea className="h-36 rounded-lg border p-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {classOpts.map(opt => (
                      <button key={opt.value} type="button" onClick={() => toggleAudience(opt.value)}
                        className={`rounded-md border px-2 py-1.5 text-left text-xs transition-colors
                          ${form.audience.includes(opt.value)
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted/50'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {form.audience.length > 0 && (
              <p className="text-xs text-primary">
                {form.audience.length} audience{form.audience.length > 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        )}

        {/* Attachment */}
        <div className="space-y-1.5">
          <Label>Attachment (optional)</Label>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm"
              onClick={() => fileInputRef.current?.click()}>
              <Icons.Paperclip className="mr-1.5 size-3.5" />
              {form.attachmentName ? 'Change file' : 'Attach file'}
            </Button>
            {form.attachmentName && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Icons.FileText className="size-3.5 shrink-0" />
                <span className="max-w-[200px] truncate">{form.attachmentName}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, attachmentName: '', attachmentData: '' }))}
                  className="ml-1 text-muted-foreground hover:text-destructive">
                  <Icons.X className="size-3" />
                </button>
              </span>
            )}
          </div>
          <input ref={fileInputRef} type="file" className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) pickFile(f, (name, data) => setForm(frm => ({ ...frm, attachmentName: name, attachmentData: data })));
            }}
          />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-9rem)] gap-0 overflow-hidden rounded-xl border">

      {/* ── Left panel: notice list ── */}
      <div className="flex w-full flex-col border-r md:w-80 lg:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Notices</h2>
            {unreadCount > 0 && (
              <Badge className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!canCreate && (
              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Icons.Eye className="size-3" />Read only
              </span>
            )}
            {canCreate && (
              <Button size="sm" onClick={openCreate}>
                <Icons.Plus className="mr-1.5 size-3.5" />Create Notice
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Icons.Loader2 className="mr-2 size-4 animate-spin" />Loading…
            </div>
          ) : notices.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 p-6 text-center">
              <Icons.Megaphone className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {canCreate ? 'No notices yet. Create your first one.' : 'No notices for you yet.'}
              </p>
            </div>
          ) : (
            notices.map(n => (
              <button key={n.id} onClick={() => openNotice(n)}
                className={`w-full border-b px-4 py-3 text-left transition-colors hover:bg-muted/50
                  ${selected?.id === n.id ? 'bg-muted/70' : ''}`}>
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                  <div className={`min-w-0 flex-1 ${n.is_read ? 'pl-3.5' : ''}`}>
                    <p className={`truncate text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>
                      {n.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {n.author_name} · {fmtDate(n.created_at)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {n.audience.slice(0, 3).map(a => (
                        <span key={a}
                          className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground capitalize">
                          {a.replace(/-/g, ' ')}
                        </span>
                      ))}
                      {n.audience.length > 3 && (
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{n.audience.length - 3} more
                        </span>
                      )}
                    </div>
                    {n.attachment_name && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Icons.Paperclip className="size-3 shrink-0" />
                        <span className="truncate">{n.attachment_name}</span>
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* ── Right panel: notice detail ── */}
      <div className="hidden flex-1 flex-col md:flex">
        {selected ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold leading-tight">{selected.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  From <span className="font-medium">{selected.author_name}</span>
                  {' '}({selected.author_role}) · {fmtDate(selected.created_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selected.audience.map(a => (
                    <Badge key={a} variant="secondary" className="text-xs capitalize">
                      {a.replace(/-/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Action buttons for authors / admins */}
              <div className="flex shrink-0 items-center gap-1">
                {canEdit && (
                  <Button variant="ghost" size="icon" title="Edit notice" onClick={openEdit}>
                    <Icons.Pencil className="size-4" />
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost" size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete notice"
                    onClick={() => deleteMut.mutate(selected.id)}
                    disabled={deleteMut.isPending}
                  >
                    {deleteMut.isPending
                      ? <Icons.Loader2 className="size-4 animate-spin" />
                      : <Icons.Trash2 className="size-4" />}
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 px-6 py-5">
              <p className="text-sm leading-7 whitespace-pre-wrap">{selected.content}</p>

              {/* Attachment download */}
              {selected.attachment_name && selected.attachment_data && (
                <div className="mt-6 rounded-lg border p-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Attachment
                  </p>
                  <a
                    href={selected.attachment_data}
                    download={selected.attachment_name}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Icons.Download className="size-4 shrink-0" />
                    {selected.attachment_name}
                  </a>
                </div>
              )}
              {selected.attachment_name && !selected.attachment_data && (
                <div className="mt-6 flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
                  <Icons.Paperclip className="size-4 shrink-0" />
                  {selected.attachment_name}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Icons.Megaphone className="size-10 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium">Select a notice to read</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {canCreate
                  ? 'Or create a new notice using the button on the left.'
                  : 'Notices addressed to you will appear on the left.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Create Notice Dialog ── */}
      <Dialog open={createOpen} onOpenChange={v => { setCreateOpen(v); if (!v) setForm(EMPTY_FORM); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icons.Megaphone className="size-5" />
              New Notice
            </DialogTitle>
          </DialogHeader>
          <NoticeFormBody fileInputRef={fileRef} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!form.title || !form.content || form.audience.length === 0 || createMut.isPending}
            >
              {createMut.isPending && <Icons.Loader2 className="mr-2 size-4 animate-spin" />}
              Post Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Notice Dialog ── */}
      <Dialog open={editOpen} onOpenChange={v => { setEditOpen(v); if (!v) setForm(EMPTY_FORM); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icons.Pencil className="size-5" />
              Edit Notice
            </DialogTitle>
          </DialogHeader>
          <NoticeFormBody fileInputRef={editFileRef} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editMut.mutate()}
              disabled={!form.title || !form.content || form.audience.length === 0 || editMut.isPending}
            >
              {editMut.isPending && <Icons.Loader2 className="mr-2 size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
