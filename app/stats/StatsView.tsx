"use client";

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartOptions
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { StatusBadge } from '@/components/StatusBadge';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Player {
  id: string;
  role: string;
}

interface RosterEntry {
  player_id: string;
  players?: Player; 
  role?: string; // Fallback structure
}

interface ParticipantScore {
  gameweek_id: number;
  points_earned: number;
  gameweek: { name: string };
}

interface StatsViewProps {
  scoreHistory: any[]; // ParticipantScore
  roster: any[]; // RosterEntry
  totalPoints: number;
  rank: number;
}

export default function StatsView({ scoreHistory, roster, totalPoints, rank }: StatsViewProps) {

  // --- DATA PROCESSING --

  // 1. Points Evolution (Line Chart)
  const lineData = useMemo(() => {
    const labels = scoreHistory.map(s => `J${s.gameweek_id}`);
    const dataPoints = scoreHistory.map(s => s.points_earned);

    return {
      labels,
      datasets: [
        {
          label: 'Puntos por Jornada',
          data: dataPoints,
          borderColor: '#FF4655',
          backgroundColor: 'rgba(255, 70, 85, 0.2)',
          tension: 0.3,
          pointBackgroundColor: '#0F1923',
          pointBorderColor: '#FF4655',
          pointBorderWidth: 2,
          pointRadius: 4,
          fill: true
        }
      ]
    };
  }, [scoreHistory]);

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: 'rgba(255, 255, 255, 0.5)' }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.5)' }
      }
    },
    plugins: {
      legend: { display: false }
    }
  };

  // 2. Role Distribution (Doughnut)
  const doughnutData = useMemo(() => {
    const roles: Record<string, number> = {
      'Duelista': 0,
      'Iniciador': 0,
      'Controlador': 0,
      'Centinela': 0
    };

    roster.forEach((r: any) => {
      // Handle different data shapes if joined differently
      const role = r.pro_players?.role || r.role;
      if (role && roles[role] !== undefined) {
        roles[role]++;
      }
    });

    return {
      labels: Object.keys(roles),
      datasets: [
        {
          data: Object.values(roles),
          backgroundColor: [
            '#FF4655', // Duelist (Red)
            '#bd3944', // Initiator (Dark Red)
            '#ece8e1', // Controller (White)
            '#53212b'  // Sentinel (Dark Brown)
          ],
          borderWidth: 0
        }
      ]
    };
  }, [roster]);

  const doughnutOptions: ChartOptions<'doughnut'> = {
    cutout: '70%',
    plugins: {
      legend: { 
        position: 'right',
        labels: { color: 'rgba(255, 255, 255, 0.7)', font: { size: 10, family: 'sans-serif' } }
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="v-panel p-4 flex flex-col items-center justify-center gap-1 border-l-v-red">
          <span className="text-[10px] uppercase font-black text-v-white/40 tracking-widest">Total Puntos</span>
          <span className="text-3xl font-oswald font-bold text-white leading-none">{totalPoints}</span>
        </div>
        <div className="v-panel p-4 flex flex-col items-center justify-center gap-1">
          <span className="text-[10px] uppercase font-black text-v-white/40 tracking-widest">Ranking Global</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-oswald font-bold text-white leading-none">#{rank > 0 ? rank : '-'}</span>
            {rank > 0 && <StatusBadge label="Top 5%" variant="white" />}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="flex flex-col gap-4">
        
        {/* Graph 1 */}
        <div className="v-panel p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-v-white/80">Rendimiento</h3>
            <span className="text-[10px] text-v-white/30">Últimas 5 Jornadas</span>
          </div>
          <div className="h-48 w-full">
            {scoreHistory.length > 0 ? (
               <Line data={lineData} options={lineOptions} />
            ) : (
                <div className="h-full flex items-center justify-center text-v-white/20 text-xs">Sin datos suficientes</div>
            )}
          </div>
        </div>

        {/* Graph 2 */}
        <div className="v-panel p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-v-white/80">Composición</h3>
            <span className="text-[10px] text-v-white/30">Roles en plantilla</span>
          </div>
          <div className="h-40 w-full flex items-center justify-center">
             <div className="w-56">
                <Doughnut data={doughnutData} options={doughnutOptions} />
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
