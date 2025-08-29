import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceArea } from 'recharts';
import './ScatterChart.css';
import { useState, useMemo } from 'react';

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
    const tooltipWidth = 140;
    const tooltipHeight = 90;
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
      pointerEvents: 'none',
      zIndex: 1000,
      width: tooltipWidth,
      minWidth: tooltipWidth,
      maxWidth: tooltipWidth,
      textAlign: 'left',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      background: '#6e6e6e63',
      borderRadius: 14,
      padding: 14,
      color: '#fff',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      border: '1px solid #444',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    };
    const valueStyle: React.CSSProperties = {
      background: '#17191d',
      borderRadius: 8,
      padding: '8px 12px',
      marginBottom: 0,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    };
    const labelStyle: React.CSSProperties = {
      textAlign: 'left',
      flex: 1,
      fontWeight: 400,
    };
    const rightValueStyle: React.CSSProperties = {
      textAlign: 'right',
      minWidth: 40,
      fontWeight: 600,
    };
    const dotStyle: React.CSSProperties = {
      display: 'inline-block',
      width: 14,
      height: 14,
      borderRadius: '50%',
      background: point.fill,
      marginRight: 8,
      border: '2px solid #fff',
      verticalAlign: 'middle',
    };
    return (
      <div className="scatter-tooltip" style={style}>
        <div style={{ marginBottom: 2, display: 'flex', alignItems: 'center' }}>
          <span style={dotStyle}></span>
          <strong>{point.web_name}</strong>
        </div>
        <div style={valueStyle}>
          <span style={labelStyle}>Cost:</span>
          <span style={rightValueStyle}>{point.x}</span>
        </div>
        <div style={valueStyle}>
          <span style={labelStyle}>{point.yLabel}:</span>
          <span style={rightValueStyle}>{point.y}</span>
        </div>
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

  // Assign a random color to each player ONCE, locked for the session
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    players.forEach(player => {
      map.set(player.web_name, getRandomColor());
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.map(p => p.web_name).join(',')]);

  const data = players
    .map(player => ({
      x: player.now_cost / 10,
      y: Number(player[yKey]),
      web_name: player.web_name,
      yLabel,
      fill: colorMap.get(player.web_name) || "#8884d8",
    }))
    .filter(d => typeof d.x === 'number' && typeof d.y === 'number' && !isNaN(d.x) && !isNaN(d.y));

  // Track hovered dot by web_name
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  // Custom dot shape with hover logic
  function CustomDot(props: any) {
    const { cx, cy, fill, payload } = props;
    const isActive = hoveredName === payload.web_name;
    const isAnyHovered = hoveredName !== null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={isActive ? fill : 'transparent'}
        stroke={isAnyHovered ? (isActive ? fill : '#bbb') : fill}
        strokeWidth={3}
        style={{ transition: 'all 0.15s', cursor: 'pointer' }}
        onMouseOver={() => setHoveredName(payload.web_name)}
        onMouseOut={() => setHoveredName(null)}
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={500}>
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
          tick={{ fill: "#fff" }} 
          tickFormatter={v => `£${v}m`}
          domain={[xMin, xMax]}
          ticks={xTicks}
        />
        <YAxis
          type="number"
          dataKey="y"
          tick={{ fill: "#fff" }} 
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
          shape={(props: any) => (
            <CustomDot {...props} hoveredName={hoveredName} />
          )}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default ScatterChartComponent;
