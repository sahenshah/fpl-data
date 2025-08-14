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
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

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
  { id: 'elite_selected_percent', label: 'Elite Selected %', minWidth: 80, align: 'right' },
  { id: 'predicted_points_next5', label: 'xPoints (next 5)', minWidth: 80, align: 'right' },
  { id: 'pp_next5_per_m', label: 'xPoints (next 5) per £M', minWidth: 80, align: 'right' },
  { id: 'predicted_xmins_next5', label: 'xMins (next 5)', minWidth: 80, align: 'right' },
  { id: 'pxm_next5_per_m', label: 'xMins (next 5) per £M', minWidth: 80, align: 'right' },
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
  { id: 'defensive_contribution_per_90', label: 'Defensive Contribution/90', minWidth: 80, align: 'right' },
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

const positionOptions = [
  { value: 'GK', label: 'GK' },
  { value: 'DEF', label: 'DEF' },
  { value: 'MID', label: 'MID' },
  { value: 'FWD', label: 'FWD' },
];

export default function PlayerTable({ players, teams }: PlayerTableProps) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortBy, setSortBy] = React.useState<string>('predicted_points_next5');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [positionFilter, setPositionFilter] = React.useState<string[]>([]);
  const [teamFilter, setTeamFilter] = React.useState<string[]>([]);
  const [minutesFilter, setMinutesFilter] = React.useState<string>('');
  const [costFilter, setCostFilter] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedPlayer, setSelectedPlayer] = React.useState<Element | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const filteredPlayers = React.useMemo(() => {
    return players.filter(player => {
      const playerPosition = positionMap[player.element_type];
      const positionMatch = positionFilter.length > 0 ? positionFilter.includes(playerPosition) : true;
      const playerTeamName = teams.find(t => t.id === player.team)?.name;
      const teamMatch =
        teamFilter.length > 0
          ? playerTeamName !== undefined && teamFilter.includes(playerTeamName)
          : true;
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
  }, [players, positionFilter, teamFilter, teams, minutesFilter, costFilter, searchTerm]);

  const percentageColumns = [
    'selected_by_percent',
    'elite_selected_percent',
  ];

  const sortedPlayers = React.useMemo(() => {
    return [...filteredPlayers].sort((a, b) => {
      let aValue = a[sortBy as keyof Element];
      let bValue = b[sortBy as keyof Element];

      // Handle percentage columns: convert string like "9.9%" to number
      if (percentageColumns.includes(sortBy)) {
        aValue = typeof aValue === 'string' ? parseFloat(aValue.replace('%', '')) : aValue;
        bValue = typeof bValue === 'string' ? parseFloat(bValue.replace('%', '')) : bValue;
      } else {
        // Try to convert to number if possible
        if (typeof aValue === 'string' && !isNaN(Number(aValue))) aValue = Number(aValue);
        if (typeof bValue === 'string' && !isNaN(Number(bValue))) bValue = Number(bValue);
      }

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

  // Compute chart data from only the players currently shown on the table (pagination)
  const paginatedPlayers = React.useMemo(() => {
    return sortedPlayers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedPlayers, page, rowsPerPage]);

  const chartPlayers = React.useMemo(() => {
    return paginatedPlayers.map(player => ({
      web_name: player.web_name,
      predicted_points_gw: [
        player.pp_gw_1, player.pp_gw_2, player.pp_gw_3, player.pp_gw_4, player.pp_gw_5
      ].map(val => (typeof val === 'number' ? val : Number(val) || 0))
    }));
  }, [paginatedPlayers]);

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
      setSortDirection('desc');
    }
  };

  // Use sortedPlayers for pagination and count
  const totalRows = sortedPlayers.length;
  const maxPage = Math.max(0, Math.ceil(totalRows / rowsPerPage) - 1);

  // Ensure the current page is not out of bounds
  React.useEffect(() => {
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [page, maxPage, rowsPerPage, totalRows]);

  return (
    <Paper sx={{ width: '100%', maxWidth: '95vw', background: '#23232b' }}>
      <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Position filter (already multi-select) */}
        <Select
          multiple
          displayEmpty
          value={positionFilter}
          onChange={e => setPositionFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
          renderValue={selected => selected.length === 0 ? 'All Positions' : (selected as string[]).join(', ')}
          style={{ minWidth: 140, height: 30, padding: 0 }}
          size="small"
          sx={{ 
            color: '#ffffffc9',
            height: 30,
            '.MuiOutlinedInput-notchedOutline': { borderColor: '#ffffffc9' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffffc9' },
            '.MuiSvgIcon-root': { color: '#ffffffc9' },
            '.MuiSelect-select': { paddingTop: '8px', paddingBottom: '8px' }
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: '#23232b', // dark background
                color: '#fff'
              }
            }
          }}
        >
          {positionOptions.map(option => (
            <MenuItem key={option.value} value={option.value}>
              <Checkbox
                checked={positionFilter.indexOf(option.value) > -1}
                sx={{ color: "#ffffff8a", '&.Mui-checked': { color: "#ffffff8a" } }}
              />
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
        </Select>
        {/* Team filter (now multi-select) */}
        <Select
          multiple
          displayEmpty
          value={teamFilter}
          onChange={e => setTeamFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
          renderValue={selected => {
            if ((selected as string[]).length === 0) return 'All Teams';
            return (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {(selected as string[]).map(teamName => {
                  const team = teams.find(t => t.name === teamName);
                  return team ? (
                    <img
                      key={team.id}
                      src={`${BACKEND_URL}/backend/team-badges/${team.short_name}.svg`}
                      alt={team.short_name}
                      style={{ width: 22, height: 22, maxWidth: 22, marginRight: 2, verticalAlign: 'middle' }}
                    />
                  ) : null;
                })}
              </span>
            );
          }}
          style={{ minWidth: 140, height: 30, padding: 0 }}
          size="small"
          sx={{
            color: '#ffffffc9',
            height: 30,
            '.MuiOutlinedInput-notchedOutline': { borderColor: '#ffffffc9' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffffc9' },
            '.MuiSvgIcon-root': { color: '#ffffffc9' },
            '.MuiSelect-select': { paddingTop: '8px', paddingBottom: '8px' }
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: '#23232b', // dark background
                color: '#fff'
              }
            }
          }}
        >
          {teams.map(team => (
            <MenuItem key={team.id} value={team.name}>
              <Checkbox
                checked={teamFilter.indexOf(team.name) > -1}
                sx={{ color: "#ffffff8a", '&.Mui-checked': { color: "#ffffff8a" } }}
              />
              <img
                src={`${BACKEND_URL}/backend/team-badges/${team.short_name}.svg`}
                alt={team.short_name}
                style={{ width: 22, height: 22, marginRight: 8, verticalAlign: 'middle' }}
              />
              <ListItemText primary={team.name} />
            </MenuItem>
          ))}
        </Select>
        {/* Filter inputs */}
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
                              src={`${BACKEND_URL}/backend/team-badges/${team.short_name}.svg`}
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
                        {(column.id === 'selected_by_percent' || column.id === 'elite_selected_percent')
                          ? `${value}%`
                          : column.format && typeof value === 'number'
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
        count={totalRows}
        rowsPerPage={rowsPerPage}
        page={page > maxPage ? maxPage : page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        sx={{ background: '#333333', color: '#fff' }}
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