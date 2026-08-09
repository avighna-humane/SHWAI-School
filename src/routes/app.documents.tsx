import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Folder,
  Plus,
  Trash2,
  Loader2,
  FileText,
  Download,
  Users,
  Lock,
  Eye,
  CalendarCheck,
  ChevronRight,
  ExternalLink,
  Search,
  UploadCloud,
  FileCode
} from "lucide-react";
import { useAppState } from "@/app/providers/app-state";
import { useActorParams } from "@/hooks/use-actor-params";
import { listDocuments, uploadDocument, deleteDocument, getDocumentSignedUrl } from "@/rpc/documents";
import { CLASS_SECTIONS } from "@/data/mock/core";
import { EmptyState, ErrorState, LoadingCards } from "@/components/feedback/states";
import { FloatingAI } from "@/components/feedback/floating-ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/app/documents")({ component: DocumentsPage });

function DocumentsPage() {
  const { role, schoolId, actor } = useAppState();
  const actorParams = useActorParams();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const isStaff = role === "principal" || role === "teacher" || role === "admin";

  const { data: docs = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["documents", schoolId, role],
    queryFn: () => listDocuments({ data: { schoolId, role } }),
    enabled: Boolean(schoolId),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => deleteDocument({ data: { actorRole: role, uploaderId: actor.id, docId } }),
    onSuccess: () => {
      toast.success("Document deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete document"),
  });

  const downloadMutation = useMutation({
    mutationFn: (docId: string) => getDocumentSignedUrl({ data: { role, docId } }),
    onSuccess: (res) => {
      // Force download in browser using standard direct signed URL
      window.open(res.url, "_blank");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to get document download link"),
  });

  // Categories list
  const categories = ["all", "Notes", "Syllabus", "Circular", "Worksheet", "Form", "Policy"];

  const filteredDocs = useMemo(() => {
    return docs.filter((doc: any) => {
      const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || doc.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [docs, selectedCategory, searchQuery]);

  return (
    <div className="relative space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Knowledge</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Documents</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Secure multi-tenant school document library. Search circulars, notes, forms, and administrative guidelines.
          </p>
        </div>
        {isStaff && (
          <UploadDocumentDialog schoolId={schoolId} uploaderId={actor.id} role={role} />
        )}
      </header>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="text-xs capitalize h-8 rounded-full"
            >
              {cat === "all" ? "All Documents" : cat}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <LoadingCards count={6} />
      ) : isError ? (
        <ErrorState message={(error as Error)?.message} onRetry={refetch} />
      ) : filteredDocs.length === 0 ? (
        <EmptyState title="No documents found" description="There are no documents uploaded in this category." icon={<Folder className="size-6" />} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocs.map((doc: any) => {
            const isUploader = doc.uploader_id === actor.id;
            const canDelete = isUploader || role === "principal" || role === "admin";
            return (
              <Card key={doc.id} className="group hover:shadow transition-shadow border-border/60">
                <CardHeader className="pb-3 flex flex-row items-start justify-between gap-3 space-y-0">
                  <div className="min-w-0 flex-1">
                    <Badge variant="secondary" className="text-[9px] uppercase tracking-wider rounded-md mb-1.5 capitalize h-5">
                      {doc.category}
                    </Badge>
                    <h4 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {doc.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {doc.file_type} · {doc.size_kb} KB · {formatDate(doc.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-primary hover:bg-primary-soft/10"
                      onClick={() => downloadMutation.mutate(doc.id)}
                      disabled={downloadMutation.isPending}
                    >
                      {downloadMutation.isPending && downloadMutation.variables === doc.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-danger hover:bg-danger/10"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t pt-2.5">
                    <span className="truncate">By: {doc.uploader_id === "principal-1" ? "Principal" : "Teacher"}</span>
                    <span className="flex items-center gap-1 shrink-0 font-medium">
                      <Lock className="size-3" /> Targeted: {doc.visible_to_roles?.join(", ") || "All"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FloatingAI />
    </div>
  );
}

function UploadDocumentDialog({ schoolId, uploaderId, role }: { schoolId: string; uploaderId: string; role: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Notes");
  const [file, setFile] = useState<File | null>(null);
  const [visibleToStudents, setVisibleToRolesStudents] = useState(true);
  const [visibleToTeachers, setVisibleToRolesTeachers] = useState(true);
  const [visibleToParents, setVisibleToRolesParents] = useState(true);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.set("schoolId", schoolId);
      formData.set("uploaderId", uploaderId);
      formData.set("actorRole", role);
      formData.set("category", category);

      const roles: string[] = [];
      if (visibleToStudents) roles.push("student");
      if (visibleToTeachers) roles.push("teacher");
      if (visibleToParents) roles.push("parent");
      formData.set("visibleToRoles", JSON.stringify(roles));

      if (file) formData.set("file", file);

      return uploadDocument({ data: formData });
    },
    onSuccess: () => {
      toast.success("Document uploaded securely");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setOpen(false);
      setFile(null);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to upload document"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UploadCloud className="size-4" /> Upload Document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle>Upload School Document</DialogTitle>
          <DialogDescription>Store and publish worksheets, notes, or circulars to the private bucket.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!file) {
              toast.error("Please select a file to upload.");
              return;
            }
            mutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="doc-category">Document Category</Label>
            <select
              id="doc-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="Notes">Study Notes</option>
              <option value="Syllabus">Syllabus Outline</option>
              <option value="Circular">Official Circular</option>
              <option value="Worksheet">Practice Worksheet</option>
              <option value="Form">Official Form</option>
              <option value="Policy">School Policy</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Visibility (Visible to)</Label>
            <div className="flex flex-col gap-2 rounded-xl border p-3.5 bg-muted/20">
              <label className="flex items-center gap-2.5 text-xs font-semibold select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleToStudents}
                  onChange={(e) => setVisibleToRolesStudents(e.target.checked)}
                  className="rounded border-input text-primary"
                />
                Students
              </label>
              <label className="flex items-center gap-2.5 text-xs font-semibold select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleToTeachers}
                  onChange={(e) => setVisibleToRolesTeachers(e.target.checked)}
                  className="rounded border-input text-primary"
                />
                Teachers
              </label>
              <label className="flex items-center gap-2.5 text-xs font-semibold select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleToParents}
                  onChange={(e) => setVisibleToRolesParents(e.target.checked)}
                  className="rounded border-input text-primary"
                />
                Parents
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-file">Select File (PDF, image, doc up to 10MB)</Label>
            <Input id="doc-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="h-9 bg-background" required />
          </div>

          {file && (
            <p className="text-[10px] text-primary font-medium">Selected file: {file.name} ({Math.round(file.size / 1024)} KB)</p>
          )}

          <DialogFooter className="border-t pt-3">
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="size-4 animate-spin mr-1.5" />} Secure Upload
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
