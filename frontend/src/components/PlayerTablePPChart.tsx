import { LineChart } from '@mui/x-charts/LineChart';
import IconButton from '@mui/material/IconButton';
import RefreshIcon from '@mui/icons-material/Refresh';
import './PlayerTablePPChart.css';

const margin = { left: 12, right: 24, top: 20, bottom: 20 };

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
    showMark: true,
    markSize: 2, // Reduce this value for smaller dots (default is 8)
  }));

  return (
    <div className="player-table-ppchart">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <h3 className="player-table-ppchart-header" style={{ marginRight: '4px' }}>xPoints (Next 5 GWs)</h3>
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
