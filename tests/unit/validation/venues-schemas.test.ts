import { describe, expect, it } from "vitest";
import {
  createVenueSchema,
  venueAddressSchema,
  venueNameSchema,
} from "@/lib/validation/schemas";

const VALID_ADDRESS = {
  street: "123 Main St",
  city: "Albany",
  state: "NY",
  zip: "12207",
};

describe("venueNameSchema", () => {
  it("accepts a normal name", () => {
    expect(venueNameSchema.parse("Joe's Pub")).toBe("Joe's Pub");
  });
  it("trims surrounding whitespace", () => {
    expect(venueNameSchema.parse("  The Tap Room  ")).toBe("The Tap Room");
  });
  it("rejects under 2 chars", () => {
    expect(() => venueNameSchema.parse("A")).toThrow();
  });
  it("rejects over 60 chars", () => {
    expect(() => venueNameSchema.parse("a".repeat(61))).toThrow();
  });
});

describe("venueAddressSchema", () => {
  it("accepts a valid US address", () => {
    expect(venueAddressSchema.parse(VALID_ADDRESS)).toEqual(VALID_ADDRESS);
  });
  it("uppercases state", () => {
    expect(
      venueAddressSchema.parse({ ...VALID_ADDRESS, state: "ny" }).state,
    ).toBe("NY");
  });
  it("accepts ZIP+4", () => {
    expect(
      venueAddressSchema.parse({ ...VALID_ADDRESS, zip: "12207-1234" }).zip,
    ).toBe("12207-1234");
  });
  it("rejects bad state", () => {
    expect(() =>
      venueAddressSchema.parse({ ...VALID_ADDRESS, state: "NEW" }),
    ).toThrow();
    expect(() =>
      venueAddressSchema.parse({ ...VALID_ADDRESS, state: "1Y" }),
    ).toThrow();
  });
  it("rejects bad zip", () => {
    expect(() =>
      venueAddressSchema.parse({ ...VALID_ADDRESS, zip: "1234" }),
    ).toThrow();
    expect(() =>
      venueAddressSchema.parse({ ...VALID_ADDRESS, zip: "12345-67" }),
    ).toThrow();
    expect(() =>
      venueAddressSchema.parse({ ...VALID_ADDRESS, zip: "abcde" }),
    ).toThrow();
  });
  it("rejects empty street/city", () => {
    expect(() =>
      venueAddressSchema.parse({ ...VALID_ADDRESS, street: "" }),
    ).toThrow();
    expect(() =>
      venueAddressSchema.parse({ ...VALID_ADDRESS, city: "" }),
    ).toThrow();
  });
});

describe("createVenueSchema", () => {
  it("validates name + address together", () => {
    expect(
      createVenueSchema.parse({ name: "Joe's Pub", address: VALID_ADDRESS }),
    ).toEqual({ name: "Joe's Pub", address: VALID_ADDRESS });
  });
  it("rejects missing fields", () => {
    expect(() => createVenueSchema.parse({ name: "Joe's Pub" })).toThrow();
    expect(() => createVenueSchema.parse({ address: VALID_ADDRESS })).toThrow();
  });
});
