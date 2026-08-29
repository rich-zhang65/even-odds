import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Checkbox } from "../Checkbox";
import { Input } from "../Input";
import { Radio } from "../Radio";
import { Select } from "../Select";
import { Switch } from "../Switch";

describe("Input", () => {
  it("shows the hint until an error replaces it", () => {
    expect(renderToStaticMarkup(<Input hint="Room codes are 4 letters" />)).toContain(
      "Room codes are 4 letters"
    );

    const errored = renderToStaticMarkup(
      <Input hint="Room codes are 4 letters" error="No such room" />
    );

    expect(errored).toContain("No such room");
    expect(errored).not.toContain("Room codes are 4 letters");
  });

  it("marks the field invalid and drops the focus ring while errored", () => {
    const html = renderToStaticMarkup(<Input error="No such room" />);

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("border-eo-red-line");
    expect(html).not.toContain("focus-within:border-eo-focus");
  });
});

describe("Checkbox", () => {
  it("renders the tick only when checked", () => {
    expect(renderToStaticMarkup(<Checkbox label="Ready" />)).not.toContain("<svg");
    expect(renderToStaticMarkup(<Checkbox label="Ready" checked onChange={() => {}} />)).toContain("<svg");
  });

  it("keeps the native input focusable rather than hidden", () => {
    const html = renderToStaticMarkup(<Checkbox label="Ready" />);

    expect(html).toContain("sr-only");
    expect(html).not.toContain('type="hidden"');
  });
});

describe("Radio", () => {
  it("groups by name and fills the dot when checked", () => {
    const html = renderToStaticMarkup(<Radio name="seat" value="p0" checked onChange={() => {}} label="Red" />);

    expect(html).toContain('name="seat"');
    expect(html).toContain("bg-eo-blue-solid");
  });
});

describe("Select", () => {
  it("accepts bare strings and value/label pairs alike", () => {
    const html = renderToStaticMarkup(
      <Select options={["Any", { value: "best-of-5", label: "Best of 5" }]} />
    );

    expect(html).toContain('value="Any"');
    expect(html).toContain('value="best-of-5"');
    expect(html).toContain("Best of 5");
  });
});

describe("Switch", () => {
  it("exposes the switch role and slides the knob when on", () => {
    expect(renderToStaticMarkup(<Switch label="Sound" />)).toContain('role="switch"');
    expect(renderToStaticMarkup(<Switch label="Sound" checked onChange={() => {}} />)).toContain("translate-x-5");
    expect(renderToStaticMarkup(<Switch label="Sound" />)).not.toContain("translate-x-5");
  });
});
