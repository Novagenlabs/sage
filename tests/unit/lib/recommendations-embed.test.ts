import { describe, expect, it } from "vitest";
import { detectEmbed } from "@/lib/recommendations/embed";

describe("detectEmbed", () => {
  describe("youtube", () => {
    it("detects a standard youtube.com/watch?v= URL", () => {
      const r = detectEmbed("https://www.youtube.com/watch?v=1RWOpQXTltA");
      expect(r.kind).toBe("youtube");
      expect(r.embedSrc).toBe("https://www.youtube.com/embed/1RWOpQXTltA");
    });

    it("detects youtu.be short URLs", () => {
      const r = detectEmbed("https://youtu.be/1RWOpQXTltA?si=abc");
      expect(r.kind).toBe("youtube");
      expect(r.embedSrc).toBe("https://www.youtube.com/embed/1RWOpQXTltA");
    });

    it("detects /embed and /shorts paths", () => {
      const a = detectEmbed("https://www.youtube.com/embed/1RWOpQXTltA");
      const b = detectEmbed("https://www.youtube.com/shorts/1RWOpQXTltA");
      expect(a.kind).toBe("youtube");
      expect(b.kind).toBe("youtube");
    });

    it("falls back to external when there's no recognisable id", () => {
      const r = detectEmbed("https://www.youtube.com/feed/trending");
      expect(r.kind).toBe("external");
    });
  });

  describe("spotify", () => {
    it("converts an episode URL to the embed URL", () => {
      const r = detectEmbed(
        "https://open.spotify.com/episode/4XlBe11zQ3Y?si=abc"
      );
      expect(r.kind).toBe("spotify");
      expect(r.embedSrc).toBe(
        "https://open.spotify.com/embed/episode/4XlBe11zQ3Y"
      );
    });

    it("works for tracks, shows, albums, playlists", () => {
      for (const t of ["track", "show", "album", "playlist"] as const) {
        const r = detectEmbed(`https://open.spotify.com/${t}/abc123`);
        expect(r.kind).toBe("spotify");
        expect(r.embedSrc).toBe(`https://open.spotify.com/embed/${t}/abc123`);
      }
    });

    it("falls back to external for an unknown spotify path", () => {
      const r = detectEmbed("https://open.spotify.com/user/somebody");
      expect(r.kind).toBe("external");
    });
  });

  describe("audio", () => {
    it("detects direct mp3 URLs", () => {
      const r = detectEmbed("https://example.com/audio/x.mp3");
      expect(r.kind).toBe("audio");
      expect(r.embedSrc).toBe("https://example.com/audio/x.mp3");
    });

    it("detects m4a, ogg, wav, aac too", () => {
      for (const ext of [".m4a", ".ogg", ".wav", ".aac"]) {
        const r = detectEmbed(`https://example.com/clip${ext}`);
        expect(r.kind).toBe("audio");
      }
    });
  });

  describe("external", () => {
    it("falls back to external for plain URLs", () => {
      const r = detectEmbed("https://en.wikipedia.org/wiki/Plato");
      expect(r.kind).toBe("external");
      expect(r.embedSrc).toBeUndefined();
      expect(r.href).toBe("https://en.wikipedia.org/wiki/Plato");
    });

    it("returns external for malformed inputs without throwing", () => {
      const r = detectEmbed("not a url");
      expect(r.kind).toBe("external");
      expect(r.href).toBe("not a url");
    });
  });
});
