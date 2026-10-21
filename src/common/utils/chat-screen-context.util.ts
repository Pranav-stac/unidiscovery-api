import type { ChatScreenContextDto } from '../dto/chat-screen-context.dto';

function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…[truncated]`;
}

export function formatScreenContextBlock(screen?: ChatScreenContextDto | null): string {
  if (!screen) return '';
  const blocks: string[] = [];
  if (screen.pageTitle) blocks.push(`Page: ${screen.pageTitle}`);
  if (screen.phase) blocks.push(`Student phase: ${screen.phase}`);
  if (screen.focusTopic) blocks.push(`Focus topic: ${screen.focusTopic}`);
  if (screen.visibleText?.trim()) {
    blocks.push(`On-screen lesson/content:\n${clip(screen.visibleText.trim(), 10000)}`);
  }
  if (screen.currentQuestion?.trim()) {
    blocks.push(`Current question on screen:\n${clip(screen.currentQuestion.trim(), 6000)}`);
  }
  if (screen.questionIndex != null && screen.questionIndex >= 0) {
    blocks.push(`Question index on screen: ${screen.questionIndex + 1}`);
  }
  if (screen.selectedAnswer?.trim()) {
    blocks.push(`Student selected answer (if any): ${clip(screen.selectedAnswer.trim(), 2000)}`);
  }
  if (screen.recentMessages?.length) {
    const turns = screen.recentMessages
      .slice(-8)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');
    blocks.push(`Recent chat (continuity):\n${clip(turns, 4000)}`);
  }
  if (!blocks.length) return '';
  return `\n\n--- Screen context (ground answers in this; do not invent facts beyond it) ---\n${blocks.join('\n\n')}`;
}

export function appendScreenContext(prompt: string, screen?: ChatScreenContextDto | null): string {
  const block = formatScreenContextBlock(screen);
  return block ? `${prompt}${block}` : prompt;
}
