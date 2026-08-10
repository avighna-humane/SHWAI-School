import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAppState } from '@/app/providers/app-state';
import { getDemoIds } from '@/lib/demo-ids';
import { listNotices, createNotice, markNoticeRead, deleteNotice, AUDIENCE_OPTIONS, type NoticeWithRead } from '@/actions/notices';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

export const Route = createFileRoute('/app/notices')({ component: NoticesPage });

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const CAN_CREATE = ['teacher', 'principal', 'admin', 'owner'];

function NoticesPage() {
  const { role, schoolId } = useAppState();
  const { userId, userName, classId } = getDemoIds(role);
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<NoticeWithRead | null>(null);
  const [form, setForm] = useState({ title: '', content: '', audience: [] as string[] });

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices', schoolId, role, userId, classId],
    queryFn: () => listNotices({ data: { schoolId, role, userId, classId } }),
  });

  const createMut = useMutation({
    mutationFn: () => createNotice({ data: {
      schoolId, role, authorId: userId, authorName: userName, authorRole: role,
      title: form.title, content: form.content, audience: form.audience,
      targetClasses: [], attachmentName: '',
    }}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notices'] }); toast.success('Notice posted!'); setCreateOpen(false); setForm({ title: '', content: '', audience: [] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteNotice({ data: { id, authorId: userId, role } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notices'] }); toast.success('Deleted.'); setSelected(null); },
  });

  function openNotice(n: NoticeWithRead) {
    setSelected(n);
    if (!n.is_read) {
      markNoticeRead({ data: { noticeId: n.id, readerId: userId } }).then(() =>
        qc.invalidateQueries({ queryKey: ['notices'] })
      );
    }
  }

  function toggleAudience(val: string) {
    setForm(f => ({ ...f, audience: f.audience.includes(val) ? f.audience.filter(a => a !== val) : [...f.audience, val] }));
  }

  const unreadCount = notices.filter(n => !n.is_read).length;

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-0 overflow-hidden rounded-xl border">
      {/* Left panel – notice list */}
      <div className="flex w-full flex-col border-r md:w-80 lg:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Notices</h2>
            {unreadCount > 0 && <Badge className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{unreadCount}</Badge>}
          </div>
          {CAN_CREATE.includes(role) && (
            <Button size="sm" onClick={() => setCreateOpen(true)}><Icons.Plus className="mr-1.5 size-3.5" />New</Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Icons.Loader2 className="mr-2 size-4 animate-spin" />Loading…
            </div>
          ) : notices.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <Icons.Megaphone className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No notices yet</p>
            </div>
          ) : (
            notices.map(n => (
              <button key={n.id} onClick={() => openNotice(n)}
                className={`w-full border-b px-4 py-3 text-left transition-colors hover:bg-muted/50 ${selected?.id === n.id ? 'bg-muted/70' : ''}`}>
                <div className="flex items-start gap-2">
                  {!n.is_read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                  <div className={`min-w-0 flex-1 ${n.is_read ? 'pl-3.5' : ''}`}>
                    <p className={`truncate text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{n.author_name} · {fmtDate(n.created_at)}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {n.audience.slice(0, 2).map(a => (
                        <span key={a} className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground capitalize">{a.replace(/-/g, ' ')}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel – notice detail */}
      <div className="hidden flex-1 flex-col md:flex">
        {selected ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-start justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">{selected.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  From <span className="font-medium">{selected.author_name}</span> ({selected.author_role}) · {fmtDate(selected.created_at)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {selected.audience.map(a => (
                    <Badge key={a} variant="secondary" className="text-xs capitalize">{a.replace(/-/g, ' ')}</Badge>
                  ))}
                </div>
              </div>
              {(selected.author_id === userId || ['principal', 'admin'].includes(role)) && (
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteMut.mutate(selected.id)}>
                  <Icons.Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-sm leading-7 whitespace-pre-wrap">{selected.content}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Icons.Megaphone className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Select a notice to read</p>
          </div>
        )}
      </div>

      {/* Create Notice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>New Notice</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="Notice title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Content *</Label>
              <Textarea rows={5} placeholder="Write your notice here…" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Audience (select all that apply) *</Label>
              <div className="grid grid-cols-2 gap-2">
                {AUDIENCE_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => toggleAudience(opt.value)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${form.audience.includes(opt.value) ? 'border-primary bg-primary/10 text-primary font-medium' : 'hover:bg-muted/50'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.title || !form.content || form.audience.length === 0 || createMut.isPending}>
              {createMut.isPending ? <Icons.Loader2 className="mr-2 size-4 animate-spin" /> : null}Post Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
