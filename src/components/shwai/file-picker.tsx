import { useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/format";

/** Mirrors src/server/files.ts limits — server re-validates, this is just UX guidance. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

/** Multi-file picker used for homework attachments and submission files. Server re-validates every file. */
export function FilePicker({
  files,
  onChange,
  label = "Attach files",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    onChange([...files, ...picked]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        onChange={handlePick}
        className="hidden"
        id="file-picker-input"
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Paperclip className="size-3.5" aria-hidden /> {label}
      </Button>
      <p className="text-xs text-muted-foreground">
        PDF, images, Word, Excel or PowerPoint · up to 10MB each
      </p>
      {files.length > 0 ? (
        <ul className="space-y-1.5">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs"
            >
              <span className="truncate">
                {file.name}{" "}
                <span className="text-muted-foreground">· {formatFileSize(file.size)}</span>
              </span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove ${file.name}`}
                className="text-muted-foreground hover:text-danger"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
