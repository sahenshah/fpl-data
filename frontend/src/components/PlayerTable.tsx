import * as React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import Dialog from '@mui/material/Dialog';
import PlayerDetail from './PlayerDetail';
import type { Element, Team } from '../types/fpl';
import './PlayerTable.css';
import PlayerTablePPChart from './PlayerTablePPChart';

interface PlayerTableProps {
  players: Element[];
  teams: Team[];
}

const columns = [
  { id: 'id', label: 'ID', minWidth: 50, align: 'right' },
  { id: 'badge', label: '', minWidth: 40, align: 'center' },
  { id: 'web_name', label: 'Name', minWidth: 100, align: 'left' },
  { id: 'first_name', label: 'First Name', minWidth: 100, align: 'left' },
  { id: 'second_name', label: 'Second Name', minWidth: 100, align: 'left' },
  { id: 'team', label: 'Team', minWidth: 100, align: 'left' },
  { id: 'element_type', label: 'Position', minWidth: 50, align: 'right' },
  { id: 'now_cost', label: 'Cost', minWidth: 50, align: 'right', format: (value: number) => (value / 10).toFixed(1) },
  { id: 'total_points', label: 'Total Points', minWidth: 80, align: 'right' },
  { id: 'selected_by_percent', label: 'Selected %', minWidth: 80, align: 'right' },
  { id: 'predicted_points_next5', label: 'xPoints (next 5)', minWidth: 80, align: 'right' },
  { id: 'pp_next5_per_m', label: 'xPoints (next 5) per £M', minWidth: 80, align: 'right' },
  { id: 'predicted_xmins_next5', label: 'xMins (next 5)', minWidth: 80, align: 'right' },
  { id: 'pxm_next5_per_m', label: 'xMins (next 5) per £M', minWidth: 80, align: 'right' },{ id: 'elite_selected_percent', label: 'Elite Selected %', minWidth: 80, align: 'right' },
  { id: 'form', label: 'Form', minWidth: 50, align: 'right' },
  { id: 'minutes', label: 'Minutes', minWidth: 80, align: 'right' },
  { id: 'goals_scored', label: 'Goals', minWidth: 50, align: 'right' },
  { id: 'assists', label: 'Assists', minWidth: 50, align: 'right' },
  { id: 'clean_sheets', label: 'Clean Sheets', minWidth: 80, align: 'right' },
  { id: 'expected_goals', label: 'Expected Goals', minWidth: 80, align: 'right' },
  { id: 'expected_assists', label: 'Expected Assists', minWidth: 80, align: 'right' },
  { id: 'expected_goal_involvements', label: 'Expected Goal Involvements', minWidth: 80, align: 'right' },
  { id: 'expected_goals_per_90', label: 'Expected Goals/90', minWidth: 80, align: 'right' },
  { id: 'expected_assists_per_90', label: 'Expected Assists/90', minWidth: 80, align: 'right' },
  { id: 'expected_goal_involvements_per_90', label: 'Expected GI/90', minWidth: 80, align: 'right' },
  { id: 'defensive_contribution', label: 'Defensive Contribution', minWidth: 80, align: 'right' },
  { id: 'influence', label: 'Influence', minWidth: 80, align: 'right' },
  { id: 'creativity', label: 'Creativity', minWidth: 80, align: 'right' },
  { id: 'threat', label: 'Threat', minWidth: 80, align: 'right' },
  { id: 'ict_index', label: 'ICT Index', minWidth: 80, align: 'right' },
  { id: 'yellow_cards', label: 'Yellow Cards', minWidth: 80, align: 'right' },
  { id: 'red_cards', label: 'Red Cards', minWidth: 80, align: 'right' },
  { id: 'status', label: 'Status', minWidth: 50, align: 'left' },
];

const positionMap: Record<number, string> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

// Example: Add to your player loading logic
async function fetchCsvSummary(playerName: string) {
  const res = await fetch(`/api/player-csv-summary?name=${encodeURIComponent(playerName)}`);
  const data = await res.json();
  return {
    predicted_points_next5: data.total ?? '-',
    pp_next5_per_m: data.points_per_m ?? '-',
    elite_selected_percent: data.elite_percent ?? '-',
  };
}

async function fetchCsvXminsSummary(playerName: string) {
  const res = await fetch(`/api/player-csv-xmins-summary?name=${encodeURIComponent(playerName)}`);
  const data = await res.json();
  return {
    predicted_xmins_next5: data.total ?? '-',
    pxm_next5_per_m: data.xmins_per_m ?? '-',
    elite_selected_percent: data.elite_percent ?? '-',
  };
}

// When building your player rows:
// (Remove the invalid for-loop. Data enrichment should be handled outside or inside a useEffect if needed.)

export default function PlayerTable({ players, teams }: PlayerTableProps) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortBy, setSortBy] = React.useState<string>('predicted_points_next5'); // Default sort by predicted points
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc'); // Descending by default
  const [positionFilter, setPositionFilter] = React.useState<string>(''); // e.g. 'GK', 'DEF', etc.
  const [teamFilter, setTeamFilter] = React.useState<string>(''); // e.g. team name
  const [minutesFilter, setMinutesFilter] = React.useState<string>(''); // new filter for minutes
  const [costFilter, setCostFilter] = React.useState<string>(''); // new filter for cost
  const [searchTerm, setSearchTerm] = React.useState(''); // new state for search
  const [selectedPlayer, setSelectedPlayer] = React.useState<Element | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [enrichedPlayers, setEnrichedPlayers] = React.useState<Element[]>([]);

  // Chart data state
  const [chartPlayers, setChartPlayers] = React.useState<
    { web_name: string; predicted_points_gw: number[] }[]
  >([]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleSort = (columnId: string) => {
    if (sortBy === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnId);
      setSortDirection('asc');
    }
  };

  const filteredPlayers = React.useMemo(() => {
    return enrichedPlayers.filter(player => {
      const positionMatch = positionFilter ? positionMap[player.element_type] === positionFilter : true;
      const teamMatch = teamFilter ? teams.find(t => t.id === player.team)?.name === teamFilter : true;
      const minutesMatch = minutesFilter ? player.minutes > Number(minutesFilter) : true;
      const costMatch = costFilter ? (player.now_cost / 10) <= Number(costFilter) : true;
      const nameMatch = searchTerm
        ? (
            player.web_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            player.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            player.second_name?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : true;
      return positionMatch && teamMatch && minutesMatch && costMatch && nameMatch;
    });
  }, [enrichedPlayers, positionFilter, teamFilter, teams, minutesFilter, costFilter, searchTerm]);

  const sortedPlayers = React.useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      const aValue = a[sortBy as keyof Element];
      const bValue = b[sortBy as keyof Element];
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [filteredPlayers, sortBy, sortDirection]);

  React.useEffect(() => {
    async function enrichPlayers() {
      const enriched: Element[] = [];
      for (const player of players) {
        // eslint-disable-next-line no-await-in-loop
        const csvSummary = await fetchCsvSummary(player.web_name);
        // eslint-disable-next-line no-await-in-loop
        const xminsSummary = await fetchCsvXminsSummary(player.web_name);
        enriched.push({
          ...player,
          predicted_points_next5: csvSummary.predicted_points_next5,
          pp_next5_per_m: csvSummary.pp_next5_per_m,
          elite_selected_percent: csvSummary.elite_selected_percent,
          predicted_xmins_next5: xminsSummary.predicted_xmins_next5,
          pxm_next5_per_m: xminsSummary.pxm_next5_per_m,
        });
      }
      setEnrichedPlayers(enriched);
    }
    enrichPlayers();
  }, [players]);

  // Fetch predicted points for chart when filteredPlayers changes
  React.useEffect(() => {
    async function fetchChartData() {
      const gwKeys = ['GW1', 'GW2', 'GW3', 'GW4', 'GW5'];
      const results: { web_name: string; predicted_points_gw: number[] }[] = [];
      // Only use players on the current page
      const pagePlayers = sortedPlayers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
      for (const player of pagePlayers) {
        const predicted_points_gw: number[] = [];
        for (const gw of gwKeys) {
          const res = await fetch(
            `/api/csv-predicted-points?name=${encodeURIComponent(player.web_name)}&gw=${gw}`
          );
          const data = await res.json();
          predicted_points_gw.push(Number(data.predicted_points) || 0);
        }
        results.push({
          web_name: player.web_name,
          predicted_points_gw,
        });
      }
      setChartPlayers(results);
    }
    if (sortedPlayers.length > 0) {
      fetchChartData();
    } else {
      setChartPlayers([]);
    }
  }, [sortedPlayers, page, rowsPerPage]);

  // Use sortedPlayers for pagination and count
  const totalRows = sortedPlayers.length;
  const maxPage = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);

  // Ensure the current page is not out of bounds
  React.useEffect(() => {
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, maxPage, rowsPerPage, totalRows]);

  // Chart refresh handler
  const handleRefreshChart = async () => {
    const gwKeys = ['GW1', 'GW2', 'GW3', 'GW4', 'GW5'];
    const results: { web_name: string; predicted_points_gw: number[] }[] = [];
    const pagePlayers = sortedPlayers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    for (const player of pagePlayers) {
      const predicted_points_gw: number[] = [];
      for (const gw of gwKeys) {
        const res = await fetch(
          `/api/csv-predicted-points?name=${encodeURIComponent(player.web_name)}&gw=${gw}`
        );
        const data = await res.json();
        predicted_points_gw.push(Number(data.predicted_points) || 0);
      }
      results.push({
        web_name: player.web_name,
        predicted_points_gw,
      });
    }
    setChartPlayers(results);
  };

  return (
    <Paper sx={{ width: '100%', maxWidth: '95vw' }}>
      <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}>
          <option value="">All Positions</option>
          <option value="GK">GK</option>
          <option value="DEF">DEF</option>
          <option value="MID">MID</option>
          <option value="FWD">FWD</option>
        </select>
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          <option value="">All Teams</option>
          {teams.map(team => (
            <option key={team.id} value={team.name}>{team.name}</option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          value={minutesFilter}
          onChange={e => setMinutesFilter(e.target.value)}
          placeholder="Min Minutes"
          style={{ width: 120 }}
        />
        <input
          type="number"
          min={0}
          value={costFilter}
          onChange={e => setCostFilter(e.target.value)}
          placeholder="Max Cost"
          style={{ width: 120 }}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by name"
          style={{ width: 180 }}
        />
      </div>
      <PlayerTablePPChart 
        players={chartPlayers} 
        onRefresh={handleRefreshChart}
      />
      <TableContainer sx={{ maxHeight: 800, maxWidth: '100vw', overflow: 'auto' }}>
        <Table stickyHeader aria-label="players table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align as any}
                  className={
                    column.id === 'badge' ? 'sticky-badge' :
                    column.id === 'team_short_name' ? 'sticky-id' :
                    column.id === 'web_name' ? 'sticky-web-name' :
                    undefined
                  }
                  style={{ minWidth: column.minWidth, cursor: 'pointer' }}
                  onClick={() => handleSort(column.id)}
                >
                  {column.label}
                  {sortBy === column.id ? (
                    sortDirection === 'asc'
                      ? <ArrowUpwardIcon fontSize="small" />
                      : <ArrowDownwardIcon fontSize="small" />
                  ) : null}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedPlayers
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((player) => (
                <TableRow key={player.id}>
                  {columns.map((column) => {
                    let value = player[column.id as keyof Element];

                    // Custom logic for new columns
                    if (column.id === 'predicted_points_next5') {
                      value = player.predicted_points_next5 ?? '-';
                    }
                    if (column.id === 'pp_next5_per_m') {
                      value = player.pp_next5_per_m ?? '-';
                    }
                    if (column.id === 'elite_selected_percent') {
                      value = player.elite_selected_percent ?? '-';
                    }
                    if (column.id === 'predicted_xmins_next5') {
                      value = player.predicted_xmins_next5 ?? '-';
                    }
                    if (column.id === 'pxm_next5_per_m') {
                      value = player.pxm_next5_per_m ?? '-';
                    }

                    if (column.id === 'team') {
                      const team = teams.find(t => t.id === player.team);
                      value = team ? team.name : value;
                    }
                    if (column.id === 'team_short_name') {
                      const team = teams.find(t => t.id === player.team);
                      value = team ? team.short_name : '';
                    }
                    if (column.id === 'badge') {
                      const team = teams.find(t => t.id === player.team);
                      return (
                        <TableCell
                          key={column.id}
                          align={column.align as any}
                          className="sticky-badge"
                          style={{ minWidth: column.minWidth }}
                        >
                          {team ? (
                            <img
                              src={`http://localhost:5000/backend/team-badges/${team.short_name}.svg`}
                              alt={team.short_name}
                              style={{ width: 28, height: 28 }}
                            />
                          ) : null}
                        </TableCell>
                      );
                    }
                    if (column.id === 'element_type') {
                      value = positionMap[player.element_type] || player.element_type;
                    }
                    if (column.id === 'web_name') {
                      return (
                        <TableCell
                          key={column.id}
                          className="sticky-web-name"
                          style={{ cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => {
                            setSelectedPlayer(player);
                            setDialogOpen(true);
                          }}
                        >
                          {player.web_name}
                        </TableCell>
                      );
                    }
                    if (column.id === 'status') {
                      return (
                        <TableCell
                          key={column.id}
                          align={column.align as any}
                          style={{
                            minWidth: column.minWidth,
                            backgroundColor:
                              value === 'a' ? '#4caf50' : value === 'u' ? '#f44336' : undefined,
                            color: value === 'a' || value === 'u' ? '#fff' : undefined,
                            textAlign: 'center',
                            fontWeight: 'bold',
                          }}
                        >
                          {/* Optionally, you can show nothing or a label */}
                          {value === 'a' ? '' : value === 'u' ? '' : value}
                        </TableCell>
                      );
                    }
                    return (
                      <TableCell
                        key={column.id}
                        align={column.align as any}
                        className={
                          column.id === 'team_short_name' ? 'sticky-id' :
                          column.id === 'web_name' ? 'sticky-web-name' :
                          undefined
                        }
                      >
                        {column.format && typeof value === 'number'
                          ? column.format(value)
                          : value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={totalRows} // Use sortedPlayers.length instead of players.length
        rowsPerPage={rowsPerPage}
        page={page > maxPage ? maxPage : page} // Ensure page is valid
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      {/* Player Detail Modal */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="lg" fullWidth
      >
        {selectedPlayer && (
          <PlayerDetail
            player={selectedPlayer}
            team={teams.find(t => t.id === selectedPlayer.team)}
            teams={teams} 
            onClose={() => setDialogOpen(false)}
          />
        )}
      </Dialog>
    </Paper>
  );
}