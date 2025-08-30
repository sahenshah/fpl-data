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
  { label: 'Season', key: 'season_name', align: 'left' },
  { label: 'Start Cost', key: 'start_cost', align: 'right', format: (v: number) => (v / 10).toFixed(1) },
  { label: 'End Cost', key: 'end_cost', align: 'right', format: (v: number) => (v / 10).toFixed(1) },
  { label: 'Points', key: 'total_points', align: 'right' },
  { label: 'Minutes', key: 'minutes', align: 'right' },
  { label: 'Goals', key: 'goals_scored', align: 'right' },
  { label: 'Assists', key: 'assists', align: 'right' },
  { label: 'Clean Sheets', key: 'clean_sheets', align: 'right' },
  { label: 'Goals Conceded', key: 'goals_conceded', align: 'right' },
  { label: 'Own Goals', key: 'own_goals', align: 'right' },
  { label: 'Pens Saved', key: 'penalties_saved', align: 'right' },
  { label: 'Pens Missed', key: 'penalties_missed', align: 'right' },
  { label: <YCIcon />, key: 'yellow_cards', align: 'right' }, // Use icon
  { label: <RCIcon />, key: 'red_cards', align: 'right' },    // Use icon
  { label: 'Saves', key: 'saves', align: 'right' },
  { label: 'Bonus', key: 'bonus', align: 'right' },
  { label: 'BPS', key: 'bps', align: 'right' },
  { label: 'Influence', key: 'influence', align: 'right' },
  { label: 'Creativity', key: 'creativity', align: 'right' },
  { label: 'Threat', key: 'threat', align: 'right' },
  { label: 'ICT Index', key: 'ict_index', align: 'right' },
  { label: 'Def Con', key: 'defensive_contribution', align: 'right' },
  { label: 'Starts', key: 'starts', align: 'right' },
  { label: 'xG', key: 'expected_goals', align: 'right' },
  { label: 'xA', key: 'expected_assists', align: 'right' },
  { label: 'xGI', key: 'expected_goal_involvements', align: 'right' },
  { label: 'xGC', key: 'expected_goals_conceded', align: 'right' },
];

const PlayerPastSeasons: React.FC<{ player: Element }> = ({ player }) => {
  const [historyPast, setHistoryPast] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch(`/api/fpl_data/element-summary-history-past/${player.id}`)
      .then(res => res.json())
      .then(data => {
        setHistoryPast(data.history_past || []);
      })
      .catch(() => {});
  }, [player.id]);

  // Remove duplicates
  const rows = historyPast.filter((row, idx, arr) =>
    arr.findIndex(
      r => r.season_name === row.season_name && r.id === row.id
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