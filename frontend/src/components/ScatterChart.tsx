import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceArea } from 'recharts';
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
    let left = coordinate ? coordinate.x + 10 : 0;
    let top = coordinate ? coordinate.y : 0;
    if (typeof window !== 'undefined') {
      const maxLeft = window.innerWidth - tooltipWidth - 10;
      left = Math.min(left, maxLeft);
      left = Math.max(0, left);
      const maxTop = window.innerHeight - tooltipHeight - 10;
      top = Math.min(top, maxTop);
      top = Math.max(0, top);
    }
    const style: React.CSSProperties = {
      // Remove position: 'fixed'
      pointerEvents: 'none',
      zIndex: 1000,
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
  // Always show from 4m to 14.5m
  const xMin = 4;
  const xMax = 14.5;
  const yVals = players.map(player => Number(player[yKey])).filter(v => !isNaN(v));
  const yMin = 0;
  const yMax = Math.max(...yVals);

  // Midpoints for grid split
  const xMid = (xMin + xMax) / 2;
  const yMid = (yMin + yMax) / 2;

  // Calculate ticks for a 2x2 grid (3 ticks: min, mid, max)
  const xTicks = [xMin, xMid, xMax];
  const yTicks = [yMin, yMid, yMax];

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

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart
        margin={{
          top: 20,
          right: 40,
          bottom: 20,
          left: -15, 
        }}
      >
        {/* Diagonal gradient from dark green (top left) to light green (top right) to yellow (bottom left/right) */}
        <defs>
          <linearGradient id="chartDiagonalGradient" x1="0" y1="-0.75" x2="0.75" y2="1.25">
            <stop offset="0%" stopColor="#03ff03ff" />      {/* Dark green top left */}
            <stop offset="40%" stopColor="#009600ff" />      {/* Light green top right */}
            <stop offset="60%" stopColor="#ffff00" />      {/* Yellow bottom */}
            <stop offset="80%" stopColor="#ff6600ff" />     {/* Yellow bottom right */}
            <stop offset="100%" stopColor="#ff0000ff" />     {/* Yellow bottom right */}
          </linearGradient>
        </defs>
        <ReferenceArea
          x1={xMin}
          x2={xMax}
          y1={yMin}
          y2={yMax}
          fill="url(#chartDiagonalGradient)"
          fillOpacity={0.23}
          ifOverflow="extendDomain"
        />
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
