import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Folder,
  Plus,
  Trash2,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  Loader2,
  Eye,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import {
  listDocuments,
  uploadDocument,
  getDocumentSignedUrl,
  deleteDocument,
} from "@/rpc/documents";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/app/documents")({ component: DocumentsPage });

function FileIcon({ type }: { type: string }) {
  const t = type.toLowerCase();
  if (t === "pdf") return <FileText className="size-6 text-danger" />;
  if (["png", "jpg", "jpeg", "webp"].includes(t))
    return <FileImage className="size-6 text-success" />;
  if (["xls", "xlsx", "csv"].includes(t)) return <FileSpreadsheet className="size-6 text-info" />;
  return <FileCode className="size-6 text-muted-foreground" />;
}

function DocumentsPage() {
  const { role } = useAppState();
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Queries
  const docsQuery = useQuery({
    queryKey: ["documents-list", actorParams],
    queryFn: () => listDocuments({ data: actorParams! }),
    enabled: Boolean(actorParams),
  });

  // Upload Form states
  const [docName, setDocName] = useState("");
  const [targetAudience, setTargetAudience] = useState<string>("student");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("role", role);
      if (actorParams?.actorId) formData.set("actorId", actorParams.actorId);
      formData.set("name", docName.trim() || selectedFile.name);
      formData.set(
        "visibilityAudience",
        JSON.stringify(
          targetAudience === "all" ? ["student", "teacher", "parent"] : [targetAudience],
        ),
      );
      if (selectedClassId) formData.set("classId", selectedClassId);
      formData.set("file", selectedFile);

      await uploadDocument({ data: formData });
      toast.success("Document uploaded securely");
      queryClient.invalidateQueries({ queryKey: ["documents-list"] });
      setIsUploadOpen(false);
      setDocName("");
      setSelectedFile(null);
      setSelectedClassId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  // Actions
  const downloadMutation = useMutation({
    mutationFn: (documentId: string) =>
      getDocumentSignedUrl({ data: { role, actorId: actorParams?.actorId, documentId } }),
    onSuccess: (res) => {
      // Safely open the secure signed link in a new browser tab for download
      window.open(res.url, "_blank");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to generate download link"),
  });

  const deleteMutation = useMutation({
    mutationFn: (documentId: string) =>
      deleteDocument({ data: { role, actorId: actorParams?.actorId, documentId } }),
    onSuccess: () => {
      toast.success("Document deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["documents-list"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete document"),
  });

  if (!actorParams) {
    return (
      <EmptyState
        title="Access Denied"
        description="Please select an active identity inside Settings to access school documents."
        icon={<Folder className="size-6" />}
      />
    );
  }

  const isStaff = role === "principal" || role === "teacher";
  const docs = docsQuery.data ?? [];

  return (
    <div className="relative space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Workspace
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">Document Repository</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            View note books, syllabuses, circular worksheets, report cards, or official certificate
            templates.
          </p>
        </div>
        {isStaff && (
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Document Securly</DialogTitle>
                <DialogDescription>
                  Supported file types: PDF, DOCX, XLSX, PNG, JPG. Max 5MB.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={(handleAuthSubmit) => handleUploadSubmit(handleAuthSubmit)}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="doc-file">Select File</Label>
                  <Input
                    id="doc-file"
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setSelectedFile(file);
                      if (file && !docName) setDocName(file.name.split(".")[0]);
                    }}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="doc-name">Document Label Name</Label>
                  <Input
                    id="doc-name"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Grade 9 Algebra Syllabus"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="doc-vis">Visibility</Label>
                    <select
                      id="doc-vis"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="student">Students Only</option>
                      <option value="teacher">Teachers & Staff</option>
                      <option value="parent">Parents Only</option>
                      <option value="all">Everyone</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="doc-class">Target Class (Optional)</Label>
                    <select
                      id="doc-class"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">No specific class</option>
                      {CLASS_SECTIONS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={uploading || !selectedFile}>
                    {uploading && <Loader2 className="size-4 animate-spin mr-1" />}
                    Upload Document
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </header>

      {/* Docs Grid */}
      <div className="surface-panel p-5 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-1.5 text-primary border-b pb-2.5">
          <ShieldCheck className="size-5 text-success" /> Secure School Files
        </h2>

        {docsQuery.isLoading ? (
          <LoadingCards count={4} />
        ) : docsQuery.isError ? (
          <ErrorState
            message={(docsQuery.error as Error)?.message}
            onRetry={() => docsQuery.refetch()}
          />
        ) : docs.length === 0 ? (
          <EmptyState
            title="No documents found"
            description="No verified school files have been published to your cohort yet."
            icon={<Folder className="size-6" />}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="p-4 border rounded-xl bg-card hover:border-primary/50 transition-colors flex flex-col gap-3 justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-lg bg-muted/40 border shrink-0">
                    <FileIcon type={doc.fileType} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate" title={doc.name}>
                      {doc.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {doc.fileType} · {doc.fileSizeKb} KB
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {doc.visibilityAudience.map((aud) => (
                    <Badge
                      key={aud}
                      variant="outline"
                      className="text-[9px] rounded-full uppercase"
                    >
                      {aud}
                    </Badge>
                  ))}
                  {doc.classId && (
                    <Badge
                      variant="outline"
                      className="text-[9px] rounded-full bg-primary-soft text-primary border-primary/20"
                    >
                      Class Targeted
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2.5 border-t border-border/40 mt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 flex-1 text-xs gap-1"
                    disabled={downloadMutation.isPending}
                    onClick={() => downloadMutation.mutate(doc.id)}
                  >
                    {downloadMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    Download Securely
                  </Button>

                  {isStaff && (role === "principal" || doc.userId === actorParams?.actorId) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-danger hover:bg-danger/10 shrink-0"
                      onClick={() => deleteMutation.mutate(doc.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <FloatingAI />
    </div>
  );
}
