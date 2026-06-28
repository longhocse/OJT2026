import React, { useMemo, useState } from "react";

const seatTypes = [
  { value: "standard", label: "Thường" },
  { value: "vip", label: "VIP" },
  { value: "couple", label: "Ghế đôi" },
];

const statusOptions = [
  { value: "available", label: "Mở bán" },
  { value: "disabled", label: "Khóa/hỏng" },
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

const normalizeRow = (row) =>
  String(row || "")
    .trim()
    .toUpperCase();
const rowToNumber = (row) =>
  normalizeRow(row)
    .split("")
    .reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
const uniqueRows = (seats) =>
  [...new Set(seats.map((seat) => normalizeRow(seat.row)).filter(Boolean))].sort(
    (left, right) => rowToNumber(left) - rowToNumber(right),
  );

const SeatLayoutEditor = ({ value = [], onChange, error }) => {
  const [rows, setRows] = useState(5);
  const [columns, setColumns] = useState(10);
  const [bulk, setBulk] = useState({
    scope: "all",
    rowFrom: "A",
    rowTo: "A",
    seatFrom: 1,
    seatTo: 10,
    type: "vip",
    status: "available",
  });
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
  const layoutRows = useMemo(() => uniqueRows(value), [value]);
  const maxSeatNumber = useMemo(
    () => value.reduce((max, seat) => Math.max(max, Number(seat.number) || 0), 1),
    [value],
  );

  const updateSeat = (index, changes) =>
    onChange(
      value.map((seat, seatIndex) => (seatIndex === index ? { ...seat, ...changes } : seat)),
    );
  const updateBulk = (name, nextValue) => setBulk((current) => ({ ...current, [name]: nextValue }));
  const applyBulk = (predicate, changes) =>
    onChange(value.map((seat) => (predicate(seat) ? { ...seat, ...changes } : seat)));

  const buildBulkPredicate = () => {
    const rowFrom = rowToNumber(bulk.rowFrom);
    const rowTo = rowToNumber(bulk.rowTo);
    const minRow = Math.min(rowFrom, rowTo);
    const maxRow = Math.max(rowFrom, rowTo);
    const minSeat = Math.min(Number(bulk.seatFrom) || 1, Number(bulk.seatTo) || 1);
    const maxSeat = Math.max(Number(bulk.seatFrom) || 1, Number(bulk.seatTo) || 1);

    if (bulk.scope === "rows") {
      return (seat) => {
        const currentRow = rowToNumber(seat.row);
        return currentRow >= minRow && currentRow <= maxRow;
      };
    }
    if (bulk.scope === "columns") {
      return (seat) => Number(seat.number) >= minSeat && Number(seat.number) <= maxSeat;
    }
    if (bulk.scope === "area") {
      return (seat) => {
        const currentRow = rowToNumber(seat.row);
        return (
          currentRow >= minRow &&
          currentRow <= maxRow &&
          Number(seat.number) >= minSeat &&
          Number(seat.number) <= maxSeat
        );
      };
    }
    return () => true;
  };

  const applyQuickEdit = () => {
    applyBulk(buildBulkPredicate(), { type: bulk.type, status: bulk.status });
  };

  const applyLastRowsPreset = (count, changes) => {
    const targetRows = new Set(layoutRows.slice(-count));
    applyBulk((seat) => targetRows.has(normalizeRow(seat.row)), changes);
  };

  const applyEdgeColumnsPreset = (changes) => {
    applyBulk(
      (seat) => Number(seat.number) === 1 || Number(seat.number) === maxSeatNumber,
      changes,
    );
  };

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
        <div className="space-y-4">
          <section className="rounded-lg border bg-gray-50 p-4 dark:bg-gray-900">
            <h3 className="font-semibold">Chỉnh nhanh hàng loạt</h3>
            <p className="mt-1 text-sm text-gray-500">
              Dùng để set VIP/ghế đôi/khóa ghế theo toàn phòng, theo hàng hoặc theo khu vực.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <label>
                <span className="mb-1 block text-sm">Phạm vi</span>
                <select
                  aria-label="Phạm vi chỉnh nhanh"
                  value={bulk.scope}
                  onChange={(event) => updateBulk("scope", event.target.value)}
                  className="w-full rounded-lg border p-2 dark:bg-gray-700"
                >
                  <option value="all">Toàn phòng</option>
                  <option value="rows">Theo hàng</option>
                  <option value="columns">Theo số ghế</option>
                  <option value="area">Theo khu vực</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm">Loại ghế</span>
                <select
                  aria-label="Loại ghế chỉnh nhanh"
                  value={bulk.type}
                  onChange={(event) => updateBulk("type", event.target.value)}
                  className="w-full rounded-lg border p-2 dark:bg-gray-700"
                >
                  {seatTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm">Trạng thái</span>
                <select
                  aria-label="Trạng thái ghế chỉnh nhanh"
                  value={bulk.status}
                  onChange={(event) => updateBulk("status", event.target.value)}
                  className="w-full rounded-lg border p-2 dark:bg-gray-700"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={applyQuickEdit}
                className="self-end rounded-lg bg-yellow-500 px-4 py-2 font-semibold text-gray-950"
              >
                Áp dụng nhanh
              </button>
            </div>
            {bulk.scope !== "all" && (
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {(bulk.scope === "rows" || bulk.scope === "area") && (
                  <>
                    <label>
                      <span className="mb-1 block text-sm">Từ hàng</span>
                      <input
                        aria-label="Từ hàng chỉnh nhanh"
                        value={bulk.rowFrom}
                        onChange={(event) => updateBulk("rowFrom", event.target.value)}
                        className="w-full rounded-lg border p-2 uppercase dark:bg-gray-700"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-sm">Đến hàng</span>
                      <input
                        aria-label="Đến hàng chỉnh nhanh"
                        value={bulk.rowTo}
                        onChange={(event) => updateBulk("rowTo", event.target.value)}
                        className="w-full rounded-lg border p-2 uppercase dark:bg-gray-700"
                      />
                    </label>
                  </>
                )}
                {(bulk.scope === "columns" || bulk.scope === "area") && (
                  <>
                    <label>
                      <span className="mb-1 block text-sm">Từ số ghế</span>
                      <input
                        aria-label="Từ số ghế chỉnh nhanh"
                        type="number"
                        min="1"
                        max={maxSeatNumber}
                        value={bulk.seatFrom}
                        onChange={(event) => updateBulk("seatFrom", event.target.value)}
                        className="w-full rounded-lg border p-2 dark:bg-gray-700"
                      />
                    </label>
                    <label>
                      <span className="mb-1 block text-sm">Đến số ghế</span>
                      <input
                        aria-label="Đến số ghế chỉnh nhanh"
                        type="number"
                        min="1"
                        max={maxSeatNumber}
                        value={bulk.seatTo}
                        onChange={(event) => updateBulk("seatTo", event.target.value)}
                        className="w-full rounded-lg border p-2 dark:bg-gray-700"
                      />
                    </label>
                  </>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyLastRowsPreset(2, { type: "vip", status: "available" })}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                2 hàng cuối VIP
              </button>
              <button
                type="button"
                onClick={() => applyLastRowsPreset(1, { type: "couple", status: "available" })}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Hàng cuối ghế đôi
              </button>
              <button
                type="button"
                onClick={() => applyEdgeColumnsPreset({ type: "standard", status: "disabled" })}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Khóa 2 cột biên
              </button>
              <button
                type="button"
                onClick={() => applyBulk(() => true, { type: "standard", status: "available" })}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Reset toàn bộ thường/mở
              </button>
            </div>
          </section>

          <div className="overflow-x-auto rounded-lg bg-gray-100 p-4 dark:bg-gray-950">
            <div className="mb-8 text-center text-sm font-medium text-gray-500">MÀN HÌNH</div>
            <div className="min-w-max space-y-3">
              {Object.entries(seatsByRow)
                .sort(([left], [right]) => rowToNumber(left) - rowToNumber(right))
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
        </div>
      )}
    </section>
  );
};

export default SeatLayoutEditor;
