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
import Next5LineChart from './Next5LineChart';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import Box from '@mui/material/Box';
import { getCurrentGameweek } from '../App';
import { useEffect, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Slider from '@mui/material/Slider';
import ScatterChart from './ScatterChart';

interface PlayerTableProps {
  players: Element[];
  teams: Team[];
}

const columns = [
  // { id: 'id', label: 'ID', minWidth: 50, align: 'right' },
  { id: 'badge', label: '', minWidth: 40, align: 'center' },
  { id: 'web_name', label: 'Name', minWidth: 100, align: 'left' },
  // { id: 'first_name', label: 'First Name', minWidth: 100, align: 'left' },
  // { id: 'second_name', label: 'Second Name', minWidth: 100, align: 'left' },
  // { id: 'team', label: 'Team', minWidth: 100, align: 'left' },
  { id: 'element_type', label: 'Position', minWidth: 50, align: 'right' },
  { id: 'now_cost', label: 'Cost (£)', minWidth: 50, align: 'right', format: (value: number) => (value / 10).toFixed(1) },
  { id: 'total_points', label: 'Total Points', minWidth: 80, align: 'right' },
  { id: 'form', label: 'Form', minWidth: 50, align: 'right' },
  { id: 'selected_by_percent', label: 'Selected (%)', minWidth: 80, align: 'right' },
  { id: 'elite_selected_percent', label: 'Elite Selected (%)', minWidth: 80, align: 'right' },
  { id: 'predicted_points_next5', label: 'xPoints next 5', minWidth: 80, align: 'right' },
  { id: 'pp_next5_per_m', label: 'xPoints next 5 / £M', minWidth: 80, align: 'right' },
  { id: 'predicted_xmins_next5', label: 'xMins next 5', minWidth: 80, align: 'right' },
  { id: 'pxm_next5_per_m', label: 'xMins next 5 / £M', minWidth: 80, align: 'right' },
  { id: 'minutes', label: 'Minutes', minWidth: 80, align: 'right' },
  { id: 'goals_scored', label: 'Goals', minWidth: 50, align: 'right' },
  { id: 'assists', label: 'Assists', minWidth: 50, align: 'right' },
  { id: 'clean_sheets', label: 'Clean Sheets', minWidth: 80, align: 'right' },
  { id: 'expected_goals', label: 'xG', minWidth: 80, align: 'right' },
  { id: 'expected_assists', label: 'xA', minWidth: 80, align: 'right' },
  { id: 'expected_goal_involvements', label: 'xGI', minWidth: 80, align: 'right' },
  { id: 'expected_goals_per_90', label: 'xG / 90', minWidth: 80, align: 'right' },
  { id: 'expected_assists_per_90', label: 'xA / 90', minWidth: 80, align: 'right' },
  { id: 'expected_goal_involvements_per_90', label: 'xGI / 90', minWidth: 80, align: 'right' },
  { id: 'clearances_blocks_interceptions', label: 'CBI', minWidth: 80, align: 'right' },
  { id: 'recoveries', label: 'Recoveries', minWidth: 80, align: 'right' },
  { id: 'tackles', label: 'Tackles', minWidth: 80, align: 'right' },
  { id: 'defensive_contribution', label: 'Def Con', minWidth: 80, align: 'right' },
  { id: 'defensive_contribution_per_90', label: 'Def Con / 90', minWidth: 80, align: 'right' },
  { id: 'influence', label: 'Influence', minWidth: 80, align: 'right' },
  { id: 'creativity', label: 'Creativity', minWidth: 80, align: 'right' },
  { id: 'threat', label: 'Threat', minWidth: 80, align: 'right' },
  { id: 'ict_index', label: 'ICT Index', minWidth: 80, align: 'right' },
  { id: 'bonus', label: 'Bonus', minWidth: 80, align: 'right' },
  { id: 'bps', label: 'BPS', minWidth: 80, align: 'right' },
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
  // Set all teams selected by default
  const [teamFilter, setTeamFilter] = React.useState<string[]>(teams.map(t => t.name));
  const [minutesFilter, setMinutesFilter] = React.useState<string>('');
  const [costRange, setCostRange] = React.useState<number[]>([40, 150]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedPlayer, setSelectedPlayer] = React.useState<Element | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);
  const [gwRange, setGwRange] = useState<[number, number]>([1, 5]);
  const [chartMode, setChartMode] = React.useState<
    'xPoints' | 
    'xMins' | 
    'totalPoints' | 
    'xGI' |
    'xGI/90' |
    'xG' |
    'xG/90' |
    'xA' |
    'xA/90' |
    'CBI' |
    'defCon' |
    'defCon90'
  >('xPoints');
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  React.useEffect(() => {
    const handleResize = () => setIsSmallScreen(window.innerWidth < 700);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    getCurrentGameweek().then(gw => {
      if (gw) {
        setGwRange([gw, gw + 4 > 38 ? 38 : gw + 4]);
      }
    });
  }, []);

  const compactFontSize = isSmallScreen ? '0.75rem' : '0.88rem';
  const compactPadding = isSmallScreen ? '4px 4px' : '6px 8px';

  const filteredPlayers = React.useMemo(() => {
    return players.filter(player => {
      const playerPosition = positionMap[player.element_type];
      const positionMatch = positionFilter.length > 0 ? positionFilter.includes(playerPosition) : true;
      const playerTeamName = teams.find(t => t.id === player.team)?.name;
      const teamMatch =
        teamFilter.length === 0
          ? false // Show no players if no teams selected
          : playerTeamName !== undefined && teamFilter.includes(playerTeamName);
      const minutesMatch = minutesFilter ? player.minutes > Number(minutesFilter) : true;
      const cost = player.now_cost;
      const costMatch = cost >= costRange[0] && cost <= costRange[1];
      const nameMatch = searchTerm
        ? (
            player.web_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            player.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            player.second_name?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : true;
      return positionMatch && teamMatch && minutesMatch && costMatch && nameMatch;
    });
  }, [players, positionFilter, teamFilter, teams, minutesFilter, costRange, searchTerm]);

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

  // Dynamically get the next 5 GW data for each player based on gwRange
  const chartPlayers = React.useMemo(() => {
    return paginatedPlayers.map(player => {
      // Helper to get the property name for a given GW
      const getGWProp = (prefix: string, gw: number) => `${prefix}_gw_${gw}` as keyof Element;

      const predicted_points_gw = [];
      const predicted_xmins_gw = [];

      for (let gw = gwRange[0]; gw <= gwRange[1]; gw++) {
        predicted_points_gw.push(Number(player[getGWProp('pp', gw)]) || 0);
        predicted_xmins_gw.push(Number(player[getGWProp('xmins', gw)]) || 0);
      }

      return {
        web_name: player.web_name,
        predicted_points_gw,
        predicted_xmins_gw,
      };
    });
  }, [paginatedPlayers, gwRange]);

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

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleModeChange = (mode: 'xPoints' | 'xMins' | 'totalPoints' | 'xGI' | 'xGI/90' | 'xG' | 'xG/90' | 'xA' | 'xA/90' | 'CBI' | 'defCon' | 'defCon90') => {
    setChartMode(mode);
    setAnchorEl(null);
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
      <div
        className="filter-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap', // allow wrapping on small screens
          maxWidth: '100%', // prevent overflow
          overflow: 'visible', // allow slider to show fully
        }}
      >
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
          onChange={e => {
            const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
            // If "ALL_TEAMS" is selected and all teams are already selected, clear all
            if (value.includes('ALL_TEAMS')) {
              if (teamFilter.length === teams.length) {
                setTeamFilter([]);
              } else {
                setTeamFilter(teams.map(t => t.name));
              }
            } else {
              setTeamFilter(value);
            }
          }}
          renderValue={selected => {
            if ((selected as string[]).length === 0) return 'No Teams';
            if ((selected as string[]).length === teams.length) return 'All Teams';
            return (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {(selected as string[]).map(teamName => {
                  const team = teams.find(t => t.name === teamName);
                  return team ? (
                    <img
                      key={team.id}
                      src={`/team-badges/${team.short_name}.svg`}
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
          {/* All Teams option */}
          <MenuItem value="ALL_TEAMS" selected={teamFilter.length === teams.length}>
            <Checkbox checked={teamFilter.length === teams.length} />
            <ListItemText primary="All Teams" />
          </MenuItem>
          {teams.map(team => (
            <MenuItem key={team.id} value={team.name}>
              <Checkbox
                checked={teamFilter.indexOf(team.name) > -1}
                sx={{ color: "#ffffff8a", '&.Mui-checked': { color: "#ffffff8a" } }}
              />
              <img
                src={`/team-badges/${team.short_name}.svg`}
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
          className="xmins-filter-input"
          step={10} 
        />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by name"
          style={{ width: 180 }}
        />
        <Box
          sx={{
            width: 250,
            px: 2,
            maxWidth: 250,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Slider
            value={costRange}
            onChange={(_, newValue) => setCostRange(newValue as number[])}
            valueLabelDisplay="auto"
            min={40}
            max={150}
            step={1}
            marks={[
              { value: 40, label: '£4.0' },
              { value: 150, label: '£15.0' }
            ]}
            sx={{
              width: 250,
              maxWidth: '100%',
            }}
            getAriaLabel={() => 'Cost range'}
            valueLabelFormat={v => (v / 10).toFixed(1)}
          />
        </Box>
      </div>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#333',
          paddingLeft: '24px',
          paddingTop: '8px',
          paddingBottom: '8px',
          margin: 0,
        }}
      >
        <h3
          style={{
            color: '#fff',
            background: 'transparent',
            margin: 0,
            fontWeight: 500,
            fontSize: isSmallScreen ? '0.95rem' : '1.15rem', // Responsive font size
            letterSpacing: 0.5,
            padding: 0,
          }}
        >
          {chartMode === 'xPoints'
            ? 'Predicted Points (next 5 GWs)'
            : chartMode === 'xMins'
            ? 'Predicted Minutes (next 5)'
            : chartMode === 'totalPoints'
            ? 'Total Points'
            : chartMode === 'xGI'
            ? 'xGI'
            : chartMode === 'xGI/90'
            ? 'xGI/90'
            : chartMode === 'xG'
            ? 'xG'
            : chartMode === 'xG/90'
            ? 'xG/90'
            : chartMode === 'xA'
            ? 'xA'
            : chartMode === 'xA/90'
            ? 'xA/90'
            : chartMode === 'CBI'
            ? 'CBI'
            : chartMode === 'defCon'
            ? 'Def Con'
            : chartMode === 'defCon90'
            ? 'Def Con / 90'
            : ''}
        </h3>
        <IconButton
          size="small"
          onClick={handleMenuClick}
          sx={{
            color: '#fff',
            borderRadius: '50%',
            width: 32,
            height: 32,
            marginRight: 2,
            '&:hover': { background: '#444' },
            '&:active': { outline: 'none', border: 'none', boxShadow: 'none', background: '#444' },
            '&:focus': { outline: 'none', border: 'none', boxShadow: 'none' },
          }}
          aria-label="Select chart mode"
        >
          <ArrowDropDownIcon />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              backgroundColor: '#23232b',
              color: '#fff',
              fontSize: '0.85rem',
            }
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem
            selected={chartMode === 'xPoints'}
            onClick={() => handleModeChange('xPoints')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            xPoints
          </MenuItem>
          <MenuItem
            selected={chartMode === 'xMins'}
            onClick={() => handleModeChange('xMins')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            xMins
          </MenuItem>
          <MenuItem
            selected={chartMode === 'totalPoints'}
            onClick={() => handleModeChange('totalPoints')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            Total Points
          </MenuItem>
          <MenuItem
            selected={chartMode === 'xGI'}
            onClick={() => handleModeChange('xGI')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            xGI
          </MenuItem>
          <MenuItem
            selected={chartMode === 'xGI/90'}
            onClick={() => handleModeChange('xGI/90')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            xGI/90
          </MenuItem>
          <MenuItem
            selected={chartMode === 'xG'}
            onClick={() => handleModeChange('xG')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            xG
          </MenuItem>
          <MenuItem
            selected={chartMode === 'xG/90'}
            onClick={() => handleModeChange('xG/90')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            xG/90
          </MenuItem>
          <MenuItem
            selected={chartMode === 'xA'}
            onClick={() => handleModeChange('xA')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            xA
          </MenuItem>
          <MenuItem
            selected={chartMode === 'xA/90'}
            onClick={() => handleModeChange('xA/90')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            xA/90
          </MenuItem>
          <MenuItem
            selected={chartMode === 'CBI'}
            onClick={() => handleModeChange('CBI')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            CBI
          </MenuItem>
          <MenuItem
            selected={chartMode === 'defCon'}
            onClick={() => handleModeChange('defCon')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            Def Con
          </MenuItem>
          <MenuItem
            selected={chartMode === 'defCon90'}
            onClick={() => handleModeChange('defCon90')}
            sx={{ fontSize: '0.85rem', minHeight: '32px' }}
          >
            Def Con / 90
          </MenuItem>
        </Menu>
      </Box>
      {(chartMode === 'totalPoints' || 
        chartMode === 'xGI' ||
        chartMode === 'xGI/90' ||
        chartMode === 'xG' ||
        chartMode === 'xG/90' ||
        chartMode === 'xA' ||
        chartMode === 'xA/90' ||
        chartMode === 'CBI' ||
        chartMode === 'defCon' ||
        chartMode === 'defCon90') ? (
        <ScatterChart
          players={paginatedPlayers}
          yKey={chartMode === 'totalPoints' ? 'total_points' : 
                              chartMode === 'xGI' ? 'expected_goal_involvements' : 
                              chartMode === 'xGI/90' ? 'expected_goal_involvements_per_90' : 
                              chartMode === 'xG' ? 'expected_goals' : 
                              chartMode === 'xG/90' ? 'expected_goals_per_90' : 
                              chartMode === 'xA' ? 'expected_assists' : 
                              chartMode === 'xA/90' ? 'expected_assists_per_90' : 
                              chartMode === 'CBI' ? 'clearances_blocks_interceptions' : 
                              chartMode === 'defCon' ? 'defensive_contribution' : 
                              chartMode === 'defCon90' ? 'defensive_contribution_per_90' : ''}
          yLabel={chartMode === 'totalPoints' ? 'Total Points' : 
                  chartMode === 'xGI' ? 'xGI' : 
                  chartMode === 'xGI/90' ? 'xGI/90' : 
                  chartMode === 'xG' ? 'xG' : 
                  chartMode === 'xG/90' ? 'xG/90' : 
                  chartMode === 'xA' ? 'xA' : 
                  chartMode === 'xA/90' ? 'xA/90' : 
                  chartMode === 'CBI' ? 'CBI' : 
                  chartMode === 'defCon' ? 'Defensive Contributions' : 
                  chartMode === 'defCon90' ? 'Defensive Contributions / 90' : ''}
        />
      ) : (
        <Next5LineChart
          players={chartPlayers}
          mode={chartMode}
          gwLabels={Array.from({ length: gwRange[1] - gwRange[0] + 1 }, (_, i) => `GW${gwRange[0] + i}`)}
        />
      )}
      <TableContainer
        sx={{
          maxHeight: 800,
          maxWidth: '100vw',
          overflow: 'auto',
          fontSize: compactFontSize,
        }}
      >
        <Table stickyHeader aria-label="players table" size="small">
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
                  style={{
                    minWidth: column.minWidth,
                    cursor: 'pointer',
                    fontSize: compactFontSize,
                    padding: compactPadding,
                    whiteSpace: 'nowrap'
                  }}
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
                <TableRow key={player.id} hover>
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
                              src={`/team-badges/${team.short_name}.svg`}
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
                          style={{ 
                            cursor: 'pointer', 
                            fontWeight: 'bold',
                          }}
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
                        style={{
                          fontSize: compactFontSize,
                          padding: compactPadding,
                          whiteSpace: 'nowrap',
                        }}
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
        sx={{
          background: '#333333',
          color: '#fff',
          fontSize: isSmallScreen ? '0.75rem' : '0.95rem',
          maxWidth: '95vw !important',
          width: '100% !important', 
          '.MuiTablePagination-toolbar': {
            minHeight: '32px',
            paddingLeft: isSmallScreen ? '8px' : undefined,
            paddingRight: isSmallScreen ? '8px' : undefined,
            fontSize: isSmallScreen ? '0.65rem' : '0.95rem',
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows, .MuiTablePagination-select, .MuiInputBase-root': {
            fontSize: isSmallScreen ? '0.65rem' : '0.95rem',
          },
          '.MuiTablePagination-actions': {
            fontSize: isSmallScreen ? '0.65rem' : '0.95rem',
          },
        }}
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