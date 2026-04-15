import * as XLSX from "xlsx";

// Định dạng tiền VND
function fmtCurrency(v: number) {
  return v?.toLocaleString("vi-VN") + "đ";
}

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("vi-VN");
}

function fmtDateTime(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleString("vi-VN");
}

/** Khớp cột «Loại HH» trên CommissionReport */
function hhKindLabel(o: { entry_kind?: string; type?: string }) {
  if (String(o?.entry_kind) === "adjustment") return "Hoàn";
  if (o?.type === "override") return "HH từ CTV";
  if (o?.type === "direct") return "Bán hàng";
  return "—";
}

function orderStatusLabel(st: string) {
  if (st === "pending") return "Chờ duyệt";
  if (st === "shipping") return "Đang giao";
  if (st === "completed") return "Đã giao";
  if (st === "cancelled") return "Đã hủy";
  return st || "—";
}

function paymentLabel(p: string) {
  if (p === "cash") return "Tiền mặt";
  if (p === "transfer") return "Chuyển khoản";
  if (p === "card") return "Thẻ ATM";
  return p || "—";
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
  const totalReturnCommAbs =
    summary?.total_return_commission_abs != null
      ? Number(summary.total_return_commission_abs) || 0
      : Math.abs(Number(summary?.total_return_commission) || 0);
  const totalLuong =
    (Number(summary?.total_commission) || 0) +
    (Number(summary?.total_khach_ship) || 0) -
    (Number(summary?.total_nv_chiu) || 0) -
    totalReturnCommAbs;

  // Sheet 1: Chi tiết đơn hàng
  const detailRows: any[][] = [
    [`BÁO CÁO HOA HỒNG — ${userName.toUpperCase()}`],
    [`Kỳ: Tháng ${parseInt(month)}/${year}${groupName ? ` — Nhóm: ${groupName}` : ""}`],
    [],
    ["Mã đơn", "Loại HH", "Ngày", "Khách hàng", "Nhóm BH", "Tổng tiền", "Hoa hồng bán hàng", "Ship KH Trả", "Tiền NV chịu", "Lương", "Trạng thái"],
  ];
  orders.forEach(o => {
    detailRows.push([
      o.order_code,
      hhKindLabel(o),
      fmtDate(o.order_date),
      o.customer_name || "—",
      o.group_name || "—",
      o.total_amount,
      o.commission_amount,
      Number(o.khach_tra_ship) || 0,
      Number(o.nv_chiu_display) || 0,
      Number(o.luong) || 0,
      o.status === "pending" ? "Chờ duyệt" :
      o.status === "shipping" ? "Đang giao" :
      o.status === "completed" ? "Đã giao" :
      o.status === "cancelled" ? "Đã hủy" : o.status,
    ]);
  });
  // Footer tổng
  detailRows.push([]);
  detailRows.push([
    "TỔNG CỘNG", "", "", "", "",
    orders.reduce((s, o) => s + o.total_amount, 0),
    orders.reduce((s, o) => s + o.commission_amount, 0),
    orders.reduce((s, o) => s + Number(o.khach_tra_ship || 0), 0),
    orders.reduce((s, o) => s + Number(o.nv_chiu_display || 0), 0),
    orders.reduce((s, o) => s + Number(o.luong || 0), 0),
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
    ["Tổng hoa hồng hoàn", totalReturnCommAbs],
    ["Ship KH Trả (cả kỳ)", summary.total_khach_ship ?? 0],
    ["Tiền NV chịu (cả kỳ)", summary.total_nv_chiu ?? 0],
    ["Tổng lương (Tổng HH + Ship KH Trả − NV − HH hoàn)", summary.total_luong ?? totalLuong],
    ["Số đơn", summary.total_orders],
  ];

  const wsDetail  = XLSX.utils.aoa_to_sheet(detailRows);
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

  // Style cột rộng
  wsDetail["!cols"]  = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 12 }];
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
  periodSummary?: any;
}) {
  const { salesData, orderCommissions, ctvPairs = [], ctvOrders = [], month, year, groupName, periodSummary } = opts;
  const wb = XLSX.utils.book_new();
  const period = `Tháng ${parseInt(month)}/${year}${groupName ? ` — Nhóm: ${groupName}` : ""}`;

  // Sheet 1: Tổng hợp nhân viên
  const nvRows: any[][] = [
    ["BÁO CÁO HOA HỒNG TOÀN BỘ NHÂN VIÊN"],
    [`Kỳ: ${period}`],
    [],
    ["Nhân viên", "Số đơn", "Doanh số", "HH bán hàng", "HH từ CTV", "Tổng HH", "Ship KH Trả", "Tiền NV chịu", "Tổng lương"],
  ];
  salesData.forEach(s => {
    const totalHh = (s.total_commission || 0) + (s.override_commission || 0);
    nvRows.push([
      s.full_name,
      s.total_orders || 0,
      s.total_sales || 0,
      s.total_commission || 0,
      s.override_commission || 0,
      totalHh,
      s.total_khach_ship || 0,
      s.total_nv_chiu || 0,
      Number(s.total_luong) || totalHh + (s.total_khach_ship || 0) - (s.total_nv_chiu || 0),
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
    salesData.reduce((s, i) => s + (i.total_khach_ship || 0), 0),
    salesData.reduce((s, i) => s + (i.total_nv_chiu || 0), 0),
    salesData.reduce((s, i) => s + (Number(i.total_luong) || 0), 0),
  ]);

  // Sheet 2: Chi tiết đơn (direct)
  const orderRows: any[][] = [
    ["CHI TIẾT HOA HỒNG THEO ĐƠN HÀNG"],
    [`Kỳ: ${period}`],
    [],
    ["Mã đơn", "Loại HH", "Ngày", "Nhân viên", "Khách hàng", "Nhóm BH", "Tổng tiền", "Hoa hồng", "Ship KH Trả", "Tiền NV chịu", "Lương", "Trạng thái"],
  ];
  orderCommissions.forEach(o => {
    orderRows.push([
      o.order_code,
      hhKindLabel(o),
      fmtDate(o.order_date),
      o.salesperson_name || "—",
      o.customer_name || "—",
      o.group_name || "—",
      o.total_amount,
      o.commission_amount,
      Number(o.khach_tra_ship) || 0,
      Number(o.nv_chiu_display) || 0,
      Number(o.luong) || 0,
      o.status === "pending" ? "Chờ duyệt" :
      o.status === "shipping" ? "Đang giao" :
      o.status === "completed" ? "Đã giao" :
      o.status === "cancelled" ? "Đã hủy" : o.status,
    ]);
  });
  orderRows.push([]);
  orderRows.push([
    "TỔNG CỘNG", "", "", "", "", "",
    orderCommissions.reduce((s, o) => s + o.total_amount, 0),
    orderCommissions.reduce((s, o) => s + o.commission_amount, 0),
    orderCommissions.reduce((s, o) => s + Number(o.khach_tra_ship || 0), 0),
    orderCommissions.reduce((s, o) => s + Number(o.nv_chiu_display || 0), 0),
    orderCommissions.reduce((s, o) => s + Number(o.luong || 0), 0),
    "",
  ]);
  if (periodSummary && (periodSummary.total_luong != null || periodSummary.total_khach_ship != null)) {
    orderRows.push([]);
    orderRows.push([
      "Tổng lương (cả kỳ lọc)",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      periodSummary.total_luong ?? "",
      "",
    ]);
  }

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

  wsNV["!cols"]    = [{ wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  wsOrder["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
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

// ─── Báo cáo doanh thu (trang Revenue) ─────────────────────────────────────
export function exportRevenueReport(opts: {
  salesData: any[];
  summary: { totalSales?: number; totalCommission?: number; totalEmployees?: number };
  month: string;
  year: string;
  groupName?: string;
}) {
  const { salesData, summary, month, year, groupName } = opts;
  const wb = XLSX.utils.book_new();
  const period = `Tháng ${parseInt(month, 10)}/${year}${groupName ? ` — Nhóm: ${groupName}` : ""}`;

  const rows: any[][] = [
    ["BÁO CÁO DOANH THU THEO NHÂN VIÊN"],
    [`Kỳ: ${period}`],
    [],
    ["Nhân viên", "Số đơn", "Doanh số", "HH bán hàng", "HH từ CTV", "Tổng hoa hồng"],
  ];

  const sorted = [...salesData].sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0));
  sorted.forEach((s) => {
    const direct = s.total_commission || 0;
    const override = s.override_commission || 0;
    const total =
      s.total_all_commission != null
        ? s.total_all_commission
        : direct + override;
    rows.push([s.full_name, s.total_orders || 0, s.total_sales || 0, direct, override, total]);
  });

  rows.push([]);
  const totalOrders = sorted.reduce((acc, s) => acc + (s.total_orders || 0), 0);
  rows.push([
    "TỔNG CỘNG",
    totalOrders,
    summary.totalSales ?? sorted.reduce((acc, s) => acc + (s.total_sales || 0), 0),
    sorted.reduce((acc, s) => acc + (s.total_commission || 0), 0),
    sorted.reduce((acc, s) => acc + (s.override_commission || 0), 0),
    summary.totalCommission ??
      sorted.reduce(
        (acc, s) =>
          acc + (s.total_all_commission ?? ((s.total_commission || 0) + (s.override_commission || 0))),
        0
      ),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws, "Doanh thu");
  XLSX.writeFile(wb, `DoanhThu_T${parseInt(month, 10)}_${year}.xlsx`);
}

/** Báo cáo Thu chi (Admin) */
export function exportCashTransactions(opts: {
  rows: any[];
  year: string;
  month: string;
}) {
  const { rows, year, month } = opts;
  const wb = XLSX.utils.book_new();
  const period = `Tháng ${parseInt(month, 10)}/${year}`;
  const detail: any[][] = [
    ["BÁO CÁO THU CHI"],
    [`Kỳ: ${period}`],
    [],
    [
      "Thời gian",
      "Nhân viên",
      "Username",
      "Loại",
      "Nhóm BH",
      "Số tiền (VNĐ)",
      "Ghi chú",
      "Người tạo",
    ],
  ];

  let sumThu = 0;
  let sumChi = 0;
  rows.forEach((r) => {
    const amt = Number(r.amount) || 0;
    if (r.kind === "income") sumThu += amt;
    else sumChi += amt;
    detail.push([
      r.created_at ? new Date(r.created_at).toLocaleString("vi-VN") : "",
      r.user_full_name || "",
      r.user_username || "",
      r.kind === "income" ? "Thu" : "Chi",
      r.group_name || "—",
      amt,
      r.note || "",
      r.created_by_name || "",
    ]);
  });

  detail.push([]);
  detail.push(["Tổng Thu", "", "", "", "", sumThu, "", ""]);
  detail.push(["Tổng Chi", "", "", "", "", sumChi, "", ""]);
  detail.push([]);
  detail.push([
    "Chênh (Thu − Chi)",
    "",
    "",
    "",
    "",
    sumThu - sumChi,
    "",
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(detail);
  ws["!cols"] = [
    { wch: 20 },
    { wch: 22 },
    { wch: 14 },
    { wch: 8 },
    { wch: 14 },
    { wch: 16 },
    { wch: 28 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Thu chi");
  XLSX.writeFile(wb, `ThuChi_T${parseInt(month, 10)}_${year}.xlsx`);
}

// ─── Export danh sách Đơn hàng ────────────────────────────────────────────
export function exportOrdersList(opts: {
  rows: any[];
  itemRows?: any[];
  meta?: { dateFrom?: string; dateTo?: string; groupName?: string; employeeName?: string };
}) {
  const { rows, itemRows = [], meta } = opts;
  const wb = XLSX.utils.book_new();

  const header: any[][] = [
    ["DANH SÁCH ĐƠN HÀNG"],
    [
      `Lọc: ${
        meta?.dateFrom || meta?.dateTo
          ? `${meta?.dateFrom || "..."} → ${meta?.dateTo || "..."}`
          : "—"
      }${meta?.groupName ? ` — Nhóm: ${meta.groupName}` : ""}${
        meta?.employeeName ? ` — NV: ${meta.employeeName}` : ""
      }`,
    ],
    [],
  ];

  const cols = [
    "Mã đơn",
    "Thời gian",
    "Trạng thái",
    "Khách hàng",
    "SĐT",
    "Nhân viên",
    "Nhóm BH",
    "Kho",
    "Tạm tính",
    "Ship (phí)",
    "Ai trả ship",
    "Ship KH Trả",
    "Tiền NV chịu",
    "Hoa hồng (direct)",
    "Lương (HH + Ship KH − NV)",
    "Cọc",
    "Thu khách",
    "Shop thu",
    "Thanh toán",
    "Ghi chú",
  ];

  const detail: any[][] = [
    ...header,
    cols,
  ];

  rows.forEach((o) => {
    const shipFee = Number(o.shipping_fee) || 0;
    const khachTraShip = o.ship_payer === "shop" ? 0 : shipFee;
    const nvChiu = Number(o.salesperson_absorbed_amount) || 0;
    const commission = Number(o.commission_amount) || 0;
    const luong = commission + khachTraShip - nvChiu;
    detail.push([
      o.code || `#${o.id}`,
      fmtDateTime(o.created_at),
      orderStatusLabel(String(o.status || "")),
      o.customer_name || "—",
      o.customer_phone || "",
      o.salesperson_name || "—",
      o.group_name || "—",
      o.warehouse_name || "—",
      Number(o.subtotal) || 0,
      shipFee,
      o.ship_payer === "shop" ? "Shop" : "Khách",
      khachTraShip,
      nvChiu,
      commission,
      luong,
      Number(o.deposit) || 0,
      Number(o.customer_collect) || 0,
      Number(o.shop_collect) || 0,
      paymentLabel(String(o.payment_method || "")),
      o.note || "",
    ]);
  });

  detail.push([]);
  detail.push([
    "TỔNG CỘNG",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    rows.reduce((s, o) => s + (Number(o.subtotal) || 0), 0),
    rows.reduce((s, o) => s + (Number(o.shipping_fee) || 0), 0),
    "",
    rows.reduce((s, o) => s + (o.ship_payer === "shop" ? 0 : Number(o.shipping_fee) || 0), 0),
    rows.reduce((s, o) => s + (Number(o.salesperson_absorbed_amount) || 0), 0),
    rows.reduce((s, o) => s + (Number(o.commission_amount) || 0), 0),
    rows.reduce((s, o) => {
      const shipFee = Number(o.shipping_fee) || 0;
      const khachTraShip = o.ship_payer === "shop" ? 0 : shipFee;
      const nvChiu = Number(o.salesperson_absorbed_amount) || 0;
      const commission = Number(o.commission_amount) || 0;
      return s + (commission + khachTraShip - nvChiu);
    }, 0),
    rows.reduce((s, o) => s + (Number(o.deposit) || 0), 0),
    rows.reduce((s, o) => s + (Number(o.customer_collect) || 0), 0),
    rows.reduce((s, o) => s + (Number(o.shop_collect) || 0), 0),
    "",
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(detail);
  ws["!cols"] = [
    { wch: 20 }, // mã
    { wch: 20 }, // time
    { wch: 12 }, // status
    { wch: 22 }, // customer
    { wch: 12 }, // phone
    { wch: 18 }, // salesperson
    { wch: 14 }, // group
    { wch: 14 }, // warehouse
    { wch: 16 }, // subtotal
    { wch: 14 }, // ship fee
    { wch: 10 }, // payer
    { wch: 14 }, // ship KH
    { wch: 14 }, // NV chịu
    { wch: 16 }, // HH
    { wch: 16 }, // lương
    { wch: 12 }, // cọc
    { wch: 16 }, // thu khách
    { wch: 16 }, // shop thu
    { wch: 12 }, // payment
    { wch: 30 }, // note
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Đơn hàng");

  // Sheet 2: Chi tiết sản phẩm theo đơn
  const itemHeader: any[][] = [
    ["CHI TIẾT SẢN PHẨM — THEO ĐƠN HÀNG"],
    [
      `Lọc: ${
        meta?.dateFrom || meta?.dateTo
          ? `${meta?.dateFrom || "..."} → ${meta?.dateTo || "..."}`
          : "—"
      }${meta?.groupName ? ` — Nhóm: ${meta.groupName}` : ""}${
        meta?.employeeName ? ` — NV: ${meta.employeeName}` : ""
      }`,
    ],
    [],
    [
      "Mã đơn",
      "Thời gian",
      "Trạng thái",
      "Khách hàng",
      "Nhân viên",
      "Nhóm BH",
      "Kho",
      "SKU",
      "Tên sản phẩm",
      "ĐVT",
      "Số lượng",
      "Đơn giá",
      "CK %",
      "CK (VNĐ)",
      "Thành tiền (sau CK)",
    ],
  ];

  const itemRowsAoa: any[][] = [...itemHeader];
  itemRows.forEach((r: any) => {
    itemRowsAoa.push([
      r.order_code || `#${r.order_id}`,
      fmtDateTime(r.order_date),
      orderStatusLabel(String(r.status || "")),
      r.customer_name || "—",
      r.salesperson_name || "—",
      r.group_name || "—",
      r.warehouse_name || "—",
      r.sku || "",
      r.product_name || `#${r.product_id}`,
      r.unit || "",
      Number(r.qty) || 0,
      Number(r.unit_price) || 0,
      Number(r.discount_rate) || 0,
      Number(r.discount_amount) || 0,
      Number(r.subtotal) || 0,
    ]);
  });
  itemRowsAoa.push([]);
  itemRowsAoa.push([
    "TỔNG CỘNG",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    itemRows.reduce((s: number, r: any) => s + (Number(r.qty) || 0), 0),
    "",
    "",
    itemRows.reduce((s: number, r: any) => s + (Number(r.discount_amount) || 0), 0),
    itemRows.reduce((s: number, r: any) => s + (Number(r.subtotal) || 0), 0),
  ]);

  const wsItems = XLSX.utils.aoa_to_sheet(itemRowsAoa);
  wsItems["!cols"] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 28 },
    { wch: 8 },
    { wch: 12 },
    { wch: 14 },
    { wch: 8 },
    { wch: 14 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsItems, "Chi tiết SP");

  const fileSuffix =
    meta?.dateFrom || meta?.dateTo ? `_${meta?.dateFrom || ""}-${meta?.dateTo || ""}` : "";
  XLSX.writeFile(wb, `DonHang${fileSuffix}.xlsx`);
}

// ─── Export danh sách Đơn hoàn ────────────────────────────────────────────
export function exportReturnsList(opts: {
  rows: any[];
  meta?: { dateFrom?: string; dateTo?: string; groupName?: string };
}) {
  const { rows, meta } = opts;
  const wb = XLSX.utils.book_new();

  const header: any[][] = [
    ["DANH SÁCH ĐƠN HOÀN"],
    [
      `Lọc: ${
        meta?.dateFrom || meta?.dateTo
          ? `${meta?.dateFrom || "..."} → ${meta?.dateTo || "..."}`
          : "—"
      }${meta?.groupName ? ` — Nhóm: ${meta.groupName}` : ""}`,
    ],
    [],
  ];

  const cols = [
    "Mã hoàn",
    "Thời gian",
    "Đơn gốc",
    "Nhân viên bán",
    "Nhóm BH",
    "Kho nhập",
    "Giá trị hoàn (âm)",
    "HH hoàn (âm)",
    "Sản phẩm (SKU × SL)",
    "Ghi chú",
    "Người xử lý",
  ];

  const detail: any[][] = [
    ...header,
    cols,
  ];

  rows.forEach((r) => {
    const itemsText =
      (r.items || [])
        .map((it: any) => `${it.sku || `PID:${it.product_id}`} - ${it.product_name || ""} × ${it.qty}`)
        .join("; ");
    detail.push([
      `#${r.id}`,
      fmtDateTime(r.created_at),
      r.order_code || `#${r.order_id}`,
      r.salesperson_name || "—",
      r.group_name || "—",
      r.warehouse_name || "—",
      -Math.abs(Number(r.return_amount) || 0),
      -Math.abs(Number(r.commission_return_amount) || 0),
      itemsText,
      r.note || "",
      r.created_by_name || "",
    ]);
  });

  detail.push([]);
  detail.push([
    "TỔNG CỘNG",
    "",
    "",
    "",
    "",
    "",
    -Math.abs(rows.reduce((s, r) => s + (Number(r.return_amount) || 0), 0)),
    -Math.abs(rows.reduce((s, r) => s + Math.abs(Number(r.commission_return_amount) || 0), 0)),
    "",
    "",
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(detail);
  ws["!cols"] = [
    { wch: 10 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 50 },
    { wch: 30 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Đơn hoàn");

  const fileSuffix =
    meta?.dateFrom || meta?.dateTo ? `_${meta?.dateFrom || ""}-${meta?.dateTo || ""}` : "";
  XLSX.writeFile(wb, `DonHoan${fileSuffix}.xlsx`);
}
