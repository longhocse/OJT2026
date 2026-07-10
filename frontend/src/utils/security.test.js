import { render, screen } from "@testing-library/react";
import SafeImage from "../components/common/SafeImage";
import { getSafeResourceUrl, getSafeYouTubeEmbedUrl, redactSensitive } from "./security";

describe("frontend security utilities", () => {
  test("redacts credentials and authorization values recursively", () => {
    const input = {
      email: "person@example.com",
      password: "Password1",
      headers: { Authorization: "Bearer secret", Accept: "application/json" },
      nested: [{ token: "jwt", title: "safe" }],
    };
    expect(redactSensitive(input)).toEqual({
      email: "[REDACTED]",
      password: "[REDACTED]",
      headers: { Authorization: "[REDACTED]", Accept: "application/json" },
      nested: [{ token: "[REDACTED]", title: "safe" }],
    });
  });

  test.each([
    "javascript:alert(1)",
    "data:text/html,bad",
    "file:///etc/passwd",
    "//evil.example/image.jpg",
  ])("rejects unsafe resource URL %s", (value) =>
    expect(getSafeResourceUrl(value, "/placeholder.jpg")).toBe("/placeholder.jpg"),
  );

  test("allows HTTP(S) and local paths but SafeImage falls back for unsafe API data", () => {
    expect(getSafeResourceUrl("https://cdn.example/poster.jpg")).toBe(
      "https://cdn.example/poster.jpg",
    );
    expect(getSafeResourceUrl("/poster.jpg")).toBe("/poster.jpg");
    render(<SafeImage src="javascript:alert(1)" alt="Poster" />);
    expect(screen.getByRole("img", { name: "Poster" })).toHaveAttribute("src", "/placeholder.svg");
  });

  test.each([
    ["https://www.youtube.com/watch?v=0wTIniZRYXU", "https://www.youtube.com/embed/0wTIniZRYXU"],
    ["https://youtu.be/0wTIniZRYXU?t=30", "https://www.youtube.com/embed/0wTIniZRYXU"],
    ["https://www.youtube.com/shorts/0wTIniZRYXU", "https://www.youtube.com/embed/0wTIniZRYXU"],
    ["https://www.youtube.com/embed/0wTIniZRYXU", "https://www.youtube.com/embed/0wTIniZRYXU"],
  ])("normalizes safe YouTube trailer URL %s", (input, expected) => {
    expect(getSafeYouTubeEmbedUrl(input)).toBe(expected);
  });

  test.each([
    "https://evil.example/embed/0wTIniZRYXU",
    "javascript:alert(1)",
    "https://www.youtube.com/watch?v=bad",
  ])("rejects unsafe trailer URL %s", (input) => {
    expect(getSafeYouTubeEmbedUrl(input)).toBeNull();
  });
});
