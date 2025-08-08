import React, { useEffect, useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import './TeamSummaryLeaguesTable.css';

interface TeamSummaryLeaguesTableProps {
  teamId: string;
}

const TeamSummaryLeaguesTable: React.FC<TeamSummaryLeaguesTableProps> = ({ teamId }) => {
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      setLoading(true);
      setError(null);
      fetch(`/api/entry/${teamId}`)
        .then(res => res.json())
        .then(data => {
          const classic = data.leagues?.classic ?? [];
          const h2h = data.leagues?.h2h ?? [];
          setLeagues([...classic, ...h2h]);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to fetch leagues data');
          setLoading(false);
        });
    } else {
      setLeagues([]);
    }
  }, [teamId]);

  if (!teamId) return null;
  if (loading) return <p>Loading leagues...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!leagues.length) return <p>No leagues found.</p>;

  return (
    <TableContainer component={Paper} className="team-summary-leagues-table-container">
      <Table aria-label="leagues table">
        <TableHead>
          <TableRow>
            <TableCell>League Name</TableCell>
            <TableCell align="right">Rank</TableCell>
            <TableCell align="right">Points</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leagues.map((league: any) => (
            <TableRow key={league.id}>
              <TableCell>{league.name}</TableCell>
              <TableCell align="right">{league.standings?.results?.[0]?.rank ?? '-'}</TableCell>
              <TableCell align="right">{league.standings?.results?.[0]?.total ?? '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TeamSummaryLeaguesTable;