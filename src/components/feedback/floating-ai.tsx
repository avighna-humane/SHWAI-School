import { useNavigate } from "@tanstack/react-router";
import { Bot } from "lucide-react";

export function FloatingAI() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-label="Open SHWAI AI tutor"
      className="ai-fab fixed bottom-20 right-5 z-20 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground lg:bottom-7 lg:right-7"
      onClick={() => void navigate({ to: "/app/ai/tutor" })}
    >
      <Bot className="size-5" aria-hidden />
    </button>
  );
}
