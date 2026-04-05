import * as React from "react";
import { Search, Calendar, Filter, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, formatCurrency, formatDate } from "../lib/utils";

const API_BASE = "http://localhost:3000/api";

interface Order {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: string;
}

interface ApiResponse {
  data: Order[];
  total: number;
}

interface OrderSearchProps {
  title: string;
  description: string;
  type: "day" | "month" | "year" | "range";
}

function OrderSearchBase({ title, description, type }: OrderSearchProps) {
  const navigate = useNavigate();
  const [orders, setOrders] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const limit = 20;

  const [day, setDay] = React.useState("2026-04-03");
  const [month, setMonth] = React.useState("2026-04");
  const [year, setYear] = React.useState("2026");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");

  const buildQuery = React.useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("limit", String(limit));

    // API /orders nhận date_from/date_to (không phải startDate/endDate)
    if (type === "day") {
      params.set("date_from", day);
      params.set("date_to", day);
    } else if (type === "month") {
      const [y, m] = month.split("-");
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      params.set("date_from", `${y}-${m}-01`);
      params.set("date_to", `${y}-${m}-${String(lastDay).padStart(2, "0")}`);
    } else if (type === "year") {
      params.set("date_from", `${year}-01-01`);
      params.set("date_to", `${year}-12-31`);
    } else if (type === "range") {
      if (fromDate) params.set("date_from", fromDate);
      if (toDate)   params.set("date_to", toDate);
    }

    return params.toString();
  }, [type, day, month, year, fromDate, toDate, search, status, page]);

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const query = buildQuery();
      const res = await fetch(`${API_BASE}/orders?${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const json: ApiResponse = await res.json();
      setOrders(json.data);
      setTotal(json.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending:   { label: "Chờ duyệt", color: "bg-amber-50 text-amber-600" },
    shipping:  { label: "Đang giao", color: "bg-blue-50 text-blue-600" },
    completed: { label: "Đã giao",   color: "bg-emerald-50 text-emerald-600" },
    cancelled: { label: "Đã hủy",   color: "bg-red-50 text-red-500" },
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
          <p className="text-slate-500 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold uppercase tracking-wider">
            Chế độ: {type === "day" ? "Ngày" : type === "month" ? "Tháng" : type === "year" ? "Năm" : "Khoảng thời gian"}
          </div>
        </div>
      </div>

      {/* Search Controls */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {type === "day" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chọn ngày</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
            )}

            {type === "month" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chọn tháng</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none"
                  />
                </div>
              </div>
            )}

            {type === "year" && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chọn năm</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none"
                >
                  <option>2026</option>
                  <option>2025</option>
                  <option>2024</option>
                </select>
              </div>
            )}

            {type === "range" && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Từ ngày</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đến ngày</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-2xl text-sm transition-all outline-none"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 rounded-2xl text-sm outline-none">
                <option value="">Tất cả</option>
                <option value="pending">Chờ duyệt</option>
                <option value="shipping">Đang giao</option>
                <option value="completed">Đã giao</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Đang tìm..." : "Tìm kiếm"}
            </button>
          </div>
        </div>
      </form>

      {/* Results */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-bold text-slate-900">
            Kết quả tìm kiếm ({orders.length} / {total})
          </h2>
          <button className="flex items-center gap-2 text-slate-500 text-sm font-bold hover:text-slate-700 transition-all">
            <Filter className="w-4 h-4" />
            Bộ lọc nâng cao
          </button>
        </div>

        {loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="text-sm font-medium">Đang tải dữ liệu...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <AlertCircle className="w-10 h-10 mb-4" />
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={fetchOrders}
              className="mt-4 px-6 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Search className="w-10 h-10 mb-4" />
            <p className="text-sm font-medium">Không tìm thấy đơn hàng nào</p>
          </div>
        )}

        {!loading && orders.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Mã đơn hàng</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Khách hàng</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Ngày đặt</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng tiền</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((order: any) => {
                    const st = statusConfig[order.status] || { label: order.status, color: "bg-slate-100 text-slate-500" };
                    return (
                      <tr key={order.id}
                        className="hover:bg-slate-50/50 transition-all group cursor-pointer"
                        onClick={() => navigate(`/orders/edit/${order.id}`)}
                      >
                        <td className="px-8 py-5">
                          <span className="text-sm font-mono font-bold text-blue-600">{order.code || `#${order.id}`}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                              {(order.customer_name || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{order.customer_name || "—"}</p>
                              <p className="text-xs text-slate-400">{order.customer_phone || ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm text-slate-500">
                          {order.created_at ? formatDate(order.created_at) : "—"}
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-slate-900">
                          {formatCurrency(order.total_amount || 0)}
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full", st.color)}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all">
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > limit && (
              <div className="flex items-center justify-center gap-2 p-6 border-t border-slate-100">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-4 py-2 text-sm font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Trước
                </button>
                <span className="text-sm font-bold text-slate-500">Trang {page}</span>
                <button
                  disabled={page * limit >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-4 py-2 text-sm font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Sau
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function OrderSearchDay() {
  return <OrderSearchBase title="Tìm kiếm theo ngày" description="Tra cứu các đơn hàng phát sinh trong một ngày cụ thể." type="day" />;
}

export function OrderSearchMonth() {
  return <OrderSearchBase title="Tìm kiếm theo tháng" description="Tra cứu các đơn hàng phát sinh trong một tháng cụ thể." type="month" />;
}

export function OrderSearchYear() {
  return <OrderSearchBase title="Tìm kiếm theo năm" description="Tra cứu các đơn hàng phát sinh trong một năm cụ thể." type="year" />;
}

export function OrderSearchRange() {
  return <OrderSearchBase title="Tìm kiếm theo khoảng thời gian" description="Tra cứu các đơn hàng phát sinh trong một khoảng thời gian tùy chọn." type="range" />;
}
