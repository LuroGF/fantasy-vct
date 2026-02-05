"use client";

interface PowerUpCardProps {
  item: {
    id: string;
    code: string;
    name: string;
    description: string;
    base_price: number;
    icon?: string | null;
  };
  quantity?: number;
  onBuy?: () => void;
  isLoading?: boolean;
}

export function PowerUpCard({ item, quantity, onBuy, isLoading }: PowerUpCardProps) {
  const isOwned = (quantity || 0) > 0;

  return (
    <div className="v-panel p-4 flex flex-col justify-between h-full group hover:border-v-red/50 transition-colors relative overflow-hidden">
      {/* Background Icon */}
      <div className="absolute -right-4 -bottom-4 text-8xl opacity-[0.03] select-none group-hover:scale-110 transition-transform duration-500">
        {item.icon || "⚡"}
      </div>

      <div>
        <div className="flex justify-between items-start mb-2">
           <div className="w-12 h-12 bg-v-navy rounded flex items-center justify-center text-3xl shadow-inner border border-white/5">
             {item.icon || "⚡"}
           </div>
           {isOwned && (
             <span className="bg-green-500/20 text-green-400 text-[10px] font-black px-2 py-1 rounded border border-green-500/30 uppercase tracking-widest">
               x{quantity} en inventario
             </span>
           )}
        </div>

        <h3 className="text-xl font-black italic uppercase leading-none tracking-tight mb-2 text-v-white">{item.name}</h3>
        <p className="text-xs text-v-white/50 leading-relaxed min-h-[40px]">{item.description}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5">
         <div className="flex items-center justify-between mb-3">
           <span className="text-[10px] font-black uppercase text-v-white/30 tracking-widest">Precio</span>
           <span className="text-xl font-black italic text-v-red">{item.base_price} <span className="text-[10px]">PTS</span></span>
         </div>
         
         {onBuy && (
             <button
               onClick={onBuy}
               disabled={isLoading}
               className="w-full v-btn-primary py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isLoading ? "Procesando..." : "Comprar"}
             </button>
         )}
      </div>
    </div>
  );
}
