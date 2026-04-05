import * as React from 'react'
import { api } from '../lib/api'
import { formatCurrency } from '../lib/utils'

type Row = {
  collaborator_id: number
  collaborator_name: string
  total_commission: number
  total_orders: number
  total_revenue: number
}

export default function CollaboratorsCommissionsReport() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await api.get('/collaborators/commissions/all')
        setRows(res.data || [])
      } catch (e: any) {
        setError(e?.message ?? 'Lỗi tải dữ liệu')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Báo cáo hoa hồng từ CTV</h1>
      <p className="text-sm text-slate-600">Tổng hợp hoa hồng từ các CTV trên toàn hệ thống (theo thời gian hiện tại: tổng hợp theo dữ liệu từ DB)</p>
      {loading && <div>Đang tải...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        rows.length > 0 ? (
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2 text-left">Cộng tác viên</th>
                <th className="px-4 py-2 text-right">Tổng hoa hồng</th>
                <th className="px-4 py-2 text-right">Tổng đơn</th>
                <th className="px-4 py-2 text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.collaborator_id} className="border-b border-slate-200">
                  <td className="px-4 py-2">{r.collaborator_name}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.total_commission || 0)}</td>
                  <td className="px-4 py-2 text-right">{r.total_orders ?? 0}</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(r.total_revenue || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center text-slate-500">Chưa có dữ liệu hoa hồng từ CTV</div>
        )
      )}
    </div>
  )
}
