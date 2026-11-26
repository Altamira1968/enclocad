import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NumField } from "@/components/NumField";

afterEach(cleanup);

function Field({ min = 30, max = 300, initial = 75 }) {
  const [value, setValue] = useState(initial);
  return <><NumField label="Ölçü" value={value} min={min} max={max} onChange={setValue} /><output data-testid="model-value">{value}</output></>;
}

describe("Sayısal ölçü girişi", () => {
  it("75 yerine 1, 10, 100 yazılmasına izin verir ve yalnız geçerli ölçüyü modele aktarır", () => {
    render(<Field />);
    const input = screen.getByRole("spinbutton");
    fireEvent.focus(input);
    for (const value of ["1", "10"]) {
      fireEvent.change(input, { target: { value } });
      expect(input).toHaveValue(Number(value));
      expect(screen.getByTestId("model-value")).toHaveTextContent("75");
    }
    fireEvent.change(input, { target: { value: "100" } });
    expect(input).toHaveValue(100);
    expect(screen.getByTestId("model-value")).toHaveTextContent("100");
  });

  it("odaktan çıkınca minimum ve maksimum sınırlarını uygular", () => {
    render(<Field />);
    const input = screen.getByRole("spinbutton");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "10" } });
    fireEvent.blur(input);
    expect(input).toHaveValue(30);
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "999" } });
    fireEvent.blur(input);
    expect(input).toHaveValue(300);
  });

  it("alanı temizlemeye ve ondalık değer yazmaya izin verir", () => {
    render(<Field min={1.6} max={4} initial={2.4} />);
    const input = screen.getByRole("spinbutton");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "" } });
    expect(input).toHaveValue(null);
    expect(screen.getByTestId("model-value")).toHaveTextContent("2.4");
    fireEvent.change(input, { target: { value: "3.2" } });
    expect(screen.getByTestId("model-value")).toHaveTextContent("3.2");
  });

  it("dışarıdan değişen ölçüyü düzenleme dışında gösterir", () => {
    const { rerender } = render(<NumField label="Ölçü" value={75} min={30} max={300} onChange={() => {}} />);
    rerender(<NumField label="Ölçü" value={120} min={30} max={300} onChange={() => {}} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(120);
  });
});