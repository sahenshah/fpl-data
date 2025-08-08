import React, { useEffect, useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import './TeamSummary.css';
import TeamSummaryLeaguesTable from './TeamSummaryLeaguesTable';
import TeamSummaryHistory from './TeamSummaryHistory';

interface TeamSummaryProps {
  teamId: string;
}

const TeamSummary: React.FC<TeamSummaryProps> = ({ teamId }) => {
  const [teamData, setTeamData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      setLoading(true);
      setError(null);
      fetch(`/api/entry/${teamId}`)
        .then(res => res.json())
        .then(data => {
          setTeamData(data);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to fetch team data');
          setLoading(false);
        });
    } else {
      setTeamData(null);
    }
  }, [teamId]);

  if (!teamId) return null;
  if (loading) return <p>Loading team data...</p>;
  if (error) return <p className="team-summary-error">{error}</p>;
  if (teamData && teamData.error) {
    // Check for 404 error from backend
    if (
      typeof teamData.error === 'string' &&
      teamData.error.includes('404') &&
      teamData.error.includes('Not Found')
    ) {
      return <p className="team-summary-error">Team ID does not exist</p>;
    }
    return <p className="team-summary-error">{teamData.error}</p>;
  }
  if (!teamData) return null;

  // Map API data to table rows (example fields, adjust as needed)
  const rows = [
    { label: 'First Name', value: teamData.player_first_name },
    { label: 'Last Name', value: teamData.player_last_name },
    { label: 'Region', value: teamData.player_region_name },
    { label: 'Started', value: teamData.started },
    { label: 'Last Updated', value: teamData.last_updated },
    { label: 'Overall Rank', value: teamData.summary_overall_rank },
    { label: 'Points', value: teamData.summary_overall_points },
    { label: 'Bank', value: teamData.bank },
    { label: 'Value', value: teamData.value },
  ];

  return (
    <div className='team-summary-container'>
      <div className="team-summary-header">
        <Typography variant="h5" gutterBottom>
          <strong>{teamData.name}</strong>
        </Typography>
      </div>
      <div className="team-summary-tables-row">
        <div className="team-summary-table-container">
          <TableContainer component={Paper} className="team-summary-table-container">
            <Table
              size="small"
              sx={{
                minWidth: 350,
                '& .MuiTableCell-root': {
                  paddingTop: '4px',
                  paddingBottom: '4px',
                  fontSize: '0.95rem',
                },
              }}
              aria-label="team summary table"
            >
              <TableHead>
                <TableRow>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell component="th" scope="row">
                      {row.label}
                    </TableCell>
                    <TableCell>
                      {row.value ?? '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <div className="team-summary-leagues-table-container">
            <TeamSummaryLeaguesTable teamId={teamId} />
          </div>
        </div>
        <div className="team-summary-history-table-container">
        <TeamSummaryHistory teamId={teamId} />
        </div>
      </div>
    </div>
  );
};

export default TeamSummary;