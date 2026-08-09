import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FilePicker } from "@/components/shwai/file-picker";
import { submitHomework } from "@/rpc/submissions";

export function SubmitHomeworkForm({
  actorId,
  homeworkId,
  isResubmission,
}: {
  actorId?: string;
  homeworkId: string;
  isResubmission: boolean;
}) {
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.set("role", "student");
      if (actorId) formData.set("actorId", actorId);
      formData.set("homeworkId", homeworkId);
      formData.set("comment", comment.trim());
      for (const file of files) formData.append("files", file);
      return submitHomework({ data: formData });
    },
    onSuccess: (res) => {
      toast.success(res.late ? "Submitted — marked late" : "Submitted");
      queryClient.invalidateQueries({ queryKey: ["homework"] });
      setComment("");
      setFiles([]);
    },
    onError: (err: Error) => toast.error(err.message || "Could not submit homework."),
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (files.length === 0) {
          toast.error("Attach at least one file before submitting.");
          return;
        }
        mutation.mutate();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="submission-comment">Note to teacher (optional)</Label>
        <Textarea
          id="submission-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anything you'd like your teacher to know…"
          className="min-h-20"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Your work</Label>
        <FilePicker files={files} onChange={setFiles} label="Attach your work" />
      </div>
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
        {isResubmission ? "Resubmit" : "Submit homework"}
      </Button>
    </form>
  );
}
