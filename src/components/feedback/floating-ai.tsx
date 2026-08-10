import { Bot, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function FloatingAI() {
  return (
    <button
      type="button"
      aria-label="Open SHWAI AI assistant"
      className="ai-fab fixed bottom-20 right-5 z-20 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground lg:bottom-7 lg:right-7"
      onClick={() => toast("AI assistant is simulated in this frontend demo.", { icon: <Sparkles className="size-4" /> })}
    >
      <Bot className="size-5" aria-hidden />
    </button>
  );
}