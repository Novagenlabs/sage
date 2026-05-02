// Verify buildSystemPrompt assembles context correctly. The exact wording is
// not tested (it'll change), only the structural guarantees that matter:
// names get included, profileSummary gets included, summaries get included,
// phase prompt is appended, time-checkpoint kicks in past 10 minutes.
import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "@/lib/prompts";

describe("buildSystemPrompt", () => {
  it("returns a non-empty prompt with no context", () => {
    const out = buildSystemPrompt("opening");
    expect(out.length).toBeGreaterThan(100);
    // The phase header marker is always emitted
    expect(out).toContain("Current Phase");
  });

  it("includes the user's name when provided", () => {
    const out = buildSystemPrompt("opening", undefined, {
      userName: "Sam",
    });
    expect(out).toContain("Sam");
  });

  it("includes the profile summary", () => {
    const out = buildSystemPrompt("opening", undefined, {
      profileSummary: "Tends to delay decisions.",
    });
    expect(out).toContain("Tends to delay decisions.");
  });

  it("includes recent session summaries when present", () => {
    const out = buildSystemPrompt("opening", undefined, {
      recentSummaries: [
        {
          title: "x",
          summary: "Reflected on a tension.",
          updatedAt: new Date().toISOString(),
        },
      ],
    });
    expect(out).toContain("Reflected on a tension.");
  });

  it("adds a time check-in only past 10 minutes", () => {
    const short = buildSystemPrompt("opening", 5);
    const long = buildSystemPrompt("opening", 12);
    expect(short).not.toMatch(/Session Note/i);
    expect(long).toMatch(/Session Note/i);
    expect(long).toMatch(/12 minutes/);
  });

  it("varies output by phase", () => {
    const opening = buildSystemPrompt("opening");
    const synthesizing = buildSystemPrompt("synthesizing");
    expect(opening).not.toBe(synthesizing);
  });
});
