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
    <div className="max-w-2xl mx-auto space-y-8 min-w-0">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-lg text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Thông tin cá nhân</h1>
          <p className="text-muted-foreground text-sm mt-1">Cập nhật thông tin nhân viên đang đăng nhập.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl flex items-center gap-3 text-destructive text-sm font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-700 text-sm font-semibold dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Đã cập nhật thông tin.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
      <form onSubmit={submit} className="bg-card p-8 rounded-2xl border border-border shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-foreground">Họ và tên</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                className="w-full h-11 pl-10 pr-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Họ tên"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Số điện thoại</label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                inputMode="numeric"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: cleanPhone(e.target.value) }))}
                className="w-full h-11 pl-10 pr-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="0912345678"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full h-11 pl-10 pr-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="email@domain.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Phòng ban</label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={form.department}
                onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                className="w-full h-11 pl-10 pr-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Kinh doanh"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Chức vụ</label>
            <div className="relative">
              <BadgeCheck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={form.position}
                onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                className="w-full h-11 pl-10 pr-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Nhân viên"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Ngày vào làm</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-[1]" />
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
            <p className="text-[11px] text-muted-foreground">Có thể để trống.</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-semibold text-foreground">Địa chỉ</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                className="w-full h-11 pl-10 pr-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                placeholder="Số nhà, tên đường"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Tỉnh/TP</label>
            <input
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
              className="w-full h-11 px-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="VD: Thành phố Hà Nội"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Quận/Huyện</label>
            <input
              value={form.district}
              onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
              className="w-full h-11 px-4 bg-background border border-input rounded-md text-sm font-medium text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="VD: Cầu Giấy"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className={cn(
            "w-full h-11 flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors shadow-sm",
            saving ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-95 transition-opacity"
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

