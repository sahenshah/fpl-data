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
import type { Element, Team } from '../types/fpl';
import './PlayerTable.css';

interface PlayerTableProps {
  players: Element[];
  teams: Team[];
}

const columns = [
  { id: 'id', label: 'ID', minWidth: 50, align: 'right' },
  { id: 'badge', label: '', minWidth: 40, align: 'center' }, // Add this line
  { id: 'web_name', label: 'Web Name', minWidth: 100, align: 'left' },
  { id: 'first_name', label: 'First Name', minWidth: 100, align: 'left' },
  { id: 'second_name', label: 'Second Name', minWidth: 100, align: 'left' },
  { id: 'team', label: 'Team', minWidth: 100, align: 'left' },
  { id: 'element_type', label: 'Position', minWidth: 50, align: 'right' },
  { id: 'now_cost', label: 'Cost', minWidth: 50, align: 'right', format: (value: number) => (value / 10).toFixed(1) },
  { id: 'total_points', label: 'Total Points', minWidth: 80, align: 'right' },
  { id: 'selected_by_percent', label: 'Selected %', minWidth: 80, align: 'right' },
  // Added advanced stats below
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

export default function PlayerTable({ players, teams }: PlayerTableProps) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [sortBy, setSortBy] = React.useState<string>('id');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');
  const [positionFilter, setPositionFilter] = React.useState<string>(''); // e.g. 'GK', 'DEF', etc.
  const [teamFilter, setTeamFilter] = React.useState<string>(''); // e.g. team name
  const [minutesFilter, setMinutesFilter] = React.useState<string>(''); // new filter for minutes
  const [costFilter, setCostFilter] = React.useState<string>(''); // new filter for cost

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
    return players.filter(player => {
      const positionMatch = positionFilter ? positionMap[player.element_type] === positionFilter : true;
      const teamMatch = teamFilter ? teams.find(t => t.id === player.team)?.name === teamFilter : true;
      const minutesMatch = minutesFilter ? player.minutes > Number(minutesFilter) : true;
      const costMatch = costFilter ? (player.now_cost / 10) <= Number(costFilter) : true;
      return positionMatch && teamMatch && minutesMatch && costMatch;
    });
  }, [players, positionFilter, teamFilter, teams, minutesFilter, costFilter]);

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

  return (
    <Paper sx={{ width: '100%', maxWidth: '95vw' }}>
      <div className="filter-bar">
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
      </div>
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
                <TableRow hover role="checkbox" tabIndex={-1} key={player.id}>
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
        count={players.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}