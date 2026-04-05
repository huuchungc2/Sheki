import * as React from "react";
import type { OrderItem } from "../types";

interface Props {
  item: OrderItem;
  onQuantityChange?: (id: string, q: number) => void;
  onRemove?: (id: string) => void;
}

const LineItemRow: React.FC<Props> = ({ item, onQuantityChange, onRemove }) => {
  const handleQty = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) onQuantityChange?.(item.productId, v);
  };
  return (
    <tr>
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">{item.productName?.slice(0,1)}</div>
          <div>
            <p className="text-sm font-black text-slate-900">{item.productName}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{item.sku}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-6">
        <input type="number" step={0.1} min={0.01} value={item.quantity} onChange={handleQty} className="w-20 px-3 py-2 border rounded" />
      </td>
      <td className="px-4 py-6">{item.price}</td>
      <td className="px-4 py-6">{item.discountRate || 0}</td>
      <td className="px-4 py-6">{item.commissionAmount}</td>
      <td className="px-8 py-6">
        {onRemove ? (
          <button onClick={() => onRemove(item.productId)}>Remove</button>
        ) : null}
      </td>
    </tr>
  );
};

export default LineItemRow;
