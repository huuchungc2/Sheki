import * as React from "react";
import { 
  Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, Download,
  ChevronRight, Database, Loader2, X
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

const API_URL =
  (import.meta as any)?.env?.VITE_API_URL ||
  "/api";

const entityConfig: Record<string, any> = {
  employees: {
    title: "Nhập nhân viên hàng loạt",
    description: "Tải lên tệp CSV chứa danh sách nhân viên.",
    fields: ["full_name", "email", "phone", "role", "department", "position", "commission_rate", "salary", "join_date", "address", "city", "district"],
    fieldLabels: ["Họ tên", "Email", "SĐT", "Vai trò", "Phòng ban", "Chức vụ", "% Hoa hồng", "Lương", "Ngày vào", "Địa chỉ", "TP", "Quận"],
    required: ["full_name", "email"]
  },
  customers: {
    title: "Nhập khách hàng hàng loạt",
    description: "Tải lên tệp CSV chứa danh sách khách hàng.",
    fields: ["name", "phone", "email", "address", "city", "source", "birthday"],
    fieldLabels: ["Họ tên", "SĐT", "Email", "Địa chỉ", "TP/Nguồn", "Nguồn", "Ngày sinh"],
    required: ["name"]
  },
  products: {
    title: "Nhập sản phẩm hàng loạt",
    description: "Tải lên tệp Excel chứa danh sách sản phẩm.",
    fields: ["name", "sku", "unit", "price", "cost_price", "stock_qty", "low_stock_threshold", "weight", "length", "width", "height", "image_url", "description"],
    fieldLabels: ["Tên SP *", "SKU (tự sinh nếu để trống)", "Đơn vị", "Giá bán", "Giá vốn", "Tồn kho", "Cảnh báo hết", "Cân nặng (g)", "Dài (cm)", "Rộng (cm)", "Cao (cm)", "URL ảnh", "Mô tả"],
    required: ["name"]
  }
};

export function BulkImport() {
  const navigate = useNavigate();
  const location = useLocation();
  // Extract entity from path: /employees/import -> employees, /products/import -> products
  const pathParts = location.pathname.split("/").filter(Boolean);
  const entityType = pathParts[0] as keyof typeof entityConfig;
  const config = entityConfig[entityType] || entityConfig.products;

  const [step, setStep] = React.useState(1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (!f.name.match(/\.(csv|xlsx|xls)$/i)) {
        setError("Chỉ hỗ trợ file .csv, .xlsx, .xls");
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setError("File quá lớn (tối đa 10MB)");
        return;
      }
      setFile(f);
      setFileName(f.name);
      setError(null);
      setStep(2);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/import/${entityType}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload thất bại");
      }

      setResult(data);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/import/template/${entityType}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Không thể tải template");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mau_import_${entityType}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{config.title}</h1>
            <p className="text-slate-500 text-sm mt-1">{config.description}</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all",
              step >= s ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-200 text-slate-500"
            )}>
              {step > s ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
            {s < 3 && (
              <div className={cn("w-16 h-1 bg-slate-200 rounded-full", step > s && "bg-blue-600")} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
              <AlertCircle className="w-5 h-5 shrink-0" /> {error}
            </div>
          )}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) handleFileSelect({ target: { files: e.dataTransfer.files } } as any); }}
            className={cn(
              "border-2 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
              isDragging ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50/50"
            )}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <input type="file" id="file-upload" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} />
            <div className="w-20 h-20 rounded-3xl bg-blue-500 flex items-center justify-center text-white mb-6 shadow-xl">
              <Upload className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Chọn tệp hoặc kéo thả vào đây</h3>
            <p className="text-slate-500 max-w-xs mx-auto">Hỗ trợ định dạng .csv, .xlsx, .xls. Dung lượng tối đa 10MB.</p>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Tệp mẫu chuẩn</h4>
                <p className="text-sm text-slate-500">Tải file mẫu và điền dữ liệu theo đúng định dạng.</p>
              </div>
            </div>
            <button onClick={downloadTemplate} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
              <Download className="w-4 h-4" /> Tải tệp mẫu
            </button>
          </div>

          {/* Fields info */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4">Các trường dữ liệu</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {config.fields.map((field: string, i: number) => (
                <div key={field} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                  <span className={cn("w-2 h-2 rounded-full", config.required.includes(field) ? "bg-red-500" : "bg-slate-300")} />
                  <span className="text-sm text-slate-700">{config.fieldLabels[i]}</span>
                  {config.required.includes(field) && <span className="text-red-500 text-xs">*</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Confirm */}
      {step === 2 && (
        <div className="space-y-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
              <AlertCircle className="w-5 h-5 shrink-0" /> {error}
            </div>
          )}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{fileName}</p>
                  <p className="text-xs text-slate-500">Sẵn sàng để nhập dữ liệu</p>
                </div>
              </div>
              <button onClick={() => { setFileName(null); setFile(null); setStep(1); }} className="text-xs font-bold text-red-600 hover:underline">Thay đổi tệp</button>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                Cấu trúc dữ liệu sẽ nhập
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {config.fields.map((field: string, i: number) => (
                  <div key={field} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-sm font-medium text-slate-700">{config.fieldLabels[i]}</span>
                    <span className="text-xs font-bold text-slate-400">{field}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Quay lại</button>
              <button onClick={handleUpload} disabled={isUploading} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
                {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : <>Bắt đầu nhập dữ liệu<ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && result && (
        <div className="bg-white p-16 rounded-[3rem] border border-slate-200 shadow-sm text-center space-y-8">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">Hoàn tất!</h2>
            <p className="text-slate-500">Dữ liệu đã được xử lý.</p>
          </div>

          <div className="grid grid-cols-4 gap-4 max-w-lg mx-auto">
            <div className="bg-slate-50 p-4 rounded-2xl">
              <p className="text-2xl font-bold text-slate-900">{result.total || 0}</p>
              <p className="text-xs text-slate-500 font-medium">Tổng số dòng</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl">
              <p className="text-2xl font-bold text-emerald-600">{result.success || 0}</p>
              <p className="text-xs text-emerald-600 font-medium">Thành công</p>
            </div>
            <div className={cn("p-4 rounded-2xl", result.skipped > 0 ? "bg-amber-50" : "bg-slate-50")}>
              <p className={cn("text-2xl font-bold", result.skipped > 0 ? "text-amber-600" : "text-slate-400")}>{result.skipped || 0}</p>
              <p className="text-xs text-slate-500 font-medium">Bỏ qua (trùng)</p>
            </div>
            <div className={cn("p-4 rounded-2xl", result.failed > 0 ? "bg-red-50" : "bg-slate-50")}>
              <p className={cn("text-2xl font-bold", result.failed > 0 ? "text-red-600" : "text-slate-400")}>{result.failed || 0}</p>
              <p className="text-xs text-slate-500 font-medium">Lỗi</p>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="max-w-lg mx-auto text-left">
              <h4 className="text-sm font-bold text-red-600 mb-3">Chi tiết lỗi:</h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {result.errors.map((err: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-3 bg-red-50 rounded-xl text-xs text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Dòng {err.row}: {err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-8 flex items-center justify-center gap-4">
            <button onClick={() => navigate(`/${entityType}`)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">Xem danh sách</button>
            <button onClick={() => { setStep(1); setFileName(null); setFile(null); setResult(null); }} className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">Nhập tệp khác</button>
          </div>
        </div>
      )}

      {step < 3 && (
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex gap-4">
          <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
          <div className="space-y-1">
            <h5 className="font-bold text-blue-900 text-sm">Lưu ý khi nhập dữ liệu</h5>
            <p className="text-xs text-blue-700 leading-relaxed">
              Hệ thống sẽ tự động bỏ qua các dòng dữ liệu bị trùng lặp dựa trên Email (Nhân viên), Tên (Khách hàng) hoặc SKU (Sản phẩm). Các trường đánh dấu * là bắt buộc. Mật khẩu mặc định cho nhân viên mới là <strong>123456</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
