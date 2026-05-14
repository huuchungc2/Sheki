import * as React from "react";
import { Calendar } from "lucide-react";
import { cn, composeIsoDate, localTodayIsoDate, splitIsoDate } from "../lib/utils";

export type GregorianDateSelectProps = {
  value: string;
  onChange: (iso: string) => void;
  /** Cho phép trống (vd. lọc Từ/Đến); chọn đủ N/T/N mới gửi yyyy-mm-dd, xoá hết → "" */
  allowEmpty?: boolean;
  yearMin?: number;
  yearMax?: number;
  className?: string;
  /** Bỏ icon lịch (vd. ô trong popover hẹp) */
  hideIcon?: boolean;
  /** Xếp Ngày / Tháng / Năm theo cột (tránh tràn ngang trên mobile) */
  stacked?: boolean;
  /** Tháng chỉ hiển thị số 1–12 (gọn trong lưới 3 cột) */
  monthNumericOptions?: boolean;
  /** Class thêm vào mỗi select */
  selectClassName?: string;
};

function maxDayFor(y: string, m: string): number {
  const yi = parseInt(y, 10);
  const mi = parseInt(m, 10);
  if (!y || !m || Number.isNaN(yi) || Number.isNaN(mi) || mi < 1 || mi > 12) return 31;
  return new Date(yi, mi, 0).getDate();
}

export function GregorianDateSelect({
  value,
  onChange,
  allowEmpty = false,
  yearMin,
  yearMax,
  className,
  hideIcon = false,
  stacked = false,
  monthNumericOptions = false,
  selectClassName,
}: GregorianDateSelectProps) {
  const fb = React.useMemo(() => splitIsoDate(localTodayIsoDate()), []);

  const [y, setY] = React.useState(() => {
    const p = splitIsoDate(value);
    if (allowEmpty) return p.y;
    return p.y || fb.y;
  });
  const [m, setM] = React.useState(() => {
    const p = splitIsoDate(value);
    if (allowEmpty) return p.m;
    return p.m || fb.m;
  });
  const [d, setD] = React.useState(() => {
    const p = splitIsoDate(value);
    if (allowEmpty) return p.d;
    return p.d || fb.d;
  });

  React.useEffect(() => {
    const p = splitIsoDate(value);
    if (allowEmpty) {
      setY(p.y);
      setM(p.m);
      setD(p.d);
    } else {
      setY(p.y || fb.y);
      setM(p.m || fb.m);
      setD(p.d || fb.d);
    }
  }, [value, allowEmpty, fb.y, fb.m, fb.d]);

  const maxDay = React.useMemo(() => maxDayFor(y, m), [y, m]);

  const yearOptions = React.useMemo(() => {
    const cy = new Date().getFullYear();
    const hi = yearMax ?? cy + 1;
    const lo = yearMin ?? cy - 15;
    const out: number[] = [];
    for (let yy = hi; yy >= lo; yy--) out.push(yy);
    return out;
  }, [yearMin, yearMax]);

  const emit = (ny: string, nm: string, nd: string) => {
    if (allowEmpty) {
      if (!ny || !nm || !nd) {
        onChange("");
        return;
      }
      onChange(composeIsoDate(ny, nm, nd));
      return;
    }
    const out = composeIsoDate(ny || fb.y, nm || fb.m, nd || fb.d);
    onChange(out || localTodayIsoDate());
  };

  const baseSelect = cn(
    "w-full min-w-0 px-2 py-2.5 bg-slate-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm outline-none",
    selectClassName
  );

  const monthOptionLabel = (n: number) =>
    monthNumericOptions ? String(n) : `Tháng ${n}`;

  return (
    <div className={cn("relative min-w-0 max-w-full", className)}>
      {!hideIcon && (
        <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-[1]" />
      )}
      <div
        className={cn(
          stacked ? "flex flex-col gap-1" : "grid grid-cols-3 gap-1.5",
          !hideIcon && !stacked && "pl-10"
        )}
      >
        <select
          value={d}
          onChange={(e) => {
            const nd = e.target.value;
            setD(nd);
            emit(y, m, nd);
          }}
          className={cn(baseSelect, "appearance-none")}
        >
          {allowEmpty && <option value="">Ngày</option>}
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
        <select
          value={m}
          onChange={(e) => {
            const nm = e.target.value;
            setM(nm);
            const cap = maxDayFor(y, nm);
            const di = parseInt(d, 10);
            let nd = d;
            if (d && !Number.isNaN(di) && di > cap) {
              nd = String(cap);
              setD(nd);
            }
            emit(y, nm, nd);
          }}
          className={baseSelect}
        >
          {allowEmpty && <option value="">Tháng</option>}
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={String(n)}>
              {monthOptionLabel(n)}
            </option>
          ))}
        </select>
        <select
          value={y}
          onChange={(e) => {
            const ny = e.target.value;
            setY(ny);
            const cap = maxDayFor(ny, m);
            const di = parseInt(d, 10);
            let nd = d;
            if (d && !Number.isNaN(di) && di > cap) {
              nd = String(cap);
              setD(nd);
            }
            emit(ny, m, nd);
          }}
          className={baseSelect}
        >
          {allowEmpty && <option value="">Năm</option>}
          {yearOptions.map((yy) => (
            <option key={yy} value={String(yy)}>
              {yy}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
