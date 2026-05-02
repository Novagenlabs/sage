// Credit math is the foundation of voice + video billing. Tests live here
// because if these are wrong, every downstream calculation is wrong.
import { describe, expect, it } from "vitest";
import {
  SECONDS_PER_CREDIT,
  VIDEO_CREDITS_PER_SECOND,
  creditsToSeconds,
  secondsToCredits,
  creditsToVideoSeconds,
  videoSecondsToCredits,
  USD_PER_CREDIT,
  usdToCredits,
  creditsToUsd,
} from "@/lib/credit-costs";

describe("voice billing", () => {
  it("uses 1 credit per second by default", () => {
    expect(SECONDS_PER_CREDIT).toBe(1);
  });

  it("converts credits to seconds linearly", () => {
    expect(creditsToSeconds(0)).toBe(0);
    expect(creditsToSeconds(60)).toBe(60);
    expect(creditsToSeconds(120)).toBe(120);
  });

  it("rounds seconds up when converting to credits", () => {
    expect(secondsToCredits(0)).toBe(0);
    expect(secondsToCredits(1)).toBe(1);
    expect(secondsToCredits(60)).toBe(60);
    // Math.ceil — partial second still bills
    expect(secondsToCredits(0.5)).toBe(1);
  });
});

describe("video billing", () => {
  it("charges 3x the voice rate", () => {
    expect(VIDEO_CREDITS_PER_SECOND).toBe(3);
  });

  it("rounds up — partial seconds still cost a full credit triple", () => {
    expect(videoSecondsToCredits(0)).toBe(0);
    expect(videoSecondsToCredits(1)).toBe(3);
    expect(videoSecondsToCredits(10)).toBe(30);
    expect(videoSecondsToCredits(60)).toBe(180);
    expect(videoSecondsToCredits(0.4)).toBe(2); // ceil(1.2)
  });

  it("converts a credit balance to a max video duration with floor (no rounding up)", () => {
    expect(creditsToVideoSeconds(0)).toBe(0);
    expect(creditsToVideoSeconds(3)).toBe(1);
    expect(creditsToVideoSeconds(8)).toBe(2); // floor(8/3)
    expect(creditsToVideoSeconds(180)).toBe(60);
  });

  it("never overstates available time — 5 credits = 1s of video, not 2", () => {
    // We must under-estimate available time to protect ourselves from
    // racing the timer past the credit balance. floor() is correct.
    expect(creditsToVideoSeconds(5)).toBe(1);
  });
});

describe("usd <-> credits", () => {
  it("uses the documented 200 credits = $1 ratio", () => {
    expect(USD_PER_CREDIT).toBe(0.005);
  });

  it("is round-trip-able for the common amounts", () => {
    expect(creditsToUsd(200)).toBe(1);
    expect(usdToCredits(1)).toBe(200);
    expect(creditsToUsd(1000)).toBe(5);
    expect(usdToCredits(5)).toBe(1000);
  });

  it("rounds up usd → credits so we never under-credit a purchase", () => {
    // $0.001 is technically 0.2 credits — we round up so the user gets at
    // least 1 credit for any amount we accept payment for.
    expect(usdToCredits(0.001)).toBe(1);
    // $0.0049 → still 1 credit
    expect(usdToCredits(0.0049)).toBe(1);
  });
});
