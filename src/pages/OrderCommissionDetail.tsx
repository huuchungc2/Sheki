import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, DollarSign, ShoppingCart, Package, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

export function OrderCommissionDetail() {
  const { userId, orderId } = useParams();
  const [order, setOrder] = React.useState<any>(null);
  const [items, setItems] = React.useState<any[]>([]);
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [orderRes, userRes] = await Promise.all([
          fetch(`${API_URL}/orders/${orderId}`, { headers }),
          fetch(`${API_URL}/users/${userId}`, { headers }),
        ]);

        if (!orderRes.ok) throw new Error("Không thể tải đơn hàng");

        const orderData = await orderRes.json();
        const userData = await userRes.json();

        setOrder(orderData.data);
        setItems(orderData.data.items || []);
        setUser(userData.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, orderId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive/80 mb-4" />
          <p className="text-destructive font-semibold">{error}</p>
          <Link to={`/reports/commissions/${userId}`} className="mt-4 inline-flex items-center justify-center h-10 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-95 transition-opacity">Quay lại</Link>
        </div>
      </div>
    );
  }

  const totalCommission = items.reduce((sum, item) => sum + (parseFloat(item.commission_amount) || 0), 0);

  const statusLabel = order?.status === 'done' ? 'Hoàn thành' : order?.status === 'cancelled' ? 'Đã hủy' : order?.status === 'shipping' ? 'Đang giao' : order?.status === 'confirmed' ? 'Đã xác nhận' : 'Nháp';
  const statusColor =
    order?.status === "done"
      ? "bg-accent text-accent-foreground border border-border"
      : order?.status === "cancelled"
        ? "bg-destructive/10 text-destructive border border-destructive/30"
        : "bg-muted text-muted-foreground border border-border";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to={`/reports/commissions/${userId}`} className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Chi tiết hoa hồng: {order?.code}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Nhân viên: {user?.full_name} • Ngày: {formatDate(order?.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mã đơn</p>
          <p className="text-lg font-semibold text-foreground mt-1">{order?.code}</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tổng tiền đơn</p>
          <p className="text-lg font-semibold text-foreground mt-1">{formatCurrency(order?.total_amount || 0)}</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tổng hoa hồng</p>
          <p className="text-lg font-semibold text-foreground mt-1">{formatCurrency(totalCommission)}</p>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trạng thái</p>
          <div className="mt-1">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Chi tiết sản phẩm và hoa hồng</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sản phẩm</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">SL</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Đơn giá</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Giảm giá</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Thành tiền</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Tỷ lệ HH</th>
                <th className="px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Hoa hồng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">{item.sku}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-foreground">{item.qty} {item.unit || ''}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-foreground">{formatCurrency(item.unit_price)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.discount_rate > 0 ? (
                      <span className="text-sm text-destructive">-{item.discount_rate}% ({formatCurrency(item.discount_amount)})</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-foreground">{formatCurrency(item.subtotal)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-muted-foreground">{item.commission_rate}%</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-foreground">{formatCurrency(item.commission_amount)}</span>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">Không có sản phẩm</td></tr>
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-muted/30 border-t border-border">
                  <td colSpan={7} className="px-6 py-4 text-right">
                    <span className="text-sm font-semibold text-foreground uppercase">Tổng hoa hồng đơn hàng</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-base font-semibold text-foreground">{formatCurrency(totalCommission)}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
