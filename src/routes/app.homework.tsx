import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useMemo } from 'react';
import { useAppState } from '@/app/providers/app-state';
import { getDemoIds } from '@/lib/demo-ids';
import {
  listHomework, createHomework, deleteHomework,
  submitHomework, listStudentSubmissions,
  gradeSubmission,
  type HomeworkRow, type SubmissionRow, type SubmissionWithHomework,
} from '@/actions/homework';
import { CLASS_SECTIONS } from '@/data/mock/core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';

export const Route = createFileRoute('/app/homework')({ component: HomeworkPage });

const SUBJECTS = ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'Marathi'];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(dueDate: string) { return new Date(dueDate) < new Date(); }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    late: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    graded: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    pending: 'bg-muted text-muted-foreground',
    published: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status] ?? map.pending}`}>{status}</span>;
}

function PageHeader({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> SHWAI workspace
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {children && <div className="flex shrink-0 items-center gap-2 pt-1">{children}</div>}
    </header>
  );
}

// ── Teacher View ─────────────────────────────────────────────────────────────
function TeacherView({ schoolId, role, userId, userName }: { schoolId: string; role: string; userId: string; userName: string }) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [gradeOpen, setGradeOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubmissionWithHomework | null>(null);
  const [gradeVal, setGradeVal] = useState('');
  const [feedbackVal, setFeedbackVal] = useState('');
  const [form, setForm] = useState({
    title: '', subject: SUBJECTS[0]!, classId: '', classLabel: '', section: '',
    description: '', dueDate: '', totalMarks: '10', referenceMaterial: '',
  });

  const { data: homework = [], isLoading } = useQuery({
    queryKey: ['homework', schoolId, role, userId],
    queryFn: () => listHomework({ data: { schoolId, role, userId } }),
  });

  const createMut = useMutation({
    mutationFn: (d: typeof form) => createHomework({ data: {
      schoolId, role, teacherId: userId, teacherName: userName,
      title: d.title, subject: d.subject, classId: d.classId, classLabel: d.classLabel,
      section: d.section, description: d.description, dueDate: d.dueDate,
      totalMarks: Number(d.totalMarks), referenceMaterial: d.referenceMaterial,
    }}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['homework'] }); toast.success('Assignment created!'); setCreateOpen(false); setForm(f => ({ ...f, title: '', description: '' })); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteHomework({ data: { id, teacherId: userId, role } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['homework'] }); toast.success('Deleted.'); },
  });

  const gradeMut = useMutation({
    mutationFn: () => gradeSubmission({ data: { submissionId: selectedSub!.id, grade: gradeVal ? Number(gradeVal) : null, feedback: feedbackVal, role } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['all-submissions'] }); toast.success('Graded!'); setGradeOpen(false); },
  });

  function handleClassChange(classId: string) {
    const cls = CLASS_SECTIONS.find(c => c.id === classId);
    setForm(f => ({ ...f, classId, classLabel: cls?.label ?? '', section: cls?.section ?? '' }));
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Homework" description="Create and manage assignments for your classes.">
        <Button onClick={() => setCreateOpen(true)}><Icons.Plus className="mr-2 size-4" />New Assignment</Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground"><Icons.Loader2 className="mr-2 size-5 animate-spin" />Loading…</div>
      ) : homework.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <Icons.NotebookPen className="size-10 text-muted-foreground/40" />
          <p className="font-semibold">No assignments yet</p>
          <p className="text-sm text-muted-foreground">Create your first homework assignment to get started.</p>
          <Button variant="outline" onClick={() => setCreateOpen(true)}><Icons.Plus className="mr-2 size-4" />New Assignment</Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>{['Title', 'Subject', 'Class', 'Due Date', 'Marks', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {homework.map(hw => (
                <tr key={hw.id} className="border-b transition-colors last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{hw.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{hw.subject}</td>
                  <td className="px-4 py-3 text-muted-foreground">{hw.class_label}</td>
                  <td className={`px-4 py-3 ${isOverdue(hw.due_date) ? 'text-orange-600' : 'text-muted-foreground'}`}>{fmtDate(hw.due_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{hw.total_marks}</td>
                  <td className="px-4 py-3"><StatusBadge status={hw.status} /></td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMut.mutate(hw.id)}>
                      <Icons.Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>New Assignment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Chapter 5 – Algebra Practice" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Subject *</Label>
                <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBJECTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Class *</Label>
                <Select value={form.classId} onValueChange={handleClassChange}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent className="max-h-56">
                    {CLASS_SECTIONS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Due Date *</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Total Marks</Label>
                <Input type="number" min="0" value={form.totalMarks} onChange={e => setForm(f => ({ ...f, totalMarks: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description / Instructions</Label>
              <Textarea rows={3} placeholder="Instructions for students…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reference material (URL or notes)</Label>
              <Input placeholder="Optional" value={form.referenceMaterial} onChange={e => setForm(f => ({ ...f, referenceMaterial: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!form.title || !form.classId || !form.dueDate || createMut.isPending}
              onClick={() => createMut.mutate(form)}>
              {createMut.isPending ? <Icons.Loader2 className="mr-2 size-4 animate-spin" /> : null}Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={gradeOpen} onOpenChange={setGradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Grade Submission — {selectedSub?.student_name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{selectedSub?.homework_title}</p>
            {selectedSub?.comment && <div className="rounded-lg bg-muted p-3 text-sm"><span className="font-medium">Student note: </span>{selectedSub.comment}</div>}
            {selectedSub?.file_name && (
              <div className="flex items-center gap-2 rounded-lg border p-3">
                <Icons.Paperclip className="size-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{selectedSub.file_name}</span>
                <Button size="sm" variant="outline" onClick={() => {
                  const a = document.createElement('a');
                  a.href = `data:${selectedSub.file_type};base64,${selectedSub.file_data}`;
                  a.download = selectedSub.file_name;
                  a.click();
                }}>Download</Button>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Grade (out of {homework.find(h => h.id === selectedSub?.homework_id)?.total_marks ?? '?'})</Label>
              <Input type="number" min="0" value={gradeVal} onChange={e => setGradeVal(e.target.value)} placeholder="Enter marks" />
            </div>
            <div className="space-y-1.5">
              <Label>Feedback</Label>
              <Textarea rows={3} value={feedbackVal} onChange={e => setFeedbackVal(e.target.value)} placeholder="Comments for the student…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeOpen(false)}>Cancel</Button>
            <Button onClick={() => gradeMut.mutate()} disabled={gradeMut.isPending}>
              {gradeMut.isPending ? <Icons.Loader2 className="mr-2 size-4 animate-spin" /> : null}Save Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Student View ─────────────────────────────────────────────────────────────
function StudentView({ schoolId, role, userId, userName }: { schoolId: string; role: string; userId: string; userName: string }) {
  const qc = useQueryClient();
  const classId = getDemoIds(role).classId ?? 'cls-9A';
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedHw, setSelectedHw] = useState<HomeworkRow | null>(null);
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: homework = [], isLoading } = useQuery({
    queryKey: ['homework', schoolId, role, userId, classId],
    queryFn: () => listHomework({ data: { schoolId, role, userId, classId } }),
  });

  const { data: mySubmissions = [] } = useQuery({
    queryKey: ['my-submissions', userId, schoolId],
    queryFn: () => listStudentSubmissions({ data: { studentId: userId, schoolId } }),
  });

  const submissionMap = useMemo(
    () => Object.fromEntries(mySubmissions.map(s => [s.homework_id, s])),
    [mySubmissions],
  );

  async function readFileAsBase64(f: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(',')[1] ?? '');
      r.onerror = rej;
      r.readAsDataURL(f);
    });
  }

  const submitMut = useMutation({
    mutationFn: async () => {
      let fileData = '', fileName = '', fileSize = 0, fileType = '';
      if (file) {
        fileData = await readFileAsBase64(file);
        fileName = file.name; fileSize = file.size; fileType = file.type;
      }
      return submitHomework({ data: {
        homeworkId: selectedHw!.id, studentId: userId, studentName: userName,
        schoolId, comment, fileName, fileSize, fileType, fileData,
        dueDate: selectedHw!.due_date,
      }});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-submissions'] });
      toast.success('Submitted!'); setSubmitOpen(false); setComment(''); setFile(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openSubmit(hw: HomeworkRow) {
    setSelectedHw(hw);
    const existing = submissionMap[hw.id];
    setComment(existing?.comment ?? '');
    setSubmitOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Homework" description="Your assigned work — submit before the due date." />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground"><Icons.Loader2 className="mr-2 size-5 animate-spin" />Loading…</div>
      ) : homework.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center">
          <Icons.CheckCircle2 className="size-10 text-green-500/60" />
          <p className="font-semibold">All caught up!</p>
          <p className="text-sm text-muted-foreground">No homework assigned right now.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {homework.map(hw => {
            const sub = submissionMap[hw.id];
            const overdue = isOverdue(hw.due_date) && !sub;
            return (
              <div key={hw.id} onClick={() => openSubmit(hw)}
                className="group cursor-pointer rounded-xl border p-5 transition-all hover:border-primary/50 hover:shadow-md">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">{hw.subject}</span>
                  <StatusBadge status={sub?.status ?? (overdue ? 'late' : 'pending')} />
                </div>
                <h3 className="mb-1 font-semibold leading-tight">{hw.title}</h3>
                {hw.description && <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{hw.description}</p>}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icons.User className="size-3" /><span>{hw.teacher_name}</span>
                </div>
                <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${overdue ? 'text-orange-500' : 'text-muted-foreground'}`}>
                  <Icons.Calendar className="size-3" /><span>Due {fmtDate(hw.due_date)}</span>
                </div>
                {hw.total_marks > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icons.Star className="size-3" /><span>{sub?.grade != null ? `${sub.grade}/${hw.total_marks}` : `${hw.total_marks} marks`}</span>
                  </div>
                )}
                {sub?.feedback && <p className="mt-2 rounded-md bg-green-50 p-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">💬 {sub.feedback}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedHw?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-1">
            <p className="text-sm text-muted-foreground">{selectedHw?.subject} · {selectedHw?.class_label}</p>
            {selectedHw && <p className={`text-xs ${isOverdue(selectedHw.due_date) ? 'text-orange-500' : 'text-muted-foreground'}`}>Due {fmtDate(selectedHw.due_date)}</p>}
            {selectedHw?.description && <p className="mt-2 text-sm">{selectedHw.description}</p>}
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Your Note (optional)</Label>
              <Textarea rows={3} placeholder="Add a note for your teacher…" value={comment} onChange={e => setComment(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Attach File (optional, max 5 MB)</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} type="button">
                  <Icons.Paperclip className="mr-2 size-4" />{file ? file.name : 'Choose file'}
                </Button>
                {file && <Button variant="ghost" size="icon" className="size-7" onClick={() => setFile(null)}><Icons.X className="size-3" /></Button>}
              </div>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.png,.txt" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>Cancel</Button>
            <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
              {submitMut.isPending ? <Icons.Loader2 className="mr-2 size-4 animate-spin" /> : null}Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────
function HomeworkPage() {
  const { role, schoolId } = useAppState();
  const { userId, userName } = getDemoIds(role);
  const props = { schoolId, role, userId, userName };
  if (role === 'student') return <StudentView {...props} />;
  return <TeacherView {...props} />;
}
