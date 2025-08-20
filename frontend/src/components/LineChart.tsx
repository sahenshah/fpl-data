import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { getCurrentGameweek } from '../App';
import './LineChart.css';

interface Next5LineChartProps {
  players: {
    web_name: string;
    predicted_points_gw: number[];
    predicted_xmins_gw?: number[];
  }[];
  gwLabels?: string[];
  mode?: 'xPoints' | 'xMins';
  onRefresh?: () => void;
}

export async function getLastPredictedGw(): Promise<number | undefined> {
  try {
    const res = await fetch('/api/fpl_data/last_predicted_gw');
    const data = await res.json();
    return data?.last_predicted_gw;
  } catch (e) {
    console.error('Failed to fetch last predicted gw:', e);
    return undefined;
  }
}

export default function Next5LineChart({
  players,
  gwLabels,
  mode = 'xPoints',
}: Next5LineChartProps) {
  const [gwRange, setGwRange] = useState<[number, number]>([1, 38]);

  useEffect(() => {
    async function fetchGwRange() {
      const [currentGw, lastPredGw] = await Promise.all([
        getCurrentGameweek(),
        getLastPredictedGw(),
      ]);
      if (currentGw && lastPredGw && lastPredGw >= currentGw) {
        setGwRange([currentGw, lastPredGw]);
      }
    }
    fetchGwRange();
  }, []);

  const gwCount = gwRange[1] - gwRange[0] + 1;
  // Compute GW labels based on gwRange
  const computedGwLabels = Array.from(
    { length: gwCount },
    (_, i) => `GW${gwRange[0] + i}`
  );

  const labels = computedGwLabels ?? gwLabels;

  // Prepare data for recharts: one object per GW, with each player's value as a key
  const data = labels.map((label, idx) => {
    const obj: { name: string; [key: string]: number | string } = { name: label };
    players.forEach(player => {
      const arr = mode === 'xPoints' ? player.predicted_points_gw : player.predicted_xmins_gw ?? [];
      // For each GW, use the value from the player's array if it exists, else 0
      obj[player.web_name] = arr[idx] ?? 0;
    });
    return obj;
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsLineChart
        data={data}
        margin={{
          top: 8,
          right: 40,
          left: -20,
          bottom: 8,
        }}
        style={{ background: '#333' }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip
          content={({ label, payload, active }) =>
            active && payload && payload.length ? (
              <div
                style={{
                  background: "rgba(24, 24, 32, 0.9)",
                  border: "1px solid #888",
                  borderRadius: 4,
                  padding: 8,
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>{label}</div>
                {payload.map((entry, idx) => (
                  <div key={idx} style={{ color: entry.color }}>
                    {entry.name}: {entry.value}
                  </div>
                ))}
              </div>
            ) : null
          }
        />
        {players.map((player, idx) => (
          <Line
            key={player.web_name}
            type="monotone"
            dataKey={player.web_name}
            stroke={`hsl(${(idx * 360) / players.length}, 70%, 55%)`}
            activeDot={{ r: 6 }}
            dot={false}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
