import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import type { Team } from '../types/fpl';
import './TeamTable.css';

// Define props type for TeamTable
type TeamTableProps = {
  teams: Team[];
};

const columns = [
  // { label: 'ID', key: 'id' },
  { label: '', key: 'badge' }, 
  { label: 'Name', key: 'name' },
  { label: 'Played', key: 'played' },
  { label: 'Win', key: 'win' },
  { label: 'Draw', key: 'draw' },
  { label: 'Loss', key: 'loss' },
  { label: 'Points', key: 'points' },
  { label: 'Position', key: 'position' },
  { label: 'Strength', key: 'strength' },
  { label: 'Strength Overall Home', key: 'strength_overall_home' },
  { label: 'Strength Overall Away', key: 'strength_overall_away' },
  { label: 'Strength Attack Home', key: 'strength_attack_home' },
  { label: 'Strength Attack Away', key: 'strength_attack_away' },
  { label: 'Strength Defence Home', key: 'strength_defence_home' },
  { label: 'Strength Defence Away', key: 'strength_defence_away' },
  { label: 'Form', key: 'form' },
];

export default function TeamTable({ teams }: TeamTableProps) {
  const [sortBy, setSortBy] = React.useState<string>('id');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedTeams = React.useMemo(() => {
    return [...teams].sort((a, b) => {
      const aValue = a[sortBy as keyof Team];
      const bValue = b[sortBy as keyof Team];
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return sortDirection === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
  }, [teams, sortBy, sortDirection]);

  return (
    <TableContainer component={Paper} sx={{ maxWidth: '95vw', width: '100%' }}>
      <Table sx={{ minWidth: 650 }} size="small" aria-label="teams table">
        <TableHead>
          <TableRow>{columns.map(col => (
            <TableCell 
              key={col.key}
              style={{ cursor: 'pointer' }}
              onClick={() => handleSort(col.key)}
            >
              {col.label}
              {sortBy === col.key ? (
                sortDirection === 'asc'
                  ? <ArrowUpwardIcon fontSize="small" />
                  : <ArrowDownwardIcon fontSize="small" />
              ) : null}
            </TableCell>
          ))}</TableRow>
        </TableHead>
        <TableBody>
          {sortedTeams.map(team => (
            <TableRow key={team.id}>
              {columns.map(col => (
                <TableCell key={col.key}>
                  {col.key === 'badge'
                    ? (
                        <img
                          src={`http://localhost:5000/backend/team-badges/${team.short_name}.svg`}
                          alt={team.short_name}
                          style={{ width: 32, height: 32 }}
                        />
                      )
                    : col.key === 'unavailable'
                      ? team.unavailable ? 'Yes' : 'No'
                      : team[col.key as keyof Team] ?? ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}