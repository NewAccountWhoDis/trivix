import { describe, expect, it } from "vitest";
import {
  checkDisplayNameSchema,
  completeSignupSchema,
  displayNameSchema,
  emailSchema,
  forgotPasswordSchema,
  loginSchema,
  nameSchema,
  passwordSchema,
  profileEditSchema,
  signupStep1EmailSchema,
  signupStep2Schema,
  signupStep3Schema,
  toDisplayNameKey,
} from "@/lib/validation/schemas";

describe("emailSchema", () => {
  it("trims and lowercases", () => {
    expect(emailSchema.parse("  Joe@Example.COM  ")).toBe("joe@example.com");
  });
  it("rejects invalid email", () => {
    expect(() => emailSchema.parse("not-an-email")).toThrow();
  });
});

describe("passwordSchema", () => {
  it("accepts 8+ chars", () => {
    expect(passwordSchema.parse("password1")).toBe("password1");
  });
  it("rejects under 8", () => {
    expect(() => passwordSchema.parse("short")).toThrow();
  });
  it("rejects over 128", () => {
    expect(() => passwordSchema.parse("a".repeat(129))).toThrow();
  });
});

describe("nameSchema", () => {
  it("accepts unicode letters, hyphens, apostrophes", () => {
    expect(nameSchema.parse("Mary-Jane O'Neil")).toBe("Mary-Jane O'Neil");
    expect(nameSchema.parse("Renée")).toBe("Renée");
    expect(nameSchema.parse("José")).toBe("José");
  });
  it("rejects empty after trim", () => {
    expect(() => nameSchema.parse("   ")).toThrow();
  });
  it("rejects digits", () => {
    expect(() => nameSchema.parse("Joe1")).toThrow();
  });
});

describe("displayNameSchema", () => {
  it("accepts letters, numbers, underscores", () => {
    expect(displayNameSchema.parse("joe_black_99")).toBe("joe_black_99");
  });
  it("rejects under 3", () => {
    expect(() => displayNameSchema.parse("ab")).toThrow();
  });
  it("rejects over 20", () => {
    expect(() => displayNameSchema.parse("a".repeat(21))).toThrow();
  });
  it("rejects spaces and punctuation", () => {
    expect(() => displayNameSchema.parse("joe black")).toThrow();
    expect(() => displayNameSchema.parse("joe-black")).toThrow();
    expect(() => displayNameSchema.parse("joe.black")).toThrow();
  });
});

describe("toDisplayNameKey", () => {
  it("trims and lowercases", () => {
    expect(toDisplayNameKey("  JoeBlack  ")).toBe("joeblack");
  });
});

describe("signupStep1EmailSchema", () => {
  it("requires email + password", () => {
    expect(
      signupStep1EmailSchema.parse({
        email: "JOE@x.com",
        password: "password1",
      }),
    ).toEqual({ email: "joe@x.com", password: "password1" });
  });
});

describe("signupStep2Schema", () => {
  it("validates identity, email, and password fields", () => {
    expect(
      signupStep2Schema.parse({
        firstName: "Joe",
        lastName: "Black",
        displayName: "joe_black",
        email: "JOE@x.com",
        password: "password123",
      }),
    ).toEqual({
      firstName: "Joe",
      lastName: "Black",
      displayName: "joe_black",
      email: "joe@x.com",
      password: "password123",
    });
  });
  it("rejects a weak password", () => {
    expect(() =>
      signupStep2Schema.parse({
        firstName: "Joe",
        lastName: "Black",
        displayName: "joe_black",
        email: "joe@x.com",
        password: "short",
      }),
    ).toThrow();
  });
});

describe("signupStep3Schema", () => {
  it("accepts player without reason", () => {
    expect(signupStep3Schema.parse({ role: "player" })).toEqual({
      role: "player",
    });
  });
  it("accepts host with reason", () => {
    expect(
      signupStep3Schema.parse({
        role: "host",
        reason: "I host weekly at Joe's Pub",
      }),
    ).toEqual({ role: "host", reason: "I host weekly at Joe's Pub" });
  });
  it("rejects unknown role", () => {
    expect(() => signupStep3Schema.parse({ role: "admin" })).toThrow();
  });
  it("rejects reason over 2000", () => {
    expect(() =>
      signupStep3Schema.parse({ role: "host", reason: "x".repeat(2001) }),
    ).toThrow();
  });
});

describe("completeSignupSchema", () => {
  it("requires step2 + step3 fields", () => {
    expect(
      completeSignupSchema.parse({
        firstName: "Joe",
        lastName: "Black",
        displayName: "joe_black",
        role: "player",
      }),
    ).toMatchObject({ role: "player", displayName: "joe_black" });
  });
});

describe("checkDisplayNameSchema", () => {
  it("validates the displayName field", () => {
    expect(checkDisplayNameSchema.parse({ displayName: "joe" })).toEqual({
      displayName: "joe",
    });
  });
});

describe("profileEditSchema", () => {
  it("matches step2 shape", () => {
    expect(
      profileEditSchema.parse({
        firstName: "Joe",
        lastName: "Black",
        displayName: "joe_black",
      }),
    ).toMatchObject({ displayName: "joe_black" });
  });
});

describe("loginSchema", () => {
  it("accepts a username identifier", () => {
    expect(
      loginSchema.parse({ identifier: "joe_black", password: "x" }),
    ).toEqual({ identifier: "joe_black", password: "x" });
  });
  it("accepts an email identifier", () => {
    expect(
      loginSchema.parse({ identifier: "joe@x.com", password: "x" }),
    ).toEqual({ identifier: "joe@x.com", password: "x" });
  });
  it("accepts a phone identifier", () => {
    expect(
      loginSchema.parse({ identifier: "+15555551234", password: "x" }),
    ).toEqual({ identifier: "+15555551234", password: "x" });
  });
  it("rejects empty password", () => {
    expect(() =>
      loginSchema.parse({ identifier: "joe@x.com", password: "" }),
    ).toThrow();
  });
  it("rejects empty identifier", () => {
    expect(() =>
      loginSchema.parse({ identifier: "", password: "x" }),
    ).toThrow();
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts an identifier string", () => {
    expect(forgotPasswordSchema.parse({ identifier: "joe@x.com" })).toEqual({
      identifier: "joe@x.com",
    });
  });
});
