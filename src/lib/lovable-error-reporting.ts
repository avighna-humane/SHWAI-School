type LovableErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type LovableEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: LovableErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: LovableEvents;
    __lovableReportRuntimeError?: (payload: {
      message: string;
      stack?: string;
      filename?: string;
    }) => void;
  }
}

function redactClientMessage(value: string) {
  return value
    .replace(/https?:\/\/[^\s]+/gi, "[url]")
    .replace(/(?:postgres|mysql|supabase):[^\s]+/gi, "[connection]")
    .replace(
      /(?:password|secret|token|authorization|cookie|api.?key)\s*[=:]\s*[^\s]+/gi,
      "$1=[redacted]",
    )
    .replace(/\/(?:home|Users|workspace|app|tmp)\/[^\s]+/g, "[path]")
    .slice(0, 240);
}

export function reportLovableError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const safeMessage = redactClientMessage(
    error instanceof Response
      ? `Response ${error.status}`
      : error instanceof Error
        ? error.message
        : String(error),
  );
  window.__lovableEvents?.captureException?.(
    new Error(safeMessage),
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...Object.fromEntries(
        Object.entries(context).filter(
          ([key, value]) => key.length < 80 && typeof value !== "object",
        ),
      ),
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
  // Prod React does not rethrow boundary-caught errors to window.onerror, so the
  // editor's telemetry never sees them. Forward to lovable.js's reporting hook,
  // which is present only inside the editor preview.
  // Loaders and server fns commonly throw a raw Response; String(it) is the
  // opaque "[object Response]", so pull out the status and URL instead.
  window.__lovableReportRuntimeError?.({
    message: safeMessage,
    filename: window.location.pathname,
  });
}
