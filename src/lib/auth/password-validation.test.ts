import { describe, expect, it } from "vitest";
import { validatePasswordChange } from "./password-validation";

describe("validatePasswordChange", () => {
  it("requires at least 12 characters", () => {
    expect(validatePasswordChange("short-pass", "short-pass")).toBe(
      "Gunakan password baru minimal 12 karakter."
    );
  });

  it("requires an exact confirmation match", () => {
    expect(validatePasswordChange("StrongPassword123", "StrongPassword124")).toBe(
      "Konfirmasi password tidak sama."
    );
  });

  it("accepts a long matching password", () => {
    expect(validatePasswordChange("StrongPassword123!", "StrongPassword123!")).toBeNull();
  });
});
