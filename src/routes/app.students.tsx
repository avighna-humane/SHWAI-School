import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { useAppState } from '@/app/providers/app-state';
import { STUDENTS } from '@/data/mock/people';
import { CLASS_SECTIONS } from '@/data/mock/core';
import { PermissionDenied } from '@/components/feedback/states';
import { ROLE_LABEL } from '@/config/roles';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import * as Icons from 'lucide-react';

export const Route = createFileRoute('/app/students')({ component: StudentsPage });

const CLS_MAP = Object.fromEntries(CLASS_SECTIONS.map(c => [c.id, c]));

function initials(name: string) { return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2); }

function hsl(name: string) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h},60%,55%)`; }

function StudentsPage() {
  const { role } = useAppState();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  if (!['teacher', 'principal', 'admin', 'owner'].includes(role)) {
    return <PermissionDenied role={ROLE_LABEL[role]} />;
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return STUDENTS.filter(s => !q || s.name.toLowerCase().includes(q) || s.classId?.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> SHWAI workspace
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Students</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">Browse student profiles and track submissions, grades, and progress.</p>
      </header>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Icons.Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or class…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Badge variant="outline" className="rounded-full">{filtered.length} students</Badge>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {['Student', 'Class', 'Grade', 'Section', 'Attendance'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map(s => {
              const cls = CLS_MAP[s.classId ?? ''];
              return (
                <tr key={s.id}
                  onClick={() => navigate({ to: '/app/students/$studentId', params: { studentId: s.id } })}
                  className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback style={{ backgroundColor: hsl(s.name), color: '#fff' }} className="text-xs font-bold">
                          {initials(s.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{cls?.label ?? s.classId}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cls?.grade ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{cls?.section ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${(s.attendancePct) < 75 ? 'text-orange-500' : 'text-green-600'}`}>
                      {s.attendancePct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <p className="px-4 py-3 text-xs text-muted-foreground">Showing 100 of {filtered.length}. Refine your search to see more.</p>
        )}
      </div>
    </div>
  );
}
