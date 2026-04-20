import * as React from "react";
import { ArrowLeft, Save, User, Phone, Mail, Building2, BadgeCheck, Loader2, AlertCircle, CheckCircle2, MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { GregorianDateSelect } from "../components/GregorianDateSelect";

const API_URL = (import.meta as any)?.env?.VITE_API_URL || "/api";

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function Profile() {
  const navigate = useNavigate();
  const [form, setForm] = React.useState(() => {
    const u = getStoredUser();
    return {
      full_name: String(u?.full_name ?? ""),
      phone: String(u?.phone ?? ""),
      email: String(u?.email ?? ""),
      department: String(u?.department ?? ""),
      position: String(u?.position ?? ""),
      join_date: String(u?.join_date ?? ""),
      address: String(u?.address ?? ""),
      city: String(u?.city ?? ""),
      district: String(u?.district ?? ""),
    };
  });
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const cleanPhone = (s: string) => String(s || "").replace(/\D/g, "").slice(0, 10);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/users/me`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || "Không thể tải thông tin tài khoản");
        if (cancelled) return;
        const u = body?.data || {};
        setForm({
          full_name: String(u?.full_name ?? ""),
          phone: String(u?.phone ?? ""),
          email: String(u?.email ?? ""),
          department: String(u?.department ?? ""),
          position: String(u?.position ?? ""),
          join_date: String(u?.join_date ? String(u.join_date).slice(0, 10) : ""),
          address: String(u?.address ?? ""),
          city: String(u?.city ?? ""),
          district: String(u?.district ?? ""),
        });
        const prev = getStoredUser() || {};
        localStorage.setItem("user", JSON.stringify({ ...prev, ...u }));
        window.dispatchEvent(new Event("auth-change"));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Không thể tải thông tin tài khoản");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const full = form.full_name.trim();
    const phone = cleanPhone(form.phone);
    const email = form.email.trim();
    if (!full) return setError("Vui lòng nhập họ tên");
    if (phone && phone.length !== 10) return setError("Số điện thoại phải có đúng 10 chữ số");
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return setError("Email không hợp lệ");
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          full_name: full,
          phone: phone || null,
          email: email || null,
          department: form.department.trim() || null,
          position: form.position.trim() || null,
          join_date: form.join_date.trim() ? form.join_date.trim().slice(0, 10) : null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          district: form.district.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Cập nhật thất bại");
      if (body?.data) {
        const prev = getStoredUser() || {};
        const next = { ...prev, ...body.data };
        localStorage.setItem("user", JSON.stringify(next));
        window.dispatchEvent(new Event("auth-change"));
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Thông tin cá nhân</h1>
          <p className="text-slate-500 text-sm mt-1">Cập nhật thông tin nhân viên đang đăng nhập.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Đã cập nhật thông tin.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
      <form onSubmit={submit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-700">Họ và tên</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                placeholder="Họ tên"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Số điện thoại</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: cleanPhone(e.target.value) }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                placeholder="0912345678"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                placeholder="email@domain.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Phòng ban</label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.department}
                onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                placeholder="Kinh doanh"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Chức vụ</label>
            <div className="relative">
              <BadgeCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                placeholder="Nhân viên"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Ngày vào làm</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-[1]" />
              <div className="pl-8">
                <GregorianDateSelect
                  value={form.join_date}
                  onChange={(iso) => setForm((p) => ({ ...p, join_date: iso }))}
                  allowEmpty
                  yearMin={1990}
                  yearMax={new Date().getFullYear()}
                  hideIcon
                  monthNumericOptions
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Có thể để trống.</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-700">Địa chỉ</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
                placeholder="Số nhà, tên đường"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Tỉnh/TP</label>
            <input
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
              placeholder="VD: Thành phố Hà Nội"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Quận/Huyện</label>
            <input
              value={form.district}
              onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
              className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-sm transition-all outline-none"
              placeholder="VD: Cầu Giấy"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-lg",
            saving ? "bg-slate-200 text-slate-500" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20"
          )}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Đang lưu..." : "Lưu thông tin"}
        </button>
      </form>
      )}
    </div>
  );
}

