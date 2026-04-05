import * as React from "react";
import locations from "../lib/vietnam-locations-simple.json";

export type Address = {
  province: string;
  district: string;
  ward: string;
  detail: string;
};

interface Props {
  value: Address;
  onChange: (a: Address) => void;
}

const AddressSelector: React.FC<Props> = ({ value, onChange }) => {
  const provinces = React.useMemo(() => Object.keys(locations), []);
  const [province, setProvince] = React.useState(value.province);
  const [district, setDistrict] = React.useState(value.district);
  const [ward, setWard] = React.useState(value.ward);
  const [detail, setDetail] = React.useState(value.detail);

  React.useEffect(() => {
    onChange({ province, district, ward, detail });
  }, [province, district, ward, detail]);

  React.useEffect(() => {
    setProvince(value.province);
    setDistrict(value.district);
    setWard(value.ward);
    setDetail(value.detail);
  }, [value]);

  return (
    <div className="address-selector grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="text-xs font-bold text-slate-500 block mb-1">Tỉnh/TP</label>
        <select
          value={province}
          onChange={(e) => { setProvince(e.target.value); setDistrict(""); setWard(""); }}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
        >
          <option value="">Chọn tỉnh/thành</option>
          {provinces.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 block mb-1">Quận/Huyện</label>
        <select
          value={district}
          onChange={(e) => { setDistrict(e.target.value); setWard(""); }}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
          disabled={!province}
        >
          <option value="">Chọn quận/huyện</option>
          {province && Object.keys(locations[province]).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 block mb-1">Phường/Xã</label>
        <select
          value={ward}
          onChange={(e) => setWard(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
          disabled={!province || !district}
        >
          <option value="">Chọn phường/xã</option>
          {province && district && (locations[province][district] as string[]).map(w => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-bold text-slate-500 block mb-1">Số nhà, Tên đường</label>
        <input
          type="text"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Ví dụ: 123 Đường ABC"
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
        />
      </div>
    </div>
  );
};

export default AddressSelector;
