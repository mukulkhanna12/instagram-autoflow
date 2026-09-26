import { describe, it, expect } from "vitest";
import { emailProblem, emailSuggestion, isValidEmail } from "@/lib/email-check";

describe("emailProblem", () => {
  it("explains what's missing in plain words", () => {
    expect(emailProblem("")).toMatch(/Enter your email/);
    expect(emailProblem("demo")).toMatch(/Add an @/);
    expect(emailProblem("demo@")).toMatch(/after @/);
    expect(emailProblem("@gmail.com")).toMatch(/before the @/);
    expect(emailProblem("demo@gmail")).toMatch(/gmail\.com/);
    expect(emailProblem("de mo@gmail.com")).toMatch(/spaces/);
    expect(emailProblem("a@@b.com")).toMatch(/more than one @/);
  });
  it("is happy with a real address", () => {
    expect(emailProblem("demo@demo.com")).toBeNull();
    expect(isValidEmail(" demo@demo.com ")).toBe(true);
  });
});

describe("emailSuggestion", () => {
  it("catches common domain typos", () => {
    expect(emailSuggestion("sam@gmial.com")).toBe("sam@gmail.com");
    expect(emailSuggestion("sam@hotmial.com")).toBe("sam@hotmail.com");
  });
  it("leaves correct and unknown domains alone", () => {
    expect(emailSuggestion("sam@gmail.com")).toBeNull();
    expect(emailSuggestion("sam@mycompany.io")).toBeNull();
  });
});
