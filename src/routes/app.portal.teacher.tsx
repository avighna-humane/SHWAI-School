import { createFileRoute, Link } from '@tanstack/react-router';
import * as Icons from 'lucide-react';
import { useAppState } from '@/app/providers/app-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/app/portal/teacher')({ component: TeacherPortal });

const PORTAL_CARDS = [
  {
    icon: 'Megaphone',
    label: 'Notices',
    description: 'View school notices and announcements from the principal. You can read all notices addressed to teachers.',
    path: '/app/notices',
    primary: 'View Notices',
    badge: 'New' as const,
    highlight: true,
    note: 'Read-only — notices are created by the principal',
  },
  {
    icon: 'NotebookPen',
    label: 'Homework',
    description: 'Create and manage homework assignments for your classes.',
    path: '/app/homework',
    primary: 'Manage Homework',
  },
  {
    icon: 'FileCheck',
    label: 'Submissions',
    description: 'Review and grade student homework submissions.',
    path: '/app/submissions',
    primary: 'Review Submissions',
  },
  {
    icon: 'ClipboardCheck',
    label: 'Gradebook',
    description: 'Record marks, apply rubrics and generate feedback.',
    path: '/app/gradebook',
    primary: 'Open Gradebook',
  },
  {
    icon: 'GraduationCap',
    label: 'Students',
    description: 'Browse student profiles, track progress and submissions.',
    path: '/app/students',
    primary: 'View Students',
  },
  {
    icon: 'MessageCircle',
    label: 'Chat',
    description: 'Message students directly.',
    path: '/app/chat',
    primary: 'Open Chat',
  },
];

function Icon({ name, className }: { name: string; className?: string }) {
  const C = (Icons as unknown as Record<string, Icons.LucideIcon>)[name] ?? Icons.Circle;
  return <C className={className} aria-hidden />;
}

function TeacherPortal() {
  const { user } = useAppState();

  return (
    <div className="space-y-6">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          <span className="size-1.5 rounded-full bg-primary" /> SHWAI WORKSPACE
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">Teacher Portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome, {user.name}. Manage classes, assignments, submissions and school communication.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PORTAL_CARDS.map(card => (
          <div
            key={card.path}
            className={`flex flex-col rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md
              ${card.highlight ? 'border-primary/30 bg-primary/5' : 'bg-card'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className={`flex size-10 items-center justify-center rounded-lg
                ${card.highlight ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Icon name={card.icon} className="size-5" />
              </div>
              {card.badge && (
                <Badge className="shrink-0 rounded-full bg-ai-soft px-2 text-[10px] text-ai">
                  {card.badge}
                </Badge>
              )}
            </div>

            <h2 className={`mt-3 text-base font-semibold ${card.highlight ? 'text-primary' : ''}`}>
              {card.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
            {card.note && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                <Icons.Eye className="size-3 shrink-0" />{card.note}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2 flex-1 items-end">
              <Button asChild size="sm" variant={card.highlight ? 'default' : 'outline'} className="flex-1">
                <Link to={card.path}>{card.primary}</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
