import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import type { FileMeta } from "@/types";
import { formatFileSize } from "@/lib/format";
import { toast } from "sonner";

/** Renders already-uploaded files; each click fetches a fresh short-lived signed URL and opens it. */
export function AttachmentList({
  files,
  getUrl,
}: {
  files: FileMeta[];
  getUrl: (filePath: string) => Promise<string>;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (files.length === 0) return null;

  async function open(file: FileMeta) {
    setLoadingId(file.id);
    try {
      const url = await getUrl(file.filePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not open this file.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <ul className="space-y-1.5">
      {files.map((file) => (
        <li key={file.id}>
          <button
            type="button"
            onClick={() => open(file)}
            disabled={loadingId === file.id}
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-xs transition-colors hover:bg-muted disabled:opacity-60"
          >
            <span className="flex items-center gap-2 truncate">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{file.fileName}</span>
              <span className="shrink-0 text-muted-foreground">· {formatFileSize(file.sizeBytes)}</span>
            </span>
            {loadingId === file.id ? <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden /> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
