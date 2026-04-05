import * as React from "react";

type Product = any;

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSelect: (p: Product) => void;
  suggestions: Product[];
  placeholder?: string;
}

const ProductSuggest: React.FC<Props> = ({ value, onChange, onSelect, suggestions, placeholder }) => {
  const [open, setOpen] = React.useState(false);
  const list = suggestions || [];

  return (
    <div className="product-suggest relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        placeholder={placeholder || "Tìm sản phẩm..."}
        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
      />
      {open && list.length > 0 && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
          {list.map((p: any) => (
            <div key={p.id} className="px-4 py-2 hover:bg-slate-50 cursor-pointer" onMouseDown={() => onSelect(p)}>
              <div className="text-sm font-bold text-slate-800">{p.name}</div>
              <div className="text-xs text-slate-500">{p.sku} • {p.price ? new Intl.NumberFormat().format(p.price) : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductSuggest;
