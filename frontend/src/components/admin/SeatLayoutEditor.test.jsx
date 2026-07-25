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

test("applies bulk seat type and status changes by range and presets", () => {
  const onChange = jest.fn();
  const layout = generateSeatLayout(4, 4);
  const { rerender } = render(<SeatLayoutEditor value={layout} onChange={onChange} />);

  fireEvent.change(screen.getByLabelText("Phạm vi chỉnh nhanh"), { target: { value: "rows" } });
  fireEvent.change(screen.getByLabelText("Từ hàng chỉnh nhanh"), { target: { value: "C" } });
  fireEvent.change(screen.getByLabelText("Đến hàng chỉnh nhanh"), { target: { value: "D" } });
  fireEvent.change(screen.getByLabelText("Loại ghế chỉnh nhanh"), { target: { value: "vip" } });
  fireEvent.click(screen.getByRole("button", { name: "Áp dụng nhanh" }));

  const rowUpdated = onChange.mock.calls.at(-1)[0];
  expect(rowUpdated.filter((seat) => ["C", "D"].includes(seat.row))).toEqual(
    expect.arrayContaining([expect.objectContaining({ type: "vip", status: "available" })]),
  );
  expect(rowUpdated.find((seat) => seat.row === "A" && seat.number === 1)).toMatchObject({
    type: "standard",
  });

  rerender(<SeatLayoutEditor value={rowUpdated} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Hàng cuối ghế đôi" }));
  const presetUpdated = onChange.mock.calls.at(-1)[0];
  expect(presetUpdated.filter((seat) => seat.row === "D")).toEqual(
    expect.arrayContaining([expect.objectContaining({ type: "couple", status: "available" })]),
  );

  rerender(<SeatLayoutEditor value={presetUpdated} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Khóa 2 cột biên" }));
  const edgeUpdated = onChange.mock.calls.at(-1)[0];
  expect(edgeUpdated.filter((seat) => seat.number === 1 || seat.number === 4)).toEqual(
    expect.arrayContaining([expect.objectContaining({ status: "disabled" })]),
  );
});
