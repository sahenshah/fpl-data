import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import type { Team, Fixture } from '../types/fpl';
import './FixtureTable.css';

interface FixtureTableProps {
  teams: Team[];
  fixtures: Fixture[];
}

// Generate 38 gameweek columns
const gwColumns = Array.from({ length: 38 }, (_, i) => ({
  label: `GW${i + 1}`,
  key: `gw_${i + 1}`,
}));

const columns = [
  { label: 'ID', key: 'id' },
  { label: '', key: 'badge' },
  { label: 'Name', key: 'name' },
  { label: 'Played', key: 'played' },
  { label: 'Win', key: 'win' },
  { label: 'Draw', key: 'draw' },
  { label: 'Loss', key: 'loss' },
  { label: 'Points', key: 'points' },
  { label: 'Position', key: 'position' },
  { label: 'Strength', key: 'strength' },
  ...gwColumns, // Add GW columns at the end
];

function getDifficultyColor(difficulty: number) {
  // Example: 1 (easy, green) to 5 (hard, red)
  switch (difficulty) {
    case 1: return '#00831fff'; // green
    case 2: return '#54c96fe5'; // light green
    case 3: return '#f3be4de3'; // yellow
    case 4: return '#e75f5fff'; // light red
    case 5: return '#a7242fff'; // red
    default: return '#fff';   // default white
  }
}

const FixtureTable = ({ teams, fixtures }: FixtureTableProps) => {
  const teamFixturesMap = buildTeamFixturesMap(teams, fixtures);

  return (
    <TableContainer component={Paper} sx={{ maxWidth: '95vw', width: '100%' }}>
      <Table sx={{ minWidth: 650 }} size="small" aria-label="fixture table">
        <TableHead>
          <TableRow>
            {columns.map(col => (
              <TableCell
                key={col.key}
                className={
                  col.key === 'badge' ? 'sticky-badge' :
                  col.key === 'short_name' ? 'sticky-id' :
                  col.key === 'name' ? 'sticky-name' :
                  undefined
                }
                style={col.key === 'badge' ? { top: 0, left: 0, zIndex: 100, background: '#444', minWidth: 40 } : undefined}
              >
                {/* Add non-breaking space for blank badge header to avoid rendering issues */}
                {col.key === 'badge' ? <span>&nbsp;</span> : col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {teams.map(team => (
            <TableRow key={team.id} sx={{ height: 40 }}>
              {columns.map(col => {
                const stickyClass =
                  col.key === 'short_name' ? 'sticky-id' :
                  col.key === 'name' ? 'sticky-name' :
                  undefined;

                if (col.key === 'badge') {
                  return (
                    <TableCell key={col.key} className="sticky-badge" style={{ height: 40, padding: '8px', background: '#444' }}>
                      <img
                        src={`http://localhost:5000/backend/team-badges/${team.short_name}.svg`}
                        alt={team.short_name}
                        style={{ width: 28, height: 28 }}
                      />
                    </TableCell>
                  );
                }

                if (col.key === 'strength') {
                  const strengthValue = team[col.key as keyof Team];
                  const bgColor = getDifficultyColor(Number(strengthValue));
                  return (
                    <TableCell
                      key={col.key}
                      style={{
                        backgroundColor: bgColor,
                        height: 40,
                        padding: '8px',
                        color: '#222',
                        fontWeight: 'bold',
                        textAlign: 'center',
                      }}
                    >
                      {strengthValue}
                    </TableCell>
                  );
                }

                if (col.key.startsWith('gw_')) {
                  const gwNum = Number(col.key.replace('gw_', ''));
                  const fixture = teamFixturesMap[team.id][gwNum];
                  const bgColor = fixture ? getDifficultyColor(fixture.difficulty) : '#fff';
                  return (
                    <TableCell
                      key={col.key}
                      className={stickyClass}
                      style={{ backgroundColor: bgColor, height: 40, padding: '8px' }}
                    >
                      {fixture ? fixture.text : ''}
                    </TableCell>
                  );
                }

                // All other columns: always grey
                return (
                  <TableCell
                    key={col.key}
                    className={stickyClass}
                    style={{ background: '#444', height: 40, padding: '8px' }}
                  >
                    {team[col.key as keyof Team] ?? ''}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Create a lookup: teamId -> { gwNumber -> fixtureInfo }
function buildTeamFixturesMap(teams: Team[], fixtures: Fixture[]) {
  const map: Record<number, Record<number, { text: string, difficulty: number }>> = {};
  const teamShortName: Record<number, string> = {};
  teams.forEach(team => {
    map[team.id] = {};
    teamShortName[team.id] = team.short_name;
  });

  fixtures.forEach(fix => {
    // Home team: show opponent in UPPERCASE, use team_h_difficulty
    if (map[fix.team_h]) {
      map[fix.team_h][fix.event] = {
        text: teamShortName[fix.team_a].toUpperCase(),
        difficulty: fix.team_h_difficulty
      };
    }
    // Away team: show opponent in lowercase, use team_a_difficulty
    if (map[fix.team_a]) {
      map[fix.team_a][fix.event] = {
        text: teamShortName[fix.team_h].toLowerCase(),
        difficulty: fix.team_a_difficulty
      };
    }
  });

  return map;
}

export default FixtureTable;