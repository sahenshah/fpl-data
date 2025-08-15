import { useEffect, useState } from 'react';
import Slider from '@mui/material/Slider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import type { Team, Fixture } from '../types/fpl';
import './FixtureTable.css';
import { getCurrentGameweek } from '../App'; // Import the function

interface FixtureTableProps {
  teams: Team[];
  fixtures: Fixture[];
}

function getDifficultyColor(difficulty: number) {
  switch (difficulty) {
    case 1: return '#00831fff';
    case 2: return '#54c96fe5';
    case 3: return '#f3be4de3';
    case 4: return '#e75f5fff';
    case 5: return '#a7242fff';
    default: return '#fff';
  }
}

const FixtureTable = ({ teams, fixtures }: FixtureTableProps) => {
  const [currentGW, setCurrentGW] = useState<number>(1);
  const [gwRange, setGwRange] = useState<[number, number]>([1, 5]);
  const [sortByDifficulty, setSortByDifficulty] = useState(false);

  useEffect(() => {
    getCurrentGameweek().then(gw => {
      if (gw) {
        setCurrentGW(gw);
        setGwRange([gw, gw + 4 > 38 ? 38 : gw + 4]);
      }
    });
  }, []);

  const gwColumns = Array.from({ length: 38 }, (_, i) => ({
    label: `GW${i + 1}`,
    key: `gw_${i + 1}`,
    gw: i + 1,
  }));

  const columns = [
    { label: '', key: 'badge' },
    { label: 'Name', key: 'name' },
    { label: 'Played', key: 'played' },
    { label: 'Win', key: 'win' },
    { label: 'Draw', key: 'draw' },
    { label: 'Loss', key: 'loss' },
    { label: 'Points', key: 'points' },
    { label: 'Position', key: 'position' },
    { label: 'Strength', key: 'strength' },
    ...gwColumns.slice(gwRange[0] - 1, gwRange[1]),
  ];

  const teamFixturesMap = buildTeamFixturesMap(teams, fixtures);

  function getTeamDifficulty(teamId: number) {
    let total = 0;
    for (let gw = gwRange[0]; gw <= gwRange[1]; gw++) {
      const fixture = teamFixturesMap[teamId][gw];
      if (fixture) total += fixture.difficulty;
    }
    return total;
  }

  const sortedTeams = sortByDifficulty
    ? [...teams].sort((a, b) => getTeamDifficulty(a.id) - getTeamDifficulty(b.id))
    : teams;

  return (
    <>
      <div className="fixture-controls">
        <div
          className="fixture-slider"
          style={{
            paddingTop: 32,
            paddingBottom: 8,
            display: 'flex',
            justifyContent: 'left',
            alignItems: 'left',
            width: '100%',
          }}
        >
          <Slider
            value={gwRange}
            min={1}
            max={38}
            step={1}
            marks={[
              { value: 1, label: 'GW1' },
              { value: 38, label: 'GW38' }
            ]}
            valueLabelDisplay="auto"
            onChange={(_, value) => setGwRange(value as [number, number])}
            disableSwap
            sx={{ width: 600 }}
          />
        </div>
        <button
          className={`fixture-sort-btn${sortByDifficulty ? ' active' : ''}`}
          onClick={() => setSortByDifficulty(s => !s)}
        >
          {sortByDifficulty ? 'Sorted by Fixture Difficulty' : 'Sort by Fixture Difficulty'}
        </button>
      </div>
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
                    'gw' in col && col.gw === currentGW ? 'current-gw-col' : undefined
                  }
                  style={col.key === 'badge' ? { top: 0, left: 0, zIndex: 100, background: '#444', minWidth: 40 } : undefined}
                >
                  {col.key === 'badge' ? <span>&nbsp;</span> : col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTeams.map(team => (
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
                          src={`/team-badges/${team.short_name}.svg`}
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
                        className={`${stickyClass ? stickyClass + ' ' : ''}${gwNum === currentGW ? 'current-gw-cell' : ''}`}
                        style={{ backgroundColor: bgColor, height: 40, padding: '8px' }}
                      >
                        {fixture ? fixture.text : ''}
                      </TableCell>
                    );
                  }

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
    </>
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