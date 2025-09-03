import * as React from 'react';
import type { Element } from '../types/fpl';
import styles from './PlayerPastSeasons.module.css';

// Import SVGs from the public folder
const YCIcon = () => (
  <img src="/YC.svg" alt="Yellow Card" style={{ width: 18, height: 18, verticalAlign: 'middle' }} />
);
const RCIcon = () => (
  <img src="/RC.svg" alt="Red Card" style={{ width: 18, height: 18, verticalAlign: 'middle' }} />
);

const columns = [
  { label: 'Season', key: 'season_name', align: 'center' },
  { label: 'Start Cost', key: 'start_cost', align: 'center', format: (v: number) => (v / 10).toFixed(1) },
  { label: 'End Cost', key: 'end_cost', align: 'center', format: (v: number) => (v / 10).toFixed(1) },
  { label: 'Points', key: 'total_points', align: 'center' },
  { label: 'Minutes', key: 'minutes', align: 'center' },
  { label: 'Goals', key: 'goals_scored', align: 'center' },
  { label: 'Assists', key: 'assists', align: 'center' },
  { label: 'Clean Sheets', key: 'clean_sheets', align: 'center' },
  { label: 'Goals Conceded', key: 'goals_conceded', align: 'center' },
  { label: 'Own Goals', key: 'own_goals', align: 'center' },
  { label: 'Pens Saved', key: 'penalties_saved', align: 'center' },
  { label: 'Pens Missed', key: 'penalties_missed', align: 'center' },
  { label: <YCIcon />, key: 'yellow_cards', align: 'center' },
  { label: <RCIcon />, key: 'red_cards', align: 'center' },
  { label: 'Saves', key: 'saves', align: 'center' },
  { label: 'Bonus', key: 'bonus', align: 'center' },
  { label: 'BPS', key: 'bps', align: 'center' },
  { label: 'Influence', key: 'influence', align: 'center' },
  { label: 'Creativity', key: 'creativity', align: 'center' },
  { label: 'Threat', key: 'threat', align: 'center' },
  { label: 'ICT Index', key: 'ict_index', align: 'center' },
  { label: 'Def Con', key: 'defensive_contribution', align: 'center' },
  { label: 'Starts', key: 'starts', align: 'center' },
  { label: 'xG', key: 'expected_goals', align: 'center' },
  { label: 'xA', key: 'expected_assists', align: 'center' },
  { label: 'xGI', key: 'expected_goal_involvements', align: 'center' },
  { label: 'xGC', key: 'expected_goals_conceded', align: 'center' },
];

const PlayerPastSeasons: React.FC<{ player: Element }> = ({ player }) => {
  const [historyPast, setHistoryPast] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch('/static_json/element_summary_history_past.json')
      .then(res => res.json())
      .then(data => {
        const filtered = Array.isArray(data)
          ? data.filter((row: any) => row.element_id === player.id)
          : [];
        setHistoryPast(filtered);
      })
      .catch((err) => { console.error('Fetch error:', err); });
  }, [player.id]);

  // Remove duplicates
  const rows = historyPast.filter((row, idx, arr) =>
    arr.findIndex(
      r => r.season_name === row.season_name && r.element_id === row.element_id
    ) === idx
  );

  return (
    <div>
      <div className={styles['past-seasons-table-container']}>
        <table className={styles['past-seasons-table']}>
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={styles['past-seasons-th']}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id + row.season_name} className={styles['past-seasons-row']}>
                {columns.map((col, colIdx) => (
                  <td
                    key={col.key}
                    className={[
                      styles['past-seasons-td'],
                      colIdx === 0 ? styles['first'] : '',
                      colIdx === columns.length - 1 ? styles['last'] : ''
                    ].filter(Boolean).join(' ')}
                    style={{ textAlign: col.align as React.CSSProperties['textAlign'] }}
                  >
                    {col.format
                      ? col.format(row[col.key])
                      : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerPastSeasons;