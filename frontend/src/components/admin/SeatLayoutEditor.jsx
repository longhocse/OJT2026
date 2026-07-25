import React, { useMemo, useState } from "react";
import { RefreshCw, Lock, Unlock, Settings, Map as MapIcon } from "lucide-react";

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
    <section aria-labelledby="seat-layout-heading" className="space-y-6 rounded-2xl bg-white p-6 md:p-8 shadow-sm border border-[#E6DFD9]">
      <div className="flex items-center gap-3 pb-4 border-b border-[#E6DFD9]">
        <div className="p-2 bg-[#B8744C]/10 rounded-xl text-[#B8744C]">
          <MapIcon className="w-5 h-5" />
        </div>
        <div>
          <h2 id="seat-layout-heading" className="text-xl font-bold text-[#3E3A39]">
            Sơ đồ ghế
          </h2>
          <p className="text-sm text-[#6B625A]">
            Tổng số ghế được tính tự động. Khóa ghế hỏng để khách không thể đặt ghế đó.
          </p>
        </div>
      </div>

      {/* Khu vực 1: Tạo sơ đồ */}
      <div className="flex flex-wrap items-end gap-4 bg-[#F9F7F5] rounded-2xl p-4 border border-[#E6DFD9]">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">Số hàng</span>
          <input
            aria-label="Số hàng ghế"
            type="number"
            min="1"
            max="26"
            value={rows}
            onChange={(event) => setRows(event.target.value)}
            className="w-20 rounded-xl border border-[#E6DFD9] bg-white p-2.5 focus:border-[#B8744C] focus:ring-2 focus:ring-[#B8744C]/20 outline-none transition text-[#3E3A39] font-medium"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">Ghế mỗi hàng</span>
          <input
            aria-label="Số ghế mỗi hàng"
            type="number"
            min="1"
            max="50"
            value={columns}
            onChange={(event) => setColumns(event.target.value)}
            className="w-28 rounded-xl border border-[#E6DFD9] bg-white p-2.5 focus:border-[#B8744C] focus:ring-2 focus:ring-[#B8744C]/20 outline-none transition text-[#3E3A39] font-medium"
          />
        </label>
        <button
          type="button"
          onClick={generate}
          disabled={invalidDimensions}
          className="flex items-center gap-2 rounded-xl bg-[#B8744C] hover:bg-[#A0653F] px-5 py-2.5 font-bold text-white shadow-md shadow-[#B8744C]/30 transition disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" /> Tạo sơ đồ
        </button>
        <span className="ml-auto text-sm font-semibold text-[#B8744C] bg-[#B8744C]/10 px-3 py-1.5 rounded-full">
          {value.length} ghế
        </span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#DC2626] font-medium bg-red-50 p-3 rounded-xl border border-red-100">
          {error.message || "Sơ đồ ghế không hợp lệ."}
        </p>
      )}

      {value.length === 0 ? (
        <div className="rounded-2xl bg-[#F9F7F5] border border-[#E6DFD9] p-10 text-center text-[#6B625A]">
          <MapIcon className="w-12 h-12 mx-auto text-[#B8744C]/40 mb-3" />
          <p className="font-medium">Hãy chọn số hàng và số ghế để tạo sơ đồ.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Khu vực 2: Chỉnh nhanh hàng loạt */}
          <section className="rounded-2xl bg-[#F9F7F5] border border-[#E6DFD9] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-4 h-4 text-[#B8744C]" />
              <h3 className="font-bold text-[#3E3A39]">Chỉnh nhanh hàng loạt</h3>
              <span className="ml-auto text-xs text-[#6B625A]">Dùng để set VIP/ghế đôi/khóa ghế theo toàn phòng, hàng hoặc khu vực</span>
            </div>

            <div className="grid gap-3 md:grid-cols-4 items-end">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">Phạm vi</span>
                <select
                  aria-label="Phạm vi chỉnh nhanh"
                  value={bulk.scope}
                  onChange={(event) => updateBulk("scope", event.target.value)}
                  className="w-full rounded-xl border border-[#E6DFD9] bg-white p-2.5 focus:border-[#B8744C] outline-none transition text-[#3E3A39] text-sm"
                >
                  <option value="all">Toàn phòng</option>
                  <option value="rows">Theo hàng</option>
                  <option value="columns">Theo số ghế</option>
                  <option value="area">Theo khu vực</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">Loại ghế</span>
                <select
                  aria-label="Loại ghế chỉnh nhanh"
                  value={bulk.type}
                  onChange={(event) => updateBulk("type", event.target.value)}
                  className="w-full rounded-xl border border-[#E6DFD9] bg-white p-2.5 focus:border-[#B8744C] outline-none transition text-[#3E3A39] text-sm"
                >
                  {seatTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">Trạng thái</span>
                <select
                  aria-label="Trạng thái ghế chỉnh nhanh"
                  value={bulk.status}
                  onChange={(event) => updateBulk("status", event.target.value)}
                  className="w-full rounded-xl border border-[#E6DFD9] bg-white p-2.5 focus:border-[#B8744C] outline-none transition text-[#3E3A39] text-sm"
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
                className="rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] px-5 py-2.5 font-bold text-white shadow-md shadow-[#DC2626]/30 transition"
              >
                Áp dụng nhanh
              </button>
            </div>

            {bulk.scope !== "all" && (
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {(bulk.scope === "rows" || bulk.scope === "area") && (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">Từ hàng</span>
                      <input
                        aria-label="Từ hàng chỉnh nhanh"
                        value={bulk.rowFrom}
                        onChange={(event) => updateBulk("rowFrom", event.target.value)}
                        className="w-full rounded-xl border border-[#E6DFD9] bg-white p-2.5 focus:border-[#B8744C] outline-none transition uppercase text-[#3E3A39] font-medium"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">Đến hàng</span>
                      <input
                        aria-label="Đến hàng chỉnh nhanh"
                        value={bulk.rowTo}
                        onChange={(event) => updateBulk("rowTo", event.target.value)}
                        className="w-full rounded-xl border border-[#E6DFD9] bg-white p-2.5 focus:border-[#B8744C] outline-none transition uppercase text-[#3E3A39] font-medium"
                      />
                    </label>
                  </>
                )}
                {(bulk.scope === "columns" || bulk.scope === "area") && (
                  <>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">Từ số ghế</span>
                      <input
                        aria-label="Từ số ghế chỉnh nhanh"
                        type="number"
                        min="1"
                        max={maxSeatNumber}
                        value={bulk.seatFrom}
                        onChange={(event) => updateBulk("seatFrom", event.target.value)}
                        className="w-full rounded-xl border border-[#E6DFD9] bg-white p-2.5 focus:border-[#B8744C] outline-none transition text-[#3E3A39] font-medium"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#6B625A]">Đến số ghế</span>
                      <input
                        aria-label="Đến số ghế chỉnh nhanh"
                        type="number"
                        min="1"
                        max={maxSeatNumber}
                        value={bulk.seatTo}
                        onChange={(event) => updateBulk("seatTo", event.target.value)}
                        className="w-full rounded-xl border border-[#E6DFD9] bg-white p-2.5 focus:border-[#B8744C] outline-none transition text-[#3E3A39] font-medium"
                      />
                    </label>
                  </>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#E6DFD9] pt-4">
              <button
                type="button"
                onClick={() => applyLastRowsPreset(2, { type: "vip", status: "available" })}
                className="rounded-xl border border-[#E6DFD9] bg-white px-4 py-2 text-sm font-medium text-[#3E3A39] hover:bg-[#B8744C]/5 hover:border-[#B8744C] transition"
              >
                2 hàng cuối VIP
              </button>
              <button
                type="button"
                onClick={() => applyLastRowsPreset(1, { type: "couple", status: "available" })}
                className="rounded-xl border border-[#E6DFD9] bg-white px-4 py-2 text-sm font-medium text-[#3E3A39] hover:bg-[#B8744C]/5 hover:border-[#B8744C] transition"
              >
                Hàng cuối ghế đôi
              </button>
              <button
                type="button"
                onClick={() => applyEdgeColumnsPreset({ type: "standard", status: "disabled" })}
                className="rounded-xl border border-[#E6DFD9] bg-white px-4 py-2 text-sm font-medium text-[#3E3A39] hover:bg-[#DC2626]/5 hover:border-[#DC2626] transition"
              >
                Khóa 2 cột biên
              </button>
              <button
                type="button"
                onClick={() => applyBulk(() => true, { type: "standard", status: "available" })}
                className="rounded-xl border border-[#E6DFD9] bg-white px-4 py-2 text-sm font-medium text-[#3E3A39] hover:bg-[#B8744C]/5 hover:border-[#B8744C] transition"
              >
                Reset toàn bộ thường/mở
              </button>
            </div>
          </section>

          {/* Khu vực 3: Sơ đồ chi tiết */}
          <div className="overflow-x-auto rounded-2xl bg-[#F9F7F5] border border-[#E6DFD9] p-6">
            <div className="mb-6 text-center text-sm font-bold uppercase tracking-widest text-[#6B625A] border-b border-[#E6DFD9] pb-4">
              MÀN HÌNH
            </div>
            <div className="min-w-max space-y-4">
              {Object.entries(seatsByRow)
                .sort(([left], [right]) => rowToNumber(left) - rowToNumber(right))
                .map(([row, entries]) => (
                  <div key={row} className="flex items-center gap-3">
                    <span className="w-8 font-bold text-[#3E3A39] text-sm bg-white rounded-lg py-1 text-center shadow-sm border border-[#E6DFD9]">{row}</span>
                    {entries
                      .sort((left, right) => left.seat.number - right.seat.number)
                      .map(({ seat, index }) => (
                        <div
                          key={seat.id || `${seat.row}-${seat.number}`}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${seat.status === "disabled"
                              ? "bg-gray-200 border border-gray-300 opacity-50 grayscale"
                              : seat.type === "vip"
                                ? "bg-[#B8744C]/10 border border-[#B8744C]/30"
                                : seat.type === "couple"
                                  ? "bg-[#FDE047]/10 border border-[#FDE047]/30"
                                  : "bg-white border border-[#E6DFD9] shadow-sm"
                            }`}
                        >
                          <span className="block text-center text-xs font-bold text-[#3E3A39]">
                            {seat.row}{seat.number}
                          </span>
                          <select
                            aria-label={`Loại ghế ${seat.row}${seat.number}`}
                            value={seat.type}
                            onChange={(event) => updateSeat(index, { type: event.target.value })}
                            className="w-20 rounded-lg border border-[#E6DFD9] bg-white text-xs p-1 text-[#3E3A39] outline-none"
                          >
                            {seatTypes.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center justify-center gap-1 text-[10px] font-medium text-[#6B625A] cursor-pointer mt-1">
                            <input
                              type="checkbox"
                              aria-label={`Khóa ghế ${seat.row}${seat.number}`}
                              checked={seat.status === "disabled"}
                              onChange={(event) =>
                                updateSeat(index, {
                                  status: event.target.checked ? "disabled" : "available",
                                })
                              }
                              className="w-3.5 h-3.5 accent-[#DC2626] rounded"
                            />
                            {seat.status === "disabled" ? <Lock className="w-3 h-3 text-[#DC2626]" /> : <Unlock className="w-3 h-3 text-[#6B625A]" />}
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