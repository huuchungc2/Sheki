/**
 * Chuẩn hóa ngày sinh cho cột DATE (MySQL): rỗng → null; nhận yyyy-mm-dd hoặc dd/mm/yyyy.
 * Giá trị không hợp lệ → null (không ném lỗi DB).
 */
function normalizeCustomerBirthday(val) {
  if (val == null || val === undefined) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const yyyy = parseInt(m[3], 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) return null;
    const d = new Date(yyyy, mm - 1, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
    return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  return null;
}

module.exports = { normalizeCustomerBirthday };
