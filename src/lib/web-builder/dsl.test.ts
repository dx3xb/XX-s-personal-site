import { describe, expect, it } from "vitest";
import { PageSchema, createDefaultPage } from "./dsl";

describe("Page DSL validation", () => {
  it("accepts the default page", () => {
    const page = createDefaultPage();
    expect(() => PageSchema.parse(page)).not.toThrow();
  });

  it("rejects pages without a root node", () => {
    const page = createDefaultPage();
    const invalid = { ...page, root: undefined } as unknown;
    expect(() => PageSchema.parse(invalid)).toThrow();
  });
});
