import * as XLSX from "xlsx";

// Định dạng tiền VND
function fmtCurrency(v: number) {
  return v?.toLocaleString("vi-VN") + "đ";
}

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("vi-VN");
}

// ─── Export hoa hồng Sales (danh sách đơn của mình) ───────────────────────
export function exportSalesCommission(opts: {
  orders: any[];
  summary: any;
  userName: string;
  month: string;
  year: string;
  groupName?: string;
}) {
  const { orders, summary, userName, month, year, groupName } = opts;
  const wb = XLSX.utils.book_new();

  // Sheet 1: Chi tiết đơn hàng
  const detailRows: any[][] = [
    [`BÁO CÁO HOA HỒNG — ${userName.toUpperCase()}`],
    [`Kỳ: Tháng ${parseInt(month)}/${year}${groupName ? ` — Nhóm: ${groupName}` : ""}`],
    [],
    ["Mã đơn", "Ngày", "Khách hàng", "Nhóm BH", "Tổng tiền", "Hoa hồng bán hàng", "Trạng thái"],
  ];
  orders.forEach(o => {
    detailRows.push([
      o.order_code,
      fmtDate(o.order_date),
      o.customer_name || "—",
      o.group_name || "—",
      o.total_amount,
      o.commission_amount,
      o.status === "pending" ? "Chờ duyệt" :
      o.status === "shipping" ? "Đang giao" :
      o.status === "completed" ? "Đã giao" :
      o.status === "cancelled" ? "Đã hủy" : o.status,
    ]);
  });
  // Footer tổng
  detailRows.push([]);
  detailRows.push([
    "TỔNG CỘNG", "", "", "",
    orders.reduce((s, o) => s + o.total_amount, 0),
    orders.reduce((s, o) => s + o.commission_amount, 0),
    "",
  ]);

  // Sheet 2: Tổng kết
  const summaryRows: any[][] = [
    ["TỔNG KẾT HOA HỒNG"],
    [`${userName} — Tháng ${parseInt(month)}/${year}`],
    [],
    ["Chỉ số", "Giá trị"],
    ["HH bán hàng (tự bán)", summary.direct_commission],
    ["HH từ CTV (override)", summary.override_commission],
    ["Tổng hoa hồng", summary.direct_commission + summary.override_commission],
    ["Số đơn", summary.total_orders],
  ];

  const wsDetail  = XLSX.utils.aoa_to_sheet(detailRows);
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

  // Style cột rộng
  wsDetail["!cols"]  = [{ wch: 20 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 12 }];
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, wsDetail,  "Chi tiết đơn");
  XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng kết");

  XLSX.writeFile(wb, `HoaHong_${userName.replace(/\s+/g, "_")}_T${parseInt(month)}_${year}.xlsx`);
}

// ─── Export hoa hồng Admin — bảng tổng hợp nhân viên ─────────────────────
export function exportAdminCommission(opts: {
  salesData: any[];
  orderCommissions: any[];
  ctvPairs?: any[];
  ctvOrders?: any[];
  month: string;
  year: string;
  groupName?: string;
}) {
  const { salesData, orderCommissions, ctvPairs = [], ctvOrders = [], month, year, groupName } = opts;
  const wb = XLSX.utils.book_new();
  const period = `Tháng ${parseInt(month)}/${year}${groupName ? ` — Nhóm: ${groupName}` : ""}`;

  // Sheet 1: Tổng hợp nhân viên
  const nvRows: any[][] = [
    ["BÁO CÁO HOA HỒNG TOÀN BỘ NHÂN VIÊN"],
    [`Kỳ: ${period}`],
    [],
    ["Nhân viên", "Số đơn", "Doanh số", "HH bán hàng", "HH từ CTV", "Tổng HH"],
  ];
  salesData.forEach(s => {
    nvRows.push([
      s.full_name,
      s.total_orders || 0,
      s.total_sales || 0,
      s.total_commission || 0,
      s.override_commission || 0,
      (s.total_commission || 0) + (s.override_commission || 0),
    ]);
  });
  nvRows.push([]);
  nvRows.push([
    "TỔNG CỘNG",
    salesData.reduce((s, i) => s + (i.total_orders || 0), 0),
    salesData.reduce((s, i) => s + (i.total_sales || 0), 0),
    salesData.reduce((s, i) => s + (i.total_commission || 0), 0),
    salesData.reduce((s, i) => s + (i.override_commission || 0), 0),
    salesData.reduce((s, i) => s + (i.total_commission || 0) + (i.override_commission || 0), 0),
  ]);

  // Sheet 2: Chi tiết đơn (direct)
  const orderRows: any[][] = [
    ["CHI TIẾT HOA HỒNG THEO ĐƠN HÀNG"],
    [`Kỳ: ${period}`],
    [],
    ["Mã đơn", "Ngày", "Nhân viên", "Khách hàng", "Nhóm BH", "Tổng tiền", "Hoa hồng", "Trạng thái"],
  ];
  orderCommissions.forEach(o => {
    orderRows.push([
      o.order_code,
      fmtDate(o.order_date),
      o.salesperson_name || "—",
      o.customer_name || "—",
      o.group_name || "—",
      o.total_amount,
      o.commission_amount,
      o.status === "pending" ? "Chờ duyệt" :
      o.status === "shipping" ? "Đang giao" :
      o.status === "completed" ? "Đã giao" :
      o.status === "cancelled" ? "Đã hủy" : o.status,
    ]);
  });
  orderRows.push([]);
  orderRows.push([
    "TỔNG CỘNG", "", "", "", "",
    orderCommissions.reduce((s, o) => s + o.total_amount, 0),
    orderCommissions.reduce((s, o) => s + o.commission_amount, 0),
    "",
  ]);

  // Sheet 3: HH từ CTV
  const ctvRows: any[][] = [
    ["HOA HỒNG TỪ CTV"],
    [`Kỳ: ${period}`],
    [],
    ["Sales (người quản lý)", "CTV", "Mã đơn", "Ngày", "Khách hàng", "Nhóm BH", "Tổng tiền đơn", "HH override"],
  ];
  ctvOrders.forEach(o => {
    ctvRows.push([
      o.sales_name,
      o.ctv_name,
      o.order_code,
      fmtDate(o.order_date),
      o.customer_name || "—",
      o.group_name || "—",
      o.total_amount,
      o.override_commission,
    ]);
  });
  if (ctvOrders.length > 0) {
    ctvRows.push([]);
    ctvRows.push([
      "TỔNG CỘNG", "", "", "", "", "",
      ctvOrders.reduce((s, o) => s + o.total_amount, 0),
      ctvOrders.reduce((s, o) => s + o.override_commission, 0),
    ]);
  }

  const wsNV    = XLSX.utils.aoa_to_sheet(nvRows);
  const wsOrder = XLSX.utils.aoa_to_sheet(orderRows);
  const wsCtv   = XLSX.utils.aoa_to_sheet(ctvRows);

  wsNV["!cols"]    = [{ wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  wsOrder["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
  wsCtv["!cols"]   = [{ wch: 22 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(wb, wsNV,    "Tổng hợp NV");
  XLSX.utils.book_append_sheet(wb, wsOrder, "Chi tiết đơn");
  XLSX.utils.book_append_sheet(wb, wsCtv,   "HH từ CTV");

  XLSX.writeFile(wb, `HoaHong_ToanBo_T${parseInt(month)}_${year}.xlsx`);
}

// ─── Export HH CTV riêng (Sales view) ────────────────────────────────────
export function exportCtvCommission(opts: {
  summaryData: any[];
  orders: any[];
  totals: any;
  userName: string;
  period: string;
}) {
  const { summaryData, orders, totals, userName, period } = opts;
  const wb = XLSX.utils.book_new();

  // Sheet 1: Tổng hợp theo CTV
  const sumRows: any[][] = [
    [`HOA HỒNG TỪ CTV — ${userName.toUpperCase()}`],
    [`Kỳ: ${period}`],
    [],
    ["CTV", "Số đơn", "Doanh thu CTV", "HH override nhận được"],
  ];
  summaryData.forEach(s => {
    sumRows.push([s.collaborator_name, s.total_orders, s.total_revenue, s.total_override_commission]);
  });
  sumRows.push([]);
  sumRows.push([
    "TỔNG CỘNG",
    totals.total_orders || 0,
    totals.total_revenue || 0,
    totals.total_override_commission || 0,
  ]);

  // Sheet 2: Chi tiết từng đơn
  const detailRows: any[][] = [
    [`CHI TIẾT THEO ĐƠN — ${userName.toUpperCase()}`],
    [`Kỳ: ${period}`],
    [],
    ["CTV", "Mã đơn", "Ngày", "Khách hàng", "Nhóm BH", "Tổng tiền đơn", "Tỷ lệ %", "HH nhận"],
  ];
  orders.forEach(o => {
    detailRows.push([
      o.collaborator_name,
      o.order_code,
      fmtDate(o.order_date),
      o.customer_name || "—",
      o.group_name || "—",
      o.total_amount,
      o.override_rate + "%",
      o.override_commission,
    ]);
  });

  const wsSum    = XLSX.utils.aoa_to_sheet(sumRows);
  const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);

  wsSum["!cols"]    = [{ wch: 24 }, { wch: 10 }, { wch: 20 }, { wch: 22 }];
  wsDetail["!cols"] = [{ wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 18 }];

  XLSX.utils.book_append_sheet(wb, wsSum,    "Tổng hợp CTV");
  XLSX.utils.book_append_sheet(wb, wsDetail, "Chi tiết đơn");

  XLSX.writeFile(wb, `HoaHong_CTV_${userName.replace(/\s+/g, "_")}_${period.replace(/\s+/g, "_")}.xlsx`);
}
