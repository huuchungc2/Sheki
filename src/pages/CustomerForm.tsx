import * as React from "react";
import {
  ArrowLeft, Save, User, Phone, Mail, MapPin, Calendar, Star,
  Info, CreditCard, History, Loader2, AlertTriangle, CheckCircle, ShoppingCart
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import locationsData from "../lib/vietnam-locations-simple.json";
import { GregorianDateSelect } from "../components/GregorianDateSelect";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";
const LOCATIONS = locationsData as any;

/** DB/API → yyyy-mm-dd */
function birthdayToInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return String(iso).split("T")[0].trim().slice(0, 10);
}

function getDefaultCustomerForm() {
  let uid = "";
  try {
    const raw = localStorage.getItem("user");
    if (raw) uid = String(JSON.parse(raw).id ?? "");
  } catch { /* ignore */ }
  return {
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    district: "",
    ward: "",
    birthday: "",
    tier: "new",
    source: "zalo",
    assigned_employee_id: uid,
    note: "",
  };
}

// Parse old address string to extract city/district/ward
function parseAddress(fullAddress: string): { city?: string; district?: string; ward?: string; street?: string } {
  const result: { city?: string; district?: string; ward?: string; street?: string } = {};
  const addr = fullAddress.toLowerCase();
  
  const cities = Object.keys(LOCATIONS);
  for (const city of cities) {
    if (addr.includes(city.toLowerCase())) {
      result.city = city;
      break;
    }
  }
  if (!result.city) {
    const shortMap: Record<string, string> = {
      'hà nội': 'Thành phố Hà Nội', 'hn': 'Thành phố Hà Nội',
      'hcm': 'Thành phố Hồ Chí Minh', 'tp hcm': 'Thành phố Hồ Chí Minh',
      'tp.hcm': 'Thành phố Hồ Chí Minh', 'sài gòn': 'Thành phố Hồ Chí Minh',
      'saigon': 'Thành phố Hồ Chí Minh',
      'đà nẵng': 'Thành phố Đà Nẵng', 'danang': 'Thành phố Đà Nẵng',
      'hải phòng': 'Thành phố Hải Phòng', 'cần thơ': 'Thành phố Cần Thơ',
    };
    for (const [short, full] of Object.entries(shortMap)) {
      if (addr.includes(short)) { result.city = full; break; }
    }
  }
  
  if (result.city) {
    const districts = Object.keys(LOCATIONS[result.city]);
    for (const district of districts) {
      if (addr.includes(district.toLowerCase())) { result.district = district; break; }
    }
    if (!result.district) {
      for (const district of districts) {
        const short = district.replace(/^(Quận |Huyện |Thị xã |Thành phố )/i, '').trim().toLowerCase();
        if (short && addr.includes(short)) { result.district = district; break; }
      }
    }
  }
  
  if (result.city && result.district) {
    const wards = LOCATIONS[result.city][result.district];
    for (const ward of wards) {
      if (addr.includes(ward.toLowerCase())) { result.ward = ward; break; }
    }
    if (!result.ward) {
      for (const ward of wards) {
        const short = ward.replace(/^(Phường |Xã |Thị trấn )/i, '').trim().toLowerCase();
        if (short && addr.includes(short)) { result.ward = ward; break; }
      }
    }
  }
  
  return result;
}

function getAuthToken(): string | null {
  return localStorage.getItem("token");
}

export function CustomerForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = React.useState(getDefaultCustomerForm);
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchLoading, setFetchLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    name?: string;
    phone?: string;
    email?: string;
    city?: string;
    district?: string;
    ward?: string;
    address?: string;
  }>({});

  const currentUser = React.useMemo(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  }, []);

  /** Đảm bảo NV đang đăng nhập có trong dropdown (scoped list đôi khi không gồm admin) */
  const employeeOptions = React.useMemo(() => {
    const list = [...employees];
    if (currentUser?.id != null && !list.some((e: any) => Number(e.id) === Number(currentUser.id))) {
      list.unshift({
        id: currentUser.id,
        full_name: currentUser.full_name || `Nhân viên #${currentUser.id}`,
      });
    }
    return list;
  }, [employees, currentUser]);

  React.useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = getAuthToken();
        const res = await fetch(`${API_URL}/users?scoped=1&limit=100&active_only=1`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setEmployees(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    };
    fetchEmployees();
  }, []);

  React.useEffect(() => {
    if (isEdit && id) {
      const fetchCustomer = async () => {
        try {
          setFetchLoading(true);
          setError(null);
          const token = getAuthToken();
          const res = await fetch(`${API_URL}/customers/${id}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) {
            if (res.status === 401) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            if (res.status === 403) throw new Error("Bạn không có quyền truy cập.");
            if (res.status === 404) throw new Error("Không tìm thấy khách hàng.");
            throw new Error("Không thể tải thông tin khách hàng");
          }
          const json = await res.json();
          const c = json.data;
          
          let city = c.city || "";
          let district = c.district || "";
          let ward = c.ward || "";
          let address = c.address || "";
          
          // If no structured location but old address has content, try to parse
          if ((!city || !district || !ward) && address) {
            const loc = parseAddress(address);
            if (loc.city && !city) city = loc.city;
            if (loc.district && !district) district = loc.district;
            if (loc.ward && !ward) ward = loc.ward;
            if (loc.street && !address) address = loc.street;
          }
          
          const bIso = birthdayToInputValue(c.birthday);
          setFormData({
            name: c.name || "",
            phone: c.phone || "",
            email: c.email || "",
            address: address,
            city: city,
            district: district,
            ward: ward,
            birthday: bIso,
            tier: c.tier || "new",
            source: c.source || "zalo",
            assigned_employee_id: c.assigned_employee_id != null ? String(c.assigned_employee_id) : "",
            note: c.note || "",
          });
        } catch (err: any) {
          setError(err.message);
        } finally {
          setFetchLoading(false);
        }
      };
      fetchCustomer();
    } else {
      setFetchLoading(false);
    }
  }, [id, isEdit]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error khi user bắt đầu nhập lại
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {
      name?: string;
      phone?: string;
      email?: string;
      city?: string;
      district?: string;
      ward?: string;
      address?: string;
    } = {};

    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập họ và tên";
    }

    const cleanedPhone = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim()) {
      newErrors.phone = "Số điện thoại là bắt buộc";
    } else if (cleanedPhone.length !== 10) {
      newErrors.phone = "Số điện thoại phải có đúng 10 chữ số";
    }

    if (!formData.city?.trim()) newErrors.city = "Vui lòng chọn Tỉnh/TP";
    if (!formData.district?.trim()) newErrors.district = "Vui lòng chọn Quận/Huyện";
    if (!formData.ward?.trim()) newErrors.ward = "Vui lòng chọn Phường/Xã";
    if (!formData.address?.trim()) newErrors.address = "Vui lòng nhập Số nhà/Tên đường";

    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = "Địa chỉ email không hợp lệ";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const token = getAuthToken();
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `${API_URL}/customers/${id}` : `${API_URL}/customers`;
      const rawAssign = formData.assigned_employee_id?.trim();
      const parsedAssign = rawAssign ? parseInt(rawAssign, 10) : null;
      const body = {
        ...formData,
        phone: formData.phone.replace(/\D/g, ''),
        assigned_employee_id: parsedAssign != null && !Number.isNaN(parsedAssign) ? parsedAssign : null,
        birthday: formData.birthday.trim() ? formData.birthday.trim() : null,
        email: formData.email.trim() || null,
        note: formData.note.trim() || null,
      };
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        if (res.status === 403) throw new Error("Bạn không có quyền thực hiện thao tác này.");
        const msg =
          typeof err.error === "string"
            ? err.error
            : err.message || "Thao tác thất bại";
        throw new Error(msg);
      }
      setSuccess(true);
      const back =
        (location.state as { customersListReturn?: string } | null)?.customersListReturn || "/customers";
      setTimeout(() => navigate(back), 1200);
    } catch (err: any) {
      const m = err?.message || String(err);
      setError(
        m === "Failed to fetch" || m.includes("NetworkError")
          ? "Không kết nối được máy chủ API. Hãy chạy backend (node backend, cổng 3000) và thử lại."
          : m
      );
    } finally {
      setIsLoading(false);
    }
  };

  const cities = Object.keys(LOCATIONS);
  const districts = formData.city ? Object.keys(LOCATIONS[formData.city] || {}) : [];
  const wards = formData.city && formData.district ? (LOCATIONS[formData.city]?.[formData.district] || []) : [];

  if (fetchLoading) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-md border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-4 h-4 mx-auto" />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {isEdit ? `Chỉnh sửa khách hàng: ${formData.name || id}` : "Thêm khách hàng mới"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEdit ? "Cập nhật thông tin chi tiết của khách hàng." : "Thu thập thông tin khách hàng để chăm sóc tốt hơn."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="h-10 px-4 rounded-md bg-background border border-border text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition-opacity disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <Save className="w-4 h-4" />
            {isLoading ? "Đang lưu..." : "Lưu khách hàng"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300 px-4 py-3 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /><span>Đã lưu thành công!</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-card p-8 rounded-xl border border-border shadow-sm flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                <User className="w-12 h-12" />
              </div>
              <h3 className="font-semibold text-foreground">Hạng thành viên</h3>
              <div className="mt-4 w-full space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg border border-border text-left">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hạng hiện tại</span>
                    <span className="text-[10px] font-semibold text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full">{isEdit ? "CŨ" : "MỚI"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Star className="w-5 h-5 text-amber-400 fill-current" />
                    <select value={formData.tier} onChange={(e) => handleChange("tier", e.target.value)} className="text-lg font-semibold text-foreground bg-transparent outline-none cursor-pointer">
                      <option value="new">Mới</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                      <option value="diamond">Diamond</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ghi chú đặc biệt</label>
                  <textarea rows={3} value={formData.note} onChange={(e) => handleChange("note", e.target.value)} placeholder="Sở thích, lưu ý khi phục vụ..." className="w-full px-3 py-3 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none"></textarea>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border">
              <h3 className="font-semibold text-base">Tích lũy điểm</h3>
              <p className="text-muted-foreground text-sm mt-1">1 điểm / 10,000₫ chi tiêu. Đổi 1 điểm = 1,000₫.</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-semibold tabular-nums">0</p>
                  <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide">Điểm hiện có</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                  <p className="text-2xl font-semibold tabular-nums">0 ₫</p>
                  <p className="text-[10px] uppercase font-medium text-muted-foreground tracking-wide">Tổng chi tiêu</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary"><User className="w-4 h-4" /></div>
                <h2 className="text-lg font-semibold text-foreground">Thông tin cơ bản</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Họ và tên <span className="text-destructive ml-0.5">*</span></label>
                  <input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="VD: Nguyễn Thị Lan" className={cn("w-full h-10 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", errors.name ? "border-destructive/50" : "border-input")} />
                  {errors.name && <p className="text-xs text-destructive font-medium">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Số điện thoại <span className="text-destructive ml-0.5">*</span></label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={formData.phone}
                      onChange={(e) => {
                        // chỉ giữ số, tối đa 10 ký tự
                        const digits = String(e.target.value || "").replace(/\D/g, "").slice(0, 10);
                        handleChange("phone", digits);
                      }}
                      placeholder="0912345678"
                      maxLength={10}
                      className={cn(
                        "w-full h-10 pl-9 pr-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        errors.phone
                          ? "border-destructive/50"
                          : "border-input"
                      )}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-destructive font-medium">{errors.phone}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="lan.nt@gmail.com" className={cn("w-full h-10 pl-9 pr-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", errors.email ? "border-destructive/50" : "border-input")} />
                  </div>
                  {errors.email && <p className="text-xs text-destructive font-medium">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Ngày sinh</label>
                  {/* iOS date picker có thể hiển thị Phật lịch (BE). Dùng GregorianDateSelect để giữ dương lịch. */}
                  <GregorianDateSelect
                    value={formData.birthday}
                    onChange={(iso) => handleChange("birthday", iso)}
                    allowEmpty
                    yearMin={1920}
                    yearMax={new Date().getFullYear()}
                    className="max-w-full"
                    monthNumericOptions
                  />
                  <p className="text-[11px] text-muted-foreground">Có thể để trống.</p>
                </div>
              </div>
            </div>

            <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-primary"><MapPin className="w-4 h-4" /></div>
                <h2 className="text-lg font-semibold text-foreground">Địa chỉ &amp; Liên hệ</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <select value={formData.city} onChange={(e) => handleChange("city", e.target.value)} className={cn("h-10 w-full px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", errors.city ? "border-destructive/50" : "border-input")}>
                    <option value="">Tỉnh/TP</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.city && <p className="text-[11px] text-destructive font-medium">{errors.city}</p>}
                  </div>
                  <div className="space-y-1">
                    <select value={formData.district} onChange={(e) => handleChange("district", e.target.value)} disabled={!formData.city} className={cn("h-10 w-full px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-muted", errors.district ? "border-destructive/50" : "border-input")}>
                    <option value="">Quận/Huyện</option>
                    {formData.city && districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.district && <p className="text-[11px] text-destructive font-medium">{errors.district}</p>}
                  </div>
                  <div className="space-y-1">
                    <select value={formData.ward} onChange={(e) => handleChange("ward", e.target.value)} disabled={!formData.district} className={cn("h-10 w-full px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:bg-muted", errors.ward ? "border-destructive/50" : "border-input")}>
                    <option value="">Phường/Xã</option>
                    {formData.city && formData.district && wards.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    {errors.ward && <p className="text-[11px] text-destructive font-medium">{errors.ward}</p>}
                  </div>
                </div>

                {/* Địa chỉ nhà: nằm hàng dưới, full width */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Địa chỉ nhà <span className="text-destructive ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Số nhà, tên đường"
                    className={cn(
                      "w-full h-10 px-3 bg-background border rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      errors.address
                        ? "border-destructive/50"
                        : "border-input"
                    )}
                  />
                  {errors.address && <p className="text-[11px] text-destructive font-medium">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Nhân viên phụ trách</label>
                    <p className="text-[11px] text-muted-foreground -mt-0.5 mb-1">Mặc định là bạn khi thêm mới; có thể đổi.</p>
                    <select value={formData.assigned_employee_id} onChange={(e) => handleChange("assigned_employee_id", e.target.value)} className="h-10 w-full px-3 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                      <option value="">Không gán</option>
                      {employeeOptions.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">Nguồn khách hàng</label>
                    <select value={formData.source} onChange={(e) => handleChange("source", e.target.value)} className="h-10 w-full px-3 bg-background border border-input rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                      <option value="zalo">Zalo</option>
                      <option value="store">Tại cửa hàng</option>
                      <option value="facebook">Facebook</option>
                      <option value="website">Website</option>
                      <option value="referral">Người quen giới thiệu</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
