import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { GraduationCap, Lock, Mail, Loader2, ArrowLeft } from "lucide-react";
import { resetPasswordForEmail } from "@/rpc/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/app/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => resetPasswordForEmail({ data: { email, newPassword } }),
    onSuccess: () => {
      toast.success("Password reset successful! Sign in with your new password.");
      navigate({ to: "/app/login" });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reset password. Verify email address.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !newPassword) {
      toast.error("Please fill in all fields.");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/app/login">
            <ArrowLeft className="size-4 mr-1.5" /> Back to sign in
          </Link>
        </Button>

        <Card className="border-border/60 shadow-lg">
          <CardHeader className="space-y-1.5 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary border border-primary/20">
              <GraduationCap className="size-6" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">Reset Password</CardTitle>
            <CardDescription>Enter your email and define your new secure password.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
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
                <Label htmlFor="reset-new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="reset-new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                    <Loader2 className="size-4 animate-spin mr-1.5" /> Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
