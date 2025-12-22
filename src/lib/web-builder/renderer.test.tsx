import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageRenderer } from "./renderer";
import type { PageDSL } from "./dsl";

describe("PageRenderer", () => {
  it("renders basic nodes", () => {
    const page: PageDSL = {
      id: "test",
      title: "Test",
      tokens: {
        colors: { text: "#111", background: "#fff", primary: "#0ea5e9", muted: "#64748b" },
        space: { sm: 8, md: 16 },
        fontSizes: { base: 16, xl: 24 },
      },
      root: {
        id: "root",
        type: "container",
        props: { tag: "div" },
        children: [
          {
            id: "title",
            type: "text",
            props: { text: "Hello World", tag: "h1" },
          },
          {
            id: "cta",
            type: "button",
            props: { text: "Click" },
          },
        ],
      },
    };

    render(<PageRenderer page={page} />);

    expect(screen.getByText("Hello World")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Click" })).toBeInTheDocument();
  });
});
