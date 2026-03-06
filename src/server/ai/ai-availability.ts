import { AppError } from "@/lib/app-error";
import { env } from "@/lib/env";

export function assertAiEnabled(): void {
  if (!env.aiEnabled) {
    throw new AppError(
      "SERVICE_DISABLED",
      "AI module is disabled. Set AI_ENABLED=true and configure LLM_PROVIDER + API key.",
      503,
    );
  }
}
