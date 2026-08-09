import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { GraduationCap, Lock, Mail, Loader2, ArrowLeft } from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { signInWithPassword } from "@/rpc/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/app/login")({ component: LoginPage });

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setRole, setStudentId, setTeacherId, setSchoolId } = useAppState();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => signInWithPassword({ data: { email, password } }),
    onSuccess: (res) => {
      toast.success(`Welcome back, ${res.user.name}!`);

      // Update app provider state
      setRole(res.user.role);
      setSchoolId(res.user.schoolId);

      if (res.user.role === "student") {
        setStudentId(res.user.id);
        navigate({ to: "/app/portal/student" });
      } else if (res.user.role === "teacher") {
        setTeacherId(res.user.id);
        navigate({ to: "/app/portal/teacher" });
      } else {
        navigate({ to: "/app/portal/principal" });
      }

      // Persist auth token in local storage
      localStorage.setItem("shwai_session_token", res.sessionToken);
      localStorage.setItem("shwai_session_user", JSON.stringify(res.user));
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to sign in. Verify credentials.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/">
            <ArrowLeft className="size-4 mr-1.5" /> Back to home
          </Link>
        </Button>

        <Card className="border-border/60 shadow-lg">
          <CardHeader className="space-y-1.5 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary border border-primary/20">
              <GraduationCap className="size-6" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Sign in to SHWAI</CardTitle>
            <CardDescription>Enter your credential email and password below.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="auth-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="auth-email"
                    type="email"
                    placeholder="name@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password">Password</Label>
                  <Link to="/app/reset-password" className="text-xs text-primary hover:underline font-semibold">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-10"
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full h-10 font-bold" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" /> Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
