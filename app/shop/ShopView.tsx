"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { PowerUpCard } from "@/components/PowerUpCard";
import { buyPowerUp, getUserInventory } from "@/lib/actions/inventory";
import { FeedbackBanner } from "@/components/FeedbackBanner";
import { useRouter } from "next/navigation";

import { haptic } from "@/lib/utils/haptics";

interface ShopViewProps {
  initialLeagues: any[];
  userId: string;
  powerUps: any[];
  initialInventory: any[];
}

export function ShopView({ initialLeagues, userId, powerUps, initialInventory }: ShopViewProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [activeLeagueId, setActiveLeagueId] = useState(initialLeagues[0]?.league_id || initialLeagues[0]?.leagues?.id);
  const [inventory, setInventory] = useState(initialInventory);
  const [loadingInv, setLoadingInv] = useState(false);
  const [status, setStatus] = useState<{ type: string; message: string } | null>(null);

  // Derive active participation to get points and league name
  const activeParticipation = useMemo(() => 
    initialLeagues.find(l => (l.league_id || l.leagues?.id) === activeLeagueId), 
    [activeLeagueId, initialLeagues]
  );
  
  useEffect(() => {
     async function loadInventory() {
         setLoadingInv(true);
         const data = await getUserInventory(activeLeagueId, userId);
         setInventory(data || []);
         setLoadingInv(false);
     }
     if (activeLeagueId) loadInventory();
  }, [activeLeagueId, userId]);

  // Auto-dismiss status banner after 5 seconds
  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleBuy = (powerUpCode: string) => {
    if (!confirm(`¿Confirmar compra del Power-Up ${powerUpCode}?`)) return;

    haptic.medium();
    setStatus(null);
    startTransition(async () => {
       const res = await buyPowerUp(activeLeagueId, userId, powerUpCode);
       if (res.success) {
         haptic.success();
         setStatus({ type: "success", message: res.message || "Compra realizada" });
         router.refresh();
         // Update inventory locally too for immediate feedback
         const updatedInv = await getUserInventory(activeLeagueId, userId);
         setInventory(updatedInv || []);
       } else {
         haptic.error();
         setStatus({ type: "error", message: res.error as string });
       }
    });
  };

  const getQuantity = (typeId: string) => {
      const item = inventory.find((i: any) => (i.powerup_types?.id === typeId) || (i.powerup_type_id === typeId));
      return item ? item.quantity : 0;
  };

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-xl lg:max-w-4xl px-4 sm:px-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 py-6">      
      {/* League Selector */}
      <div className="v-panel p-4 space-y-2">
        <label className="text-[8px] font-black uppercase text-v-white/40 ml-1 tracking-[0.2em]">Tienda Operativa en:</label>
        <select 
          value={activeLeagueId}
          onChange={(e) => setActiveLeagueId(e.target.value)}
          className="w-full bg-v-navy/50 border border-white/10 px-4 py-2 text-xs font-black italic focus:border-v-red outline-none transition-colors"
        >
          {initialLeagues.map(l => (
            <option key={l.league_id || l.leagues?.id} value={l.league_id || l.leagues?.id}>
              {l.leagues?.name || l.name}
            </option>
          ))}
        </select>
         {activeParticipation && (
          <div className="flex justify-between items-center pt-2 mt-2 border-t border-white/5">
             <div>
                <p className="text-[7px] font-black uppercase text-v-white/40 mb-0.5">Puntos Totales</p>
                <p className="text-xl font-black italic text-v-white">{activeParticipation.total_points?.toLocaleString() || 0} PTS</p>
             </div>
          </div>
        )}
      </div>

      <FeedbackBanner status={status} />

      {/* Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${loadingInv ? 'opacity-50 pointer-events-none' : ''}`}>
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

