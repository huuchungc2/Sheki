import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { BarChart3, Loader2, AlertCircle } from "lucide-react";
import { cn, formatCurrency } from "../lib/utils";

const API_URL = "http://localhost:3000/api";

export function CollaboratorsCommissionReport() {
  const { id } = useParams();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/users/${id}/collaborators/commissions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Không thể tải báo cáo CTV");
        const json = await res.json();
        setRows(json.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><BarChart3 className="w-4 h-4" /></span>
        <h2 className="text-xl font-bold text-slate-900">Báo cáo hoa hồng từ Cộng tác viên</h2>
      </div>
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Cộng tác viên</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng hoa hồng</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Số đơn</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">Chưa có dữ liệu</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.collaborator_id} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">{r.collaborator_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}</span>
                    <span className="font-medium text-slate-800">{r.collaborator_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">{formatCurrency(r.total_commission || 0)}</td>
                <td className="px-4 py-3 text-right">{r.total_orders || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
