import * as React from "react";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Download,
  ChevronRight,
  Database,
  Users,
  Package,
  UserCircle
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

interface BulkImportProps {
  entity: "products" | "customers" | "employees";
}

const entityConfig = {
  products: {
    title: "Nhập sản phẩm hàng loạt",
    description: "Tải lên tệp CSV hoặc Excel chứa danh sách sản phẩm của bạn.",
    icon: Package,
    color: "bg-blue-500",
    fields: ["Tên sản phẩm", "SKU", "Giá bán", "Giá nhập", "Số lượng tồn", "Danh mục", "Đơn vị tính"],
    templateName: "mau_import_san_pham.xlsx"
  },
  customers: {
    title: "Nhập khách hàng hàng loạt",
    description: "Tải lên tệp CSV hoặc Excel chứa danh sách khách hàng của bạn.",
    icon: UserCircle,
    color: "bg-emerald-500",
    fields: ["Họ tên", "Số điện thoại", "Email", "Địa chỉ", "Nhóm khách hàng", "Ngày sinh"],
    templateName: "mau_import_khach_hang.xlsx"
  },
  employees: {
    title: "Nhập nhân viên hàng loạt",
    description: "Tải lên tệp CSV hoặc Excel chứa danh sách nhân viên của bạn.",
    icon: Users,
    color: "bg-indigo-500",
    fields: ["Mã NV", "Họ tên", "Chức vụ", "Phòng ban", "Số điện thoại", "Email", "Lương cơ bản"],
    templateName: "mau_import_nhan_vien.xlsx"
  }
};

export function BulkImport() {
  const navigate = useNavigate();
  const location = useLocation();
  const entityType = location.pathname.split("/")[1] as keyof typeof entityConfig;
  const config = entityConfig[entityType] || entityConfig.products;

  const [step, setStep] = React.useState(1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      setStep(2);
    }
  };

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setStep(3);
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"
          >
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
              <div className={cn(
                "w-16 h-1 bg-slate-200 rounded-full",
                step > s && "bg-blue-600"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-8">
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) { setFileName(e.dataTransfer.files[0].name); setStep(2); } }}
            className={cn(
              "border-2 border-dashed rounded-[2.5rem] p-16 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
              isDragging ? "border-blue-500 bg-blue-50/50" : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50/50"
            )}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
            />
            <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl", config.color)}>
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
                <p className="text-sm text-slate-500">Sử dụng tệp mẫu của chúng tôi để đảm bảo dữ liệu hợp lệ.</p>
              </div>
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20">
              <Download className="w-4 h-4" />
              Tải tệp mẫu
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900">{fileName}</p>
                  <p className="text-xs text-slate-500">Sẵn sàng để nhập dữ liệu</p>
                </div>
              </div>
              <button 
                onClick={() => { setFileName(null); setStep(1); }}
                className="text-xs font-bold text-red-600 hover:underline"
              >
                Thay đổi tệp
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                Ánh xạ các trường dữ liệu
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.fields.map((field) => (
                  <div key={field} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-sm font-medium text-slate-700">{field}</span>
                    <div className="flex items-center gap-2 text-emerald-600">
                      <span className="text-xs font-bold">Đã khớp</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Quay lại
              </button>
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    Bắt đầu nhập dữ liệu
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white p-16 rounded-[3rem] border border-slate-200 shadow-sm text-center space-y-8">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">Thành công!</h2>
            <p className="text-slate-500">Dữ liệu của bạn đã được nhập vào hệ thống thành công.</p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-slate-50 p-4 rounded-2xl">
              <p className="text-2xl font-bold text-slate-900">128</p>
              <p className="text-xs text-slate-500 font-medium">Tổng số dòng</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl">
              <p className="text-2xl font-bold text-emerald-600">128</p>
              <p className="text-xs text-emerald-600 font-medium">Thành công</p>
            </div>
            <div className="bg-red-50 p-4 rounded-2xl">
              <p className="text-2xl font-bold text-red-600">0</p>
              <p className="text-xs text-red-600 font-medium">Lỗi</p>
            </div>
          </div>

          <div className="pt-8 flex items-center justify-center gap-4">
            <button 
              onClick={() => navigate(`/${entityType}`)}
              className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
            >
              Xem danh sách
            </button>
            <button 
              onClick={() => setStep(1)}
              className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Tiếp tục nhập tệp khác
            </button>
          </div>
        </div>
      )}

      {/* Help Section */}
      {step < 3 && (
        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex gap-4">
          <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
          <div className="space-y-1">
            <h5 className="font-bold text-blue-900 text-sm">Lưu ý khi nhập dữ liệu</h5>
            <p className="text-xs text-blue-700 leading-relaxed">
              Hệ thống sẽ tự động bỏ qua các dòng dữ liệu bị trùng lặp dựa trên SKU (Sản phẩm), Số điện thoại (Khách hàng) hoặc Mã NV (Nhân viên). Hãy đảm bảo các trường bắt buộc không bị bỏ trống.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
