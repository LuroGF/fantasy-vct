"use client";

import { useTransition } from "react";
import { PowerUpCard } from "@/components/PowerUpCard";
import { buyPowerUp } from "@/lib/actions/inventory";

interface ShopViewProps {
  participant: {
    league_id: string;
    profile_id: string;
    total_points: number;
  };
  powerUps: any[];
  inventory: any[];
}

export function ShopView({ participant, powerUps, inventory }: ShopViewProps) {
  const [isPending, startTransition] = useTransition();

  const handleBuy = (powerUpCode: string) => {
    // Basic confirmation
    if (!confirm(`¿Comprar ${powerUpCode}?`)) return;

    startTransition(async () => {
       const res = await buyPowerUp(participant.league_id, participant.profile_id, powerUpCode);
       if (res.success) {
         // Refreshing the page or state would be better, but alert for now
         alert(res.message);
         window.location.reload();
       } else {
         alert("Error: " + res.error);
       }
    });
  };

  const getQuantity = (typeId: string) => {
      const item = inventory.find(i => i.powerup_types?.id === typeId || i.powerup_type_id === typeId);
      return item ? item.quantity : 0;
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-20">
      
      {/* Header with Budget */}
      <div className="flex items-center justify-between px-1">
         <h1 className="text-2xl font-black italic uppercase text-v-white tracking-wider">Tienda de Cartas</h1>
         <div className="text-right">
            <p className="text-[10px] font-black uppercase text-v-white/40 tracking-widest">Puntos Acumulados</p>
            <p className="text-xl font-black italic text-v-red">{participant.total_points || 0} PTS</p>
         </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {powerUps.map((item) => (
          <PowerUpCard 
            key={item.id} 
            item={item} 
            quantity={getQuantity(item.id)}
            onBuy={() => handleBuy(item.code)}
            isLoading={isPending}
          />
        ))}
      </div>
      
      {powerUps.length === 0 && (
          <div className="text-center py-10 opacity-50">
              <p>No hay artículos disponibles por el momento.</p>
          </div>
      )}
    </div>
  );
}
