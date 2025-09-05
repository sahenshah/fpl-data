import * as React from 'react';
import type { Element, Team } from '../types/fpl';
import './PlayerTableBody.css';
import PlayerDetail from './PlayerDetail';
import Dialog from '@mui/material/Dialog';
import { getCurrentGameweek } from '../App'; 
const positionMap: Record<number, string> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

interface PlayerTableBodyProps {
  players: Element[];
  teams: Team[];
  checked: { [id: number]: boolean };
  setChecked: React.Dispatch<React.SetStateAction<{ [id: number]: boolean }>>;
  activeFilters: string[];
}

const currentGw = await getCurrentGameweek();

// Generate GW columns for xPts and xMins
const gwColumns: { id: string; label: string; minWidth: number; align: string }[] = [];
for (let gw = 1; gw <= 38; gw++) {
  gwColumns.push(
    { id: `pp_gw_${gw}`, label: `xPts GW${gw}`, minWidth: 50, align: 'center' },
    { id: `xmins_gw_${gw}`, label: `xMins GW${gw}`, minWidth: 50, align: 'center' }
  );
}

const xPtsColumns = Array.from({ length: 38 }, (_, i) => `pp_gw_${i + 1}`);
const xMinsColumns = Array.from({ length: 38 }, (_, i) => `xmins_gw_${i + 1}`);

const filterColumnMap: Record<string, string[]> = {
  "Predicted": ['now_cost', 'total_points', 'minutes', 'predicted_points_next5', 'pp_next5_per_m', 'predicted_xmins_next5', 'pxm_next5_per_m'],
  "xPts": xPtsColumns,
  "xMins": xMinsColumns,
  "General": ['now_cost', 'total_points', 'minutes', 'goals_scored', 'assists', 'clean_sheets', 'form'],
  "Selected %": ['selected_by_percent', 'elite_selected_percent'],
  "Bonus Points": ['bonus', 'bps'],
  "xData": ['expected_goal_involvements', 'expected_goals', 'expected_assists'],
  "Def Cons": ['clearances_blocks_interceptions', 'recoveries', 'tackles', 'defensive_contribution'],
  "Per 90": ['expected_goals_per_90', 'expected_assists_per_90', 'expected_goal_involvements_per_90', 'defensive_contribution_per_90'],
  "ICT": ['influence', 'creativity', 'threat', 'ict_index'],
  "Cards": ['yellow_cards', 'red_cards'],
};

type TableColumn = {
  id: string;
  label: React.ReactNode;
  minWidth: number;
  maxWidth?: number;
  align: string;
  format?: (value: any) => React.ReactNode;
};

const columns: TableColumn[] = [
  { id: 'select', label: '', minWidth: 30, maxWidth: 30, align: 'center' },
  { id: 'badge', label: '', minWidth: 40, maxWidth: 40, align: 'center' },
  { id: 'web_name', label: 'Player', minWidth: 100, maxWidth: 100, align: 'left' },
  { id: 'element_type', label: 'Position', minWidth: 50, maxWidth: 50, align: 'center' },
  { id: 'now_cost', label: 'Cost (£)', minWidth: 50, maxWidth: 50, align: 'center', format: (value: number) => (value / 10).toFixed(1) },
  { id: 'total_points', label: 'Total Points', minWidth: 80, maxWidth: 80, align: 'center' },
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
  { id: 'defensive_contribution_per_90', label: 'Def Con / 90', minWidth: 100, maxWidth: 100, align: 'center' },

  { id: 'clearances_blocks_interceptions', label: 'CBI', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'recoveries', label: 'Recoveries', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'tackles', label: 'Tackles', minWidth: 80, maxWidth: 80, align: 'center' },
  { id: 'defensive_contribution', label: 'Def Cons', minWidth: 80, maxWidth: 80, align: 'center' },


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
  //loop through the following to generate columns for the gameweeks which have valid data
  ...gwColumns,
  { id: 'status', label: 'Status', minWidth: 50, align: 'center' },
];

type Order = 'asc' | 'desc';

export default function PlayerTableBody({ players, teams, checked, setChecked, activeFilters }: PlayerTableBodyProps) {
  const teamMap = React.useMemo(() => {
    const map: Record<number, string> = {};
    teams.forEach(team => {
      map[team.id] = team.short_name;
    });
    return map;
  }, [teams]);

  const teamFullNameMap = React.useMemo(() => {
    const map: Record<number, string> = {};
    teams.forEach(team => {
      map[team.id] = team.name;
    });
    return map;
  }, [teams]);

  const [page, setPage] = React.useState(0);
  const rowsPerPage = 10;

  // Sorting state: default to predicted_points_next5, descending
  const [orderBy, setOrderBy] = React.useState<string>('total_points');
  const [order, setOrder] = React.useState<Order>('desc');

  // Modal state for player detail
  const [selectedPlayer, setSelectedPlayer] = React.useState<Element | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Prepare sortable data
  const sortedPlayers = React.useMemo(() => {
    let sortable = [...players];
    if (orderBy === 'element_type') {
      sortable.sort((a, b) =>
        order === 'asc'
          ? (positionMap[a.element_type] || '').localeCompare(positionMap[b.element_type] || '')
          : (positionMap[b.element_type] || '').localeCompare(positionMap[a.element_type] || '')
      );
    } else if (orderBy === 'web_name') {
      sortable.sort((a, b) =>
        order === 'asc'
          ? a.web_name.localeCompare(b.web_name)
          : b.web_name.localeCompare(a.web_name)
      );
    } else if (orderBy === 'team') {
      sortable.sort((a, b) =>
        order === 'asc'
          ? (teamMap[a.team] || '').localeCompare(teamMap[b.team] || '')
          : (teamMap[b.team] || '').localeCompare(teamMap[a.team] || '')
      );
    } else {
      sortable.sort((a, b) => {
        const aValue = a[orderBy as keyof Element];
        const bValue = b[orderBy as keyof Element];
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return order === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return order === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }
    return sortable;
  }, [players, order, orderBy, teamMap]);

  // Get the players for the current page
  const paginatedPlayers = sortedPlayers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Check if all players on the current page are selected
  const allPageSelected =
    paginatedPlayers.length > 0 &&
    paginatedPlayers.every((player) => checked[player.id]);
  const somePageSelected =
    paginatedPlayers.some((player) => checked[player.id]) && !allPageSelected;

  // Track if initial selection has been made
  const initialSelectionMade = React.useRef(false);

  // Select all players on the first page only once, when the component is first loaded
  React.useEffect(() => {
    if (!initialSelectionMade.current && Object.keys(checked).length === 0 && paginatedPlayers.length > 0) {
      const newChecked: { [id: number]: boolean } = {};
      paginatedPlayers.forEach(player => {
        newChecked[player.id] = true;
      });
      setChecked(newChecked);
      initialSelectionMade.current = true;
    }
    // eslint-disable-next-line
  }, [paginatedPlayers]);

  const handleCheckboxChange = (id: number) => {
    setChecked(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handlePrevPage = () => setPage((p) => Math.max(0, p - 1));
  const handleNextPage = () => setPage((p) => (p + 1 < Math.ceil(players.length / rowsPerPage) ? p + 1 : p));
  const totalPages = Math.max(1, Math.ceil(players.length / rowsPerPage));
  const handleFirstPage = () => setPage(0);
  const handleLastPage = () => setPage(totalPages - 1);

  // Handle sorting when clicking header
  const handleSort = (colId: string) => {
    if (colId === 'select' || colId === 'badge') return;
    if (orderBy === colId) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(colId);
      setOrder('desc');
    }
    setPage(0);
  };

  // Handler for select all on current page
  const handleSelectAllPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checkedValue = e.target.checked;
    setChecked((prev) => {
      // If selecting, only select players on the current page
      if (checkedValue) {
        const updated = { ...prev };
        paginatedPlayers.forEach((player) => {
          updated[player.id] = true;
        });
        return updated;
      }
      // If deselecting, deselect ALL players (not just current page)
      return {};
    });
  };

  // Handler for row click (open modal)
  const handleRowClick = (player: Element, event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('input[type="checkbox"]')) return;
    setSelectedPlayer(player);
    setDialogOpen(true);
  };

  // Handler to close modal
  const handleCloseModal = () => {
    setDialogOpen(false);
    setSelectedPlayer(null);
  };

  const alwaysVisible = ['select', 'badge', 'web_name', 'element_type'];
  const statusColumn = ['status'];

  // Find which pp_gw_# and xmins_gw_# columns have data for paginatedPlayers
  const nonEmptyGwColumns = React.useMemo(() => {
    const cols: string[] = [];
    for (let gw = 1; gw <= 38; gw++) {
      const ppCol = `pp_gw_${gw}`;
      const xminsCol = `xmins_gw_${gw}`;
      // Check if any player on the current page has data for this column
      if (paginatedPlayers.some(p => (p as any)[ppCol] !== null && (p as any)[ppCol] !== undefined && (p as any)[ppCol] !== '')) {
        cols.push(ppCol);
      }
      if (paginatedPlayers.some(p => (p as any)[xminsCol] !== null && (p as any)[xminsCol] !== undefined && (p as any)[xminsCol] !== '')) {
        cols.push(xminsCol);
      }
    }
    return cols;
  }, [paginatedPlayers]);

  const visibleColumnIds = React.useMemo(() => {
    const filterCols = Object.entries(filterColumnMap)
      .filter(([filter]) => activeFilters.includes(filter))
      .flatMap(([, cols]) => cols);

    // For GW columns, only include those with data
    const gwCols = filterCols.filter(id => id.startsWith('pp_gw_') || id.startsWith('xmins_gw_'));
    const nonGwCols = filterCols.filter(id => !id.startsWith('pp_gw_') && !id.startsWith('xmins_gw_'));
    const filteredGwCols = gwCols.filter(id => nonEmptyGwColumns.includes(id));

    return [...alwaysVisible, ...nonGwCols, ...filteredGwCols, ...statusColumn];
  }, [activeFilters, nonEmptyGwColumns]);

  const visibleColumns = columns.filter(col => visibleColumnIds.includes(col.id));
  
  return (
    <div className="player-table-outer-container">
      <div className="player-table-scroll-container">
        <table
          className="player-table">
          <colgroup>
            {visibleColumns.map(col => (
              <col
                key={col.id}
                style={{
                  width: col.minWidth ? `${col.minWidth}px` : undefined,
                  minWidth: col.minWidth ? `${col.minWidth}px` : undefined,
                  maxWidth: col.maxWidth ? `${col.maxWidth}px` : undefined,
                }}
              />
            ))}
          </colgroup>
          <thead>
            <tr>
              {visibleColumns.map((col) => {
                let stickyClass = '';
                if (col.id === 'select') stickyClass = 'sticky-select';
                if (col.id === 'badge') stickyClass = 'sticky-badge';
                if (col.id === 'web_name') stickyClass = 'sticky-name';
                const isSortable = col.id !== 'select' && col.id !== 'badge';
                return (
                  <th
                    key={col.id}
                    className={`player-table-th align-${col.align} ${stickyClass} ${isSortable ? 'sortable' : ''}`}
                    style={{
                      minWidth: col.minWidth,
                      cursor: isSortable ? 'pointer' : undefined,
                      borderLeft: col.id === `pp_gw_${currentGw}` || col.id === `xmins_gw_${currentGw}`
                        ? '2px solid #7768f6'
                        : undefined,
                      borderRight: col.id === `pp_gw_${currentGw}` || col.id === `xmins_gw_${currentGw}`
                        ? '2px solid #7768f6'
                        : undefined,
                    }}
                    onClick={() => isSortable && handleSort(col.id)}
                  >
                    {col.id === 'select' ? (
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        ref={input => {
                          if (input) input.indeterminate = somePageSelected;
                        }}
                        onChange={handleSelectAllPage}
                        aria-label="Select all players on this page"
                      />
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {col.label}
                        {orderBy === col.id && (
                          <span className="sort-arrow" style={{ marginLeft: 4 }}>
                            {order === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedPlayers.map((player) => (
              <tr
                key={player.id}
                className="player-table-row"
                tabIndex={0}
                onClick={e => handleRowClick(player, e)}
                style={{ cursor: 'pointer' }}
              >
                {visibleColumns.map((col) => {
                  if (col.id === 'select') {
                    return (
                      <td key={col.id} className={`align-${col.align} sticky-select`}>
                        <input
                          type="checkbox"
                          checked={!!checked[player.id]}
                          onChange={() => handleCheckboxChange(player.id)}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                    );
                  }
                  
                  let stickyClass = '';
                  if (col.id === 'badge') stickyClass = 'sticky-badge';
                  if (col.id === 'web_name') stickyClass = 'sticky-name';
                  if (col.id === 'badge') {
                    return (
                      <td key={col.id} className={`align-${col.align} ${stickyClass}`}>
                        {teamMap[player.team] ? (
                          <img
                            src={`/team-kits/${teamMap[player.team]}.png`}
                            alt={teamMap[player.team]}
                            style={{ width: 48, height: 60 }}
                          />
                        ) : null}
                      </td>
                    );
                  }
                  if (col.id === 'web_name') {
                    return (
                      <td key={col.id} className={`align-${col.align} ${stickyClass}`}>
                        <div> 
                          {player.web_name}
                        </div>
                        <div style={{ fontWeight: 400, fontSize: 11, color: '#f0eeeeff', lineHeight: 1.2 }}>
                          {teamFullNameMap[player.team]}
                        </div>
                      </td>
                    );
                  }
                  if (col.id === 'element_type') {
                    return (
                      <td key={col.id} className={`align-${col.align}`}>
                        {positionMap[player.element_type] || player.element_type}
                      </td>
                    );
                  }
                  if (col.id === 'team') {
                    return (
                      <td key={col.id} className={`align-${col.align}`}>
                        {teamMap[player.team] || player.team}
                      </td>
                    );
                  }
                  if (col.format) {
                    return (
                      <td key={col.id} className={`align-${col.align}`}>
                        {col.format((player as any)[col.id])}
                      </td>
                    );
                  }
                  if (col.id === 'status') {
                    const statusValue = player.status.charAt(0).toUpperCase() + player.status.slice(1);
                    return (
                      <td key={col.id} className={`align-${col.align} status-${statusValue.toLowerCase()}`}>
                        {/* {statusValue} */}
                      </td>
                    );
                  }
                  return (
                    <td
                      key={col.id}
                      className={`align-${col.align} ${stickyClass}`}
                      style={{
                        borderLeft: col.id === `pp_gw_${currentGw}` || col.id === `xmins_gw_${currentGw}`
                          ? '2px solid #7768f6'
                          : undefined,
                        borderRight: col.id === `pp_gw_${currentGw}` || col.id === `xmins_gw_${currentGw}`
                          ? '2px solid #7768f6'
                          : undefined,
                      }}
                    >
                      {(player as any)[col.id]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="player-table-pagination">
        <button
          onClick={handleFirstPage}
          disabled={page === 0}
          aria-label="First page"
          className="pagination-arrow"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M15 17L10 11L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 17L6 11L11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={handlePrevPage}
          disabled={page === 0}
          aria-label="Previous page"
          className="pagination-arrow"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M14 17L9 11L14 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span>
          {page + 1} of {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={page + 1 >= totalPages}
          aria-label="Next page"
          className="pagination-arrow"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M8 5L13 11L8 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={handleLastPage}
          disabled={page + 1 >= totalPages}
          aria-label="Last page"
          className="pagination-arrow"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M7 5L12 11L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 5L16 11L11 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      {/* Player Detail Modal */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '36px',
          }
        }}
      >
        {selectedPlayer && (
          <PlayerDetail
            player={selectedPlayer}
            team={teams.find(t => t.id === selectedPlayer.team)}
            teams={teams}
            onClose={handleCloseModal}
          />
        )}
      </Dialog>
    </div>
  );
}
