import { fireEvent, render, screen } from "@testing-library/react";
import SeatLayoutEditor, { generateSeatLayout } from "./SeatLayoutEditor";

test("generates a visual seat layout and lets admin change type and lock broken seats", () => {
  expect(generateSeatLayout(2, 2)).toEqual([
    { row: "A", number: 1, type: "standard", status: "available" },
    { row: "A", number: 2, type: "standard", status: "available" },
    { row: "B", number: 1, type: "standard", status: "available" },
    { row: "B", number: 2, type: "standard", status: "available" },
  ]);

  const onChange = jest.fn();
  const { rerender } = render(<SeatLayoutEditor value={[]} onChange={onChange} />);
  fireEvent.change(screen.getByLabelText("Số hàng ghế"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Số ghế mỗi hàng"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Tạo sơ đồ" }));
  const generated = onChange.mock.calls[0][0];
  expect(generated).toHaveLength(4);

  rerender(<SeatLayoutEditor value={generated} onChange={onChange} />);
  fireEvent.change(screen.getByLabelText("Loại ghế A1"), { target: { value: "vip" } });
  expect(onChange.mock.calls.at(-1)[0][0]).toMatchObject({ type: "vip" });
  fireEvent.click(screen.getByLabelText("Khóa ghế A1"));
  expect(onChange.mock.calls.at(-1)[0][0]).toMatchObject({ status: "disabled" });
});
