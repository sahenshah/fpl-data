import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import './ScatterChart.css';

interface Player {
  id: number | string;
  web_name: string;
  now_cost: number;
  [key: string]: any;
}

interface ScatterChartProps {
  players: Player[];
  yKey: string;
  yLabel?: string;
}

// Generate a random color for each point
function getRandomColor() {
  const h = Math.floor(Math.random() * 360);
  const s = 60 + Math.floor(Math.random() * 20); // 60-80%
  const l = 45 + Math.floor(Math.random() * 20); // 45-65%
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// Set tooltip position to follow the cursor and clamp to viewport (right and bottom)
const CustomTooltip = ({ active, payload, coordinate }: any) => {
  if (active && payload && payload.length && payload[0].payload) {
    const point = payload[0].payload;
    const tooltipWidth = 120;
    const tooltipHeight = 70;
    // Default positions
    let left = coordinate ? coordinate.x + 10 : 0;
    let top = coordinate ? coordinate.y - 30 : 0;
    // Clamp to viewport (right and bottom)
    if (typeof window !== 'undefined') {
      const maxLeft = window.innerWidth - tooltipWidth - 10;
      const maxTop = window.innerHeight - tooltipHeight - 10;
      if (left > maxLeft) left = coordinate.x - tooltipWidth - 10;
      left = Math.max(0, Math.min(left, maxLeft));
      top = Math.max(0, Math.min(top, maxTop));
    }
    const style: React.CSSProperties = {
      position: 'absolute',
      left,
      top,
      pointerEvents: 'none',
      zIndex: 1000,
      transition: 'none',
      width: tooltipWidth,
      minWidth: tooltipWidth,
      maxWidth: tooltipWidth,
      textAlign: 'left',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
    };
    return (
      <div className="scatter-tooltip" style={style}>
        <div><strong>{point.web_name}</strong></div>
        <div>Cost: {point.x}</div>
        <div>{point.yLabel}: {point.y}</div>
      </div>
    );
  }
  return null;
};

const ScatterChartComponent = ({ players, yKey, yLabel = 'Value' }: ScatterChartProps) => {
  // Assign a random color to each point
  const data = players
    .map(player => ({
      x: player.now_cost / 10,
      y: Number(player[yKey]),
      web_name: player.web_name,
      yLabel,
      fill: getRandomColor(),
    }))
    .filter(d => typeof d.x === 'number' && typeof d.y === 'number' && !isNaN(d.x) && !isNaN(d.y));

  // Calculate min/max for axes
  const xVals = data.map(d => d.x);
  const yVals = data.map(d => d.y);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);
  const yMin = Math.min(...yVals);
  const yMax = Math.max(...yVals);

  // Calculate ticks for a 2x2 grid (3 ticks: min, mid, max)
  const xTicks = [xMin, (xMin + xMax) / 2, xMax];
  const yTicks = [yMin, (yMin + yMax) / 2, yMax];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart
        margin={{
          top: 20,
          right: 40,
          bottom: 20,
          left: -15, 
        }}
        style={{ background: '#333' }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          name="Cost"
          unit=""
          tickFormatter={v => `£${v}m`}
          domain={[xMin, xMax]}
          ticks={xTicks}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          domain={[yMin, yMax]}
          ticks={yTicks}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ strokeDasharray: '3 3' }}
          isAnimationActive={false}
          position={undefined}
        />
        <Scatter
          name={yLabel}
          data={data}
          fill="#8884d8"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default ScatterChartComponent;
