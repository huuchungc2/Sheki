import * as React from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate, cn } from "../lib/utils";
import { Loader2, AlertCircle, Package, ArrowRight } from "lucide-react";

type ReturnRow = {
  id: number;
  order_id: number;
  order_code: string;
  warehouse_name: string | null;
  created_by_name: string;
  note: string | null;
  created_at: string;
  items: { product_id: number; product_name: string; sku: string; qty: number }[];
};

export function SalesReturnsList() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ReturnRow[]>([]);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.get("/returns?limit=100");
      setRows(res?.data ?? []);
    } catch (e: any) {
      setError(e?.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-500 font-medium">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Đơn hoàn</h1>
          <p className="text-sm text-slate-500 mt-1">
            Danh sách đơn hoàn liên quan đơn hàng của bạn (chỉ xem).
          </p>
        </div>
        <button
          onClick={fetchData}
          className="text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          Làm mới
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <Package className="w-10 h-10 mx-auto mb-2 text-slate-200" />
            Chưa có đơn hoàn nào
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {rows.map((r) => (
              <div key={r.id} className="p-5 hover:bg-slate-50/50">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Đơn hoàn #{r.id}{" "}
                      <span className="text-xs font-medium text-slate-400">
                        ({formatDate(r.created_at)})
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đơn gốc:{" "}
                      <span className="font-mono font-semibold text-slate-700">{r.order_code}</span>
                      {r.warehouse_name ? (
                        <> • Kho nhập: <span className="font-semibold">{r.warehouse_name}</span></>
                      ) : null}
                      {r.created_by_name ? (
                        <> • Xử lý: <span className="font-semibold">{r.created_by_name}</span></>
                      ) : null}
                    </p>
                    {r.note && (
                      <p className="text-xs text-slate-500 mt-1">Ghi chú: {r.note}</p>
                    )}
                  </div>
                  <Link
                    to={`/orders/edit/${r.order_id}`}
                    className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    Xem đơn gốc <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(r.items || []).map((it, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700 truncate">{it.product_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{it.sku}</p>
                      </div>
                      <span className="font-bold text-slate-800">{it.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
