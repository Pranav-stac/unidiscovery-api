export function discoverPromptForTheme(theme: string): string {
  const prompts: Record<string, string> = {
    cultural_background:
      "Tell me about the cultural background that is most important to your story. The more specific you can be about why it matters to you, the better!",
    identity:
      "What part of your identity do you want colleges to understand better—and when did you first realize it shaped how you see the world?",
    challenge:
      "What challenge changed how you think about yourself? Start with one specific moment, not the whole timeline.",
    passion:
      "What do you lose track of time doing? Describe one moment that shows why this passion is yours—not something you think sounds impressive.",
    community:
      "Where do you show up for others? Share one concrete example of impact, even if it feels small.",
    family:
      "What did your family or upbringing teach you that you carry into how you learn and lead today?",
    leadership:
      "When did you step up without being asked? Walk me through that situation in detail.",
    academic:
      "What subject or question pulled you in deeper than you expected—and what did you do about it?",
    career:
      "What experiences pointed you toward your field of interest? Focus on one turning point.",
    other:
      "In your own words, what theme do you want this personal statement to center on—and why now?",
  };
  return prompts[theme] ?? prompts.other;
}
