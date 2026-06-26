import React, { useMemo, useState } from "react";

const seatTypes = [
  { value: "standard", label: "Thường" },
  { value: "vip", label: "VIP" },
  { value: "couple", label: "Ghế đôi" },
];

export const generateSeatLayout = (rows, columns) =>
  Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: columns }, (_, columnIndex) => ({
      row: String.fromCharCode(65 + rowIndex),
      number: columnIndex + 1,
      type: "standard",
      status: "available",
    })),
  ).flat();

const SeatLayoutEditor = ({ value = [], onChange, error }) => {
  const [rows, setRows] = useState(5);
  const [columns, setColumns] = useState(10);
  const seatsByRow = useMemo(
    () =>
      value.reduce((result, seat, index) => {
        const row = seat.row || "?";
        if (!result[row]) result[row] = [];
        result[row].push({ seat, index });
        return result;
      }, {}),
    [value],
  );

  const updateSeat = (index, changes) =>
    onChange(
      value.map((seat, seatIndex) => (seatIndex === index ? { ...seat, ...changes } : seat)),
    );

  const generate = () => {
    if (value.length > 0 && !window.confirm("Tạo lại sơ đồ sẽ thay thế cấu hình ghế hiện tại.")) {
      return;
    }
    onChange(generateSeatLayout(Number(rows), Number(columns)));
  };

  const invalidDimensions =
    !Number.isInteger(Number(rows)) ||
    !Number.isInteger(Number(columns)) ||
    rows < 1 ||
    rows > 26 ||
    columns < 1 ||
    columns > 50 ||
    rows * columns > 1000;

  return (
    <section aria-labelledby="seat-layout-heading" className="space-y-5 rounded-xl border p-4">
      <div>
        <h2 id="seat-layout-heading" className="text-lg font-semibold">
          Sơ đồ ghế
        </h2>
        <p className="text-sm text-gray-500">
          Tổng số ghế được tính tự động. Khóa ghế hỏng để khách không thể đặt ghế đó.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label>
          <span className="mb-1 block text-sm">Số hàng</span>
          <input
            aria-label="Số hàng ghế"
            type="number"
            min="1"
            max="26"
            value={rows}
            onChange={(event) => setRows(event.target.value)}
            className="w-24 rounded-lg border p-2 dark:bg-gray-700"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm">Ghế mỗi hàng</span>
          <input
            aria-label="Số ghế mỗi hàng"
            type="number"
            min="1"
            max="50"
            value={columns}
            onChange={(event) => setColumns(event.target.value)}
            className="w-32 rounded-lg border p-2 dark:bg-gray-700"
          />
        </label>
        <button
          type="button"
          onClick={generate}
          disabled={invalidDimensions}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
        >
          Tạo sơ đồ
        </button>
        <span className="text-sm text-gray-500">{value.length} ghế</span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error.message || "Sơ đồ ghế không hợp lệ."}
        </p>
      )}

      {value.length === 0 ? (
        <p className="rounded-lg bg-gray-100 p-6 text-center text-gray-500 dark:bg-gray-700">
          Hãy chọn số hàng và số ghế để tạo sơ đồ.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-gray-100 p-4 dark:bg-gray-950">
          <div className="mb-8 text-center text-sm font-medium text-gray-500">MÀN HÌNH</div>
          <div className="min-w-max space-y-3">
            {Object.entries(seatsByRow)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([row, entries]) => (
                <div key={row} className="flex items-center gap-2">
                  <span className="w-7 font-semibold">{row}</span>
                  {entries
                    .sort((left, right) => left.seat.number - right.seat.number)
                    .map(({ seat, index }) => (
                      <div
                        key={seat.id || `${seat.row}-${seat.number}`}
                        className={`rounded-t-lg border p-1 ${
                          seat.status === "disabled"
                            ? "bg-gray-500 opacity-60"
                            : "bg-white dark:bg-gray-800"
                        }`}
                      >
                        <span className="block text-center text-xs font-semibold">
                          {seat.row}
                          {seat.number}
                        </span>
                        <select
                          aria-label={`Loại ghế ${seat.row}${seat.number}`}
                          value={seat.type}
                          onChange={(event) => updateSeat(index, { type: event.target.value })}
                          className="mt-1 w-20 rounded border bg-transparent text-xs"
                        >
                          {seatTypes.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <label className="mt-1 flex items-center justify-center gap-1 text-[11px]">
                          <input
                            type="checkbox"
                            aria-label={`Khóa ghế ${seat.row}${seat.number}`}
                            checked={seat.status === "disabled"}
                            onChange={(event) =>
                              updateSeat(index, {
                                status: event.target.checked ? "disabled" : "available",
                              })
                            }
                          />
                          Khóa
                        </label>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default SeatLayoutEditor;
