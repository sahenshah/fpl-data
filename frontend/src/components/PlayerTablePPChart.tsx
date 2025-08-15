import { useEffect, useState } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import { getCurrentGameweek } from '../App';
import './PlayerTablePPChart.css';

const margin = { left: 12, right: 24, top: 20, bottom: 20 };

interface PlayerTablePPChartProps {
  players: {
    web_name: string;
    predicted_points_gw: number[];
    predicted_xmins_gw?: number[]; // Add this field
  }[];
  gwLabels?: string[];
  mode?: 'xPoints' | 'xMins'; // Add this prop
  onRefresh?: () => void;
}

export default function PlayerTablePPChart({
  players,
  gwLabels,
  mode = 'xPoints', // Default to xPoints
}: PlayerTablePPChartProps) {
  const [gwRange, setGwRange] = useState<[number, number]>([1, 5]);

  useEffect(() => {
    getCurrentGameweek().then(gw => {
      if (gw) {
        setGwRange([gw, gw + 4 > 38 ? 38 : gw + 4]);
      }
    });
  }, []);

  // Compute GW labels based on gwRange
  const computedGwLabels = Array.from(
    { length: gwRange[1] - gwRange[0] + 1 },
    (_, i) => `GW${gwRange[0] + i}`
  );

  const labels = gwLabels ?? computedGwLabels;

  const series = players.map(player => ({
    data: mode === 'xPoints' ? player.predicted_points_gw : player.predicted_xmins_gw ?? [],
    label: player.web_name,
    showMark: true,
    markSize: 2,
  }));

  return (
    <div className="player-table-ppchart">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* <h3 className="player-table-ppchart-header" style={{ marginRight: '4px' }}>
          {mode === 'xPoints' ? 'Predicted Points (Next 5 GWs)' : 'Predicted Minutes (Next 5 GWs)'}
        </h3> */}
      </div>
      <div style={{ overflow: 'hidden', marginLeft: '-40px', width: 'calc(100% + 40px)' }}>
        <LineChart
          height={300}
          series={series}
          xAxis={[{ scaleType: 'point', data: labels }]}
          yAxis={[{ width: 50, min: 0 }]}
          margin={margin}
        />
      </div>
    </div>
  );
}
