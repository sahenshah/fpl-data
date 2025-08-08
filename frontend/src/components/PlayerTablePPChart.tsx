import { LineChart } from '@mui/x-charts/LineChart';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import './PlayerTablePPChart.css';

const margin = { right: 24 };

interface PlayerTablePPChartProps {
  players: {
    web_name: string;
    predicted_points_gw: number[];
  }[];
  gwLabels?: string[];
  onRefresh?: () => void;
}

export default function PlayerTablePPChart({
  players,
  gwLabels = ['GW1', 'GW2', 'GW3', 'GW4', 'GW5'],
  onRefresh,
}: PlayerTablePPChartProps) {
  const series = players.map(player => ({
    data: player.predicted_points_gw,
    label: player.web_name,
  }));

  return (
    <div className="player-table-ppchart">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 0 }}>xPoints (Next 5 GWs)</h3>
        {onRefresh && (
          <IconButton color="primary" onClick={onRefresh} aria-label="refresh chart" size="small">
            <RefreshIcon />
          </IconButton>
        )}
      </div>
      <LineChart
        height={300}
        series={series}
        xAxis={[{ scaleType: 'point', data: gwLabels }]}
        yAxis={[{ width: 50, min: 0 }]}
        margin={margin}
      />
    </div>
  );
}
