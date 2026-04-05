import * as React from "react";

type Customer = any;

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSelect: (c: Customer) => void;
  suggestions: Customer[];
  placeholder?: string;
}

const CustomerSuggest: React.FC<Props> = ({ value, onChange, onSelect, suggestions, placeholder }) => {
  const [open, setOpen] = React.useState(false);
  const filtered = suggestions || [];

  return (
    <div className="customer-suggest relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        placeholder={placeholder || "Tìm khách hàng..."}
        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
          {filtered.map((c: any) => (
            <div key={c.id} className="px-4 py-2 hover:bg-slate-50 cursor-pointer" onMouseDown={() => onSelect(c)}>
              <div className="text-sm font-bold text-slate-800">{c.name}</div>
              <div className="text-xs text-slate-500">{c.phone}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerSuggest;
