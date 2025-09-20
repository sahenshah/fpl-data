import React from 'react';
import type { Element, Team } from '../types/fpl';
import styles from './TeamSelectionPlayerTable.module.css';

interface TableColumn {
  id: string;
  label: React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string | number;
}

interface TeamSelectionPlayerTableProps {
  players: Element[];
  teams: Team[];
  selectedPlayerId?: number | null;
  setSelectedPlayerId?: (id: number | null, player?: Element) => void; // <-- updated
  activeFilters: string[];
  selectable?: boolean;
  onPlayerSelect?: (id: number | null, player?: Element) => void;
}

const gwColumns: TableColumn[] = [];
for (let gw = 1; gw <= 38; gw++) {
  gwColumns.push(
    { id: `pp_gw_${gw}`, label: `xPts GW${gw}`, minWidth: 50, align: 'center' },
    { id: `xmins_gw_${gw}`, label: `xMins GW${gw}`, minWidth: 50, align: 'center' }
  );
}

const positionMap: { [key: number]: string } = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

const columns: TableColumn[] = [
  { id: 'badge', label: '', minWidth: 45, maxWidth: 45, align: 'center' },
  { id: 'web_name', label: 'Player', minWidth: 100, maxWidth: 100, align: 'left' },
  { id: 'element_type', label: 'Pos', minWidth: 60, maxWidth: 60, align: 'center' },
  { id: 'now_cost', label: 'Cost (£)', minWidth: 50, maxWidth: 50, align: 'center', format: (value: number) => (value / 10).toFixed(1) },
  { id: 'total_points', label: 'Total Pts', minWidth: 70, maxWidth: 70, align: 'center' },
  { id: 'form', label: 'Form', minWidth: 50, maxWidth: 50, align: 'center' },
  { id: 'minutes', label: 'Minutes', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'goals_scored', label: 'Goals', minWidth: 50, maxWidth: 50, align: 'center' },
  { id: 'assists', label: 'Assists', minWidth: 50, maxWidth: 50, align: 'center' },
  { id: 'clean_sheets', label: 'Clean Sheets', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'selected_by_percent', label: 'Selected', minWidth: 80, maxWidth: 80, align: 'center', format: (value: number) => value + '%' },
  { id: 'elite_selected_percent', label: 'Elite Selected', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'predicted_points_next5', label: 'xPoints next 5', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'pp_next5_per_m', label: 'xPoints / £M', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'predicted_xmins_next5', label: 'xMins next 5', minWidth: 100, maxWidth: 100, align: 'center' },
  { id: 'pxm_next5_per_m', label: 'xMins / £M', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'expected_goals', label: 'xG', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'expected_assists', label: 'xA', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'expected_goal_involvements', label: 'xGI', minWidth: 80, maxWidth:80, align: 'center' },
  { id: 'expected_goals_per_90', label: 'xG / 90', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'expected_assists_per_90', label: 'xA / 90', minWidth: 80, maxWidth: 79, align: 'center' },
  { id: 'expected_goal_involvements_per_90', label: 'xGI / 90', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'clearances_blocks_interceptions', label: 'CBI', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'recoveries', label: 'Recoveries', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'tackles', label: 'Tackles', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'defensive_contribution', label: 'Def Cons', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'defensive_contribution_per_90', label: 'Def Con / 90', minWidth: 100, maxWidth: 100, align: 'center' },
  { id: 'influence', label: 'Influence', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'creativity', label: 'Creativity', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'threat', label: 'Threat', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'ict_index', label: 'ICT Index', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'bonus', label: 'Bonus', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'bps', label: 'BPS', minWidth: 80, maxWidth: 80, align: 'center' },
  {
    id: 'yellow_cards',
    label: (
      <img
        src="/YC.svg"
        alt="Yellow Cards"
        title="Yellow Cards"
        style={{ width: 18, height: 18, verticalAlign: 'middle' }}
      />
    ),
    minWidth: 40,
    align: 'center',
  },
  {
    id: 'red_cards',
    label: (
      <img
        src="/RC.svg"
        alt="Red Cards"
        title="Red Cards"
        style={{ width: 18, height: 18, verticalAlign: 'middle' }}
      />
    ),
    minWidth: 40,
    align: 'center',
  },
  ...gwColumns,
  { id: 'status', label: 'Status', minWidth: 50, align: 'center' },
];

// Column groups for filters
const filterColumnMap: Record<string, string[]> = {
  "Predicted": [
    'now_cost', 'total_points', 'minutes',
    'predicted_points_next5', 'pp_next5_per_m', 'predicted_xmins_next5', 'pxm_next5_per_m',
    ...gwColumns.map(col => col.id)
  ],
  "xPts": gwColumns.filter(col => col.id.startsWith('pp_gw_')).map(col => col.id),
  "xMins": gwColumns.filter(col => col.id.startsWith('xmins_gw_')).map(col => col.id),
  "General": ['now_cost', 'total_points', 'minutes', 'goals_scored', 'assists', 'clean_sheets', 'form'],
  "Selected %": ['selected_by_percent', 'elite_selected_percent'],
  "Bonus Points": ['bonus', 'bps'],
  "xData": ['expected_goals', 'expected_assists', 'expected_goal_involvements'],
  "Def Cons": ['clearances_blocks_interceptions', 'recoveries', 'tackles', 'defensive_contribution'],
  "Per 90": [
    'expected_goals_per_90', 'expected_assists_per_90', 'expected_goal_involvements_per_90', 'defensive_contribution_per_90'
  ],
  "ICT": ['influence', 'creativity', 'threat', 'ict_index'],
  "Cards": ['yellow_cards', 'red_cards'],
};

const alwaysVisible = ['badge', 'web_name', 'element_type'];
const statusColumn = ['status'];

// Find which pp_gw_# and xmins_gw_# columns have data for players
type SortDirection = 'asc' | 'desc';

const ROWS_PER_PAGE = 50;

const TeamSelectionPlayerTable: React.FC<TeamSelectionPlayerTableProps> = ({
  players,
  teams,
  selectedPlayerId,
  setSelectedPlayerId,
  activeFilters,
  selectable = false, // default to false
  onPlayerSelect,
}) => {
  const [page, setPage] = React.useState(0);
  const [sortBy, setSortBy] = React.useState<string>('total_points');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  const nonEmptyGwColumns = React.useMemo(() => {
    const cols: string[] = [];
    for (let gw = 1; gw <= 38; gw++) {
      const ppCol = `pp_gw_${gw}`;
      const xminsCol = `xmins_gw_${gw}`;
      if (players.some(p => (p as any)[ppCol] !== null && (p as any)[ppCol] !== undefined && (p as any)[ppCol] !== '')) {
        cols.push(ppCol);
      }
      if (players.some(p => (p as any)[xminsCol] !== null && (p as any)[xminsCol] !== undefined && (p as any)[xminsCol] !== '')) {
        cols.push(xminsCol);
      }
    }
    return cols;
  }, [players]);

  const visibleColumnIds = React.useMemo(() => {
    const filterCols = Object.entries(filterColumnMap)
      .filter(([filter]) => activeFilters.includes(filter))
      .flatMap(([, cols]) => cols);

    const gwCols = filterCols.filter(id => id.startsWith('pp_gw_') || id.startsWith('xmins_gw_'));
    const nonGwCols = filterCols.filter(id => !id.startsWith('pp_gw_') && !id.startsWith('xmins_gw_'));
    const filteredGwCols = gwCols.filter(id => nonEmptyGwColumns.includes(id));

    return [...alwaysVisible, ...nonGwCols, ...filteredGwCols, ...statusColumn];
  }, [activeFilters, nonEmptyGwColumns]);

  const visibleColumns = columns.filter(col => visibleColumnIds.includes(col.id));

  // Sorting logic
  const sortedPlayers = React.useMemo(() => {
    let sorted = [...players];
    sorted.sort((a, b) => {
      // If sorting by badge, web_name, or element_type, use string comparison
      if (sortBy === 'web_name') {
        if (a.web_name < b.web_name) return sortDirection === 'asc' ? -1 : 1;
        if (a.web_name > b.web_name) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
      if (sortBy === 'element_type') {
        if (a.element_type < b.element_type) return sortDirection === 'asc' ? -1 : 1;
        if (a.element_type > b.element_type) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
      // For badge, sort by team name
      if (sortBy === 'badge') {
        const teamA = teams.find(t => t.id === a.team)?.short_name || '';
        const teamB = teams.find(t => t.id === b.team)?.short_name || '';
        if (teamA < teamB) return sortDirection === 'asc' ? -1 : 1;
        if (teamA > teamB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
      // For other columns, sort numerically if possible
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      // Fallback to string comparison
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [players, selectedPlayerId, sortBy, sortDirection, teams]);

  // Pagination logic (fix: recalculate pageCount and clamp page if needed)
  const pageCount = React.useMemo(() => Math.max(1, Math.ceil(sortedPlayers.length / ROWS_PER_PAGE)), [sortedPlayers.length]);
  React.useEffect(() => {
    // Clamp page to valid range when data changes
    setPage(p => Math.min(Math.max(0, p), pageCount - 1));
  }, [pageCount, sortedPlayers.length, activeFilters, players]);

  const paginatedPlayers = React.useMemo(
    () => sortedPlayers.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE),
    [sortedPlayers, page]
  );

  const handlePrevPage = () => setPage(p => Math.max(0, p - 1));
  const handleNextPage = () => setPage(p => Math.min(pageCount - 1, p + 1));

  React.useEffect(() => {
    setPage(0);
  }, [players, activeFilters]);

  // Sort handler
  const handleSort = (colId: string) => {
    if (sortBy === colId) {
      setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(colId);
      setSortDirection('desc');
    }
  };

  // Select handler
  const handleSelectPlayer = (playerId: number, playerData: Element) => {
    if (!selectable) return;
    if (setSelectedPlayerId) {
      setSelectedPlayerId(selectedPlayerId === playerId ? null : playerId, playerData);
    }
    if( onPlayerSelect ) {
      onPlayerSelect(selectedPlayerId === playerId ? null : playerId, playerData);
    }
  };

  return (
    <div className={styles['table-container']}>
      <table className={styles['player-table']}>
        <thead>
          <tr>
            {visibleColumns.map(col => {
              let thClass = '';
              if (col.id === 'badge') thClass = styles['sticky-badge'] + ' sticky-badge';
              if (col.id === 'web_name') thClass = styles['sticky-name'] + ' sticky-name';
              return (
                <th
                  key={typeof col.label === 'string' ? col.label : col.id}
                  className={thClass}
                  style={{
                    minWidth: col.minWidth,
                    maxWidth: col.maxWidth,
                    textAlign: col.align || 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => handleSort(col.id)}
                >
                  {col.label}
                  {sortBy === col.id && (
                    <span style={{ marginLeft: 4 }}>
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {paginatedPlayers.map(player => {
            const team = teams.find(t => t.id === player.team);
            const isSelected = selectedPlayerId === player.id;
            return (
              <tr
                key={player.id}
                className={
                  styles['player-row'] +
                  (selectable ? ` ${styles['selectable-row']}` : '') +
                  (isSelected ? ` ${styles['selected-row']}` : '')
                }
                onClick={() => handleSelectPlayer(player.id, player)}
                style={{
                  cursor: selectable ? 'pointer' : 'default',
                  transition: selectable ? 'background 0.15s' : undefined,
                }}
              >
                {visibleColumns.map(col => {
                  let tdClass = '';
                  if (col.id === 'badge') tdClass = styles['sticky-badge'] + ' sticky-badge';
                  if (col.id === 'web_name') tdClass = styles['sticky-name'] + ' sticky-name';

                  // Status column styling
                  if (col.id === 'status') {
                    tdClass += ' ' + styles['status-cell'];
                    const statusValue = (player as any)[col.id];
                    if (statusValue === 'a') tdClass += ' ' + styles['status-green'];
                    else if (['u', 's', 'i'].includes(statusValue)) tdClass += ' ' + styles['status-red'];
                    else if (statusValue === 'd') tdClass += ' ' + styles['status-yellow'];
                  }

                  let value: React.ReactNode = null;
                  switch (col.id) {
                    case 'badge':
                      value = team ? (
                        <img
                          src={`/team-kits/${team.short_name}.png`}
                          alt={team.short_name}
                          className={styles['team-img']}
                        />
                      ) : null;
                      break;
                    case 'web_name':
                      value = player.web_name;
                      break;
                    case 'element_type':
                      value = positionMap[player.element_type];
                      break;
                    default:
                      value =
                        col.format && (player as any)[col.id] !== undefined
                          ? col.format((player as any)[col.id])
                          : (player as any)[col.id] !== undefined
                          ? (player as any)[col.id]
                          : '';
                  }
                  return (
                    <td
                      key={col.id}
                      className={tdClass}
                      style={{
                        minWidth: col.minWidth,
                        maxWidth: col.maxWidth,
                        textAlign: col.align || 'center',
                        padding: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        background: tdClass ? undefined : undefined,
                        zIndex: tdClass ? 3 : undefined,
                      }}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className={styles['pagination-container']}>
        <button
          className={styles['pagination-btn']}
          onClick={handlePrevPage}
          disabled={page === 0}
        >
          Prev
        </button>
        <span className={styles['pagination-info']}>
          Page {page + 1} of {pageCount}
        </span>
        <button
          className={styles['pagination-btn']}
          onClick={handleNextPage}
          disabled={page >= pageCount - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default TeamSelectionPlayerTable;