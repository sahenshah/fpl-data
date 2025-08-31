import { useEffect, useState } from 'react';
import type { Team, Fixture } from '../types/fpl';
import './FixtureTable.css';
import { getCurrentGameweek } from '../App';
import Slider from '@mui/material/Slider';

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
  const [sortColumn, setSortColumn] = useState<string>('position');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
    { label: '#', key: 'position' },
    { label: '', key: 'badge' },
    { label: 'Name', key: 'name' },
    { label: 'Played', key: 'played' },
    { label: 'Win', key: 'win' },
    { label: 'Draw', key: 'draw' },
    { label: 'Loss', key: 'loss' },
    { label: 'Points', key: 'points' },
    { label: 'Strength', key: 'strength' },
    { label: 'Strength Overall (H)', key: 'strength_overall_home' },
    { label: 'Strength Overall (A)', key: 'strength_overall_away' },
    { label: 'Strength Attack (H)', key: 'strength_attack_home' },
    { label: 'Strength Attack (A)', key: 'strength_attack_away' },
    { label: 'Strength Defence (H)', key: 'strength_defence_home' },
    { label: 'Strength Defence (A)', key: 'strength_defence_away' },
    { label: 'Form', key: 'form' },
    ...gwColumns.slice(gwRange[0] - 1, gwRange[1]),
  ];

  const teamFixturesMap = buildTeamFixturesMap(teams, fixtures);

  function getTeamOverallDifficulty(team: Team) {
    let total = 0;
    for (let gw = gwRange[0]; gw <= gwRange[1]; gw++) {
      const fixture = fixtures.find(fix =>
        (fix.team_h === team.id || fix.team_a === team.id) && fix.event === gw
      );
      if (fixture) {
        if (fixture.team_h === team.id) {
          // Home: use opponent's strength_overall_away
          const opponent = teams.find(t => t.id === fixture.team_a);
          total += opponent ? Number(opponent.strength_overall_away) || 0 : 0;
        } else if (fixture.team_a === team.id) {
          // Away: use opponent's strength_overall_home
          const opponent = teams.find(t => t.id === fixture.team_h);
          total += opponent ? Number(opponent.strength_overall_home) || 0 : 0;
        }
      }
    }
    return total;
  }

  // Sorting logic
  const sortedTeams = (() => {
    let arr = sortByDifficulty
      ? [...teams]
          .map(team => {
            const difficulty = getTeamOverallDifficulty(team);
            // Log the calculated difficulty for each team
            return { team, difficulty };
          })
          .sort((a, b) => a.difficulty - b.difficulty) // Ascending order
          .map(obj => obj.team)
      : [...teams];

    if (sortColumn && !sortByDifficulty) {
      arr = arr.sort((a, b) => {
        let aValue = a[sortColumn as keyof Team];
        let bValue = b[sortColumn as keyof Team];

        // Try to convert to number if possible
        if (typeof aValue === 'string' && !isNaN(Number(aValue))) aValue = Number(aValue);
        if (typeof bValue === 'string' && !isNaN(Number(bValue))) bValue = Number(bValue);

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return sortDirection === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }
    return arr;
  })();

  const handleSort = (colKey: string) => {
    if (sortByDifficulty) setSortByDifficulty(false);

    if (sortColumn === colKey) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  return (
    <div className="fixture-table-outer-container">
      <div className="fixture-table-container">
        <div className="fixture-controls">
          <div className="fixture-slider" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ 
              color: '#fff', 
              minWidth: 35, 
              padding: 0, 
              textAlign: 'right', 
              fontSize: 14, 
              fontWeight: 500 
            }}>
              GW {gwRange[0]}
            </span>
            <Slider
              value={gwRange}
              min={1}
              max={38}
              step={1}
              onChange={(_, value) => setGwRange(value as [number, number])}
              valueLabelDisplay="auto"
              disableSwap
              sx={{
                width: 320,
                color: '#7768f6',
                mx: 2,
                '& .MuiSlider-rail': {
                  height: 18,
                  borderRadius: 4,
                },
                '& .MuiSlider-track': {
                  height: 18,
                  borderRadius: 4,
                },
                '& .MuiSlider-thumb': {
                  height: 20,
                  width: 20,
                  backgroundColor: '#000000ff',
                  border: '7px solid #7768f6',
                },
                // Left thumb (first thumb)
                '& .MuiSlider-thumb[data-index="0"]': {
                  borderTopLeftRadius: '50%',
                  borderBottomLeftRadius: '50%',
                  borderTopRightRadius: '0',
                  borderBottomRightRadius: '0',
                },
                // Right thumb (second thumb)
                '& .MuiSlider-thumb[data-index="1"]': {
                  borderTopLeftRadius: '0',
                  borderBottomLeftRadius: '0',
                  borderTopRightRadius: '50%',
                  borderBottomRightRadius: '50%',
                },
              }}
            />
            <span style={{ 
              color: '#fff', 
              minWidth: 48, 
              padding: 0, 
              fontSize: 14, 
              textAlign: 'left', 
              fontWeight: 500 
            }}>
              GW {gwRange[1]}
            </span>
          </div>
          <button
            className={`fixture-sort-btn${sortByDifficulty ? ' active' : ''}`}
            onClick={() => {
              setSortByDifficulty(s => {
                if (!s) setSortColumn('position');
                return !s;
              });
            }}
          >
            {sortByDifficulty ? 'Sorted by Overall Fixture Difficulty' : 'Sort by Overall Fixture Difficulty'}
          </button>
        </div>
        <div style={{ overflowX: 'auto', maxWidth: '95vw', width: '100%' }}>
          <table className="fixture-table">
            <thead>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={
                    col.key === 'badge' ? 'sticky-badge-fixture' :
                    col.key === 'position' ? 'sticky-position' :
                    col.key === 'name' ? 'sticky-name' :
                    'gw' in col && col.gw === currentGW ? 'current-gw-col' : undefined
                  }
                  style={{
                    cursor: col.key !== 'badge' && !col.key.startsWith('gw_') ? 'pointer' : undefined,
                    minWidth: col.key === 'badge' ? 40 : undefined,
                  }}
                  onClick={() => {
                    if (
                      col.key !== 'badge' &&
                      !col.key.startsWith('gw_')
                    ) {
                      handleSort(col.key);
                    }
                  }}
                >
                  {col.key === 'badge' ? <span>&nbsp;</span> : (
                    <>
                      {col.label}
                      {sortColumn === col.key && (
                        sortDirection === 'asc'
                          ? <span style={{ verticalAlign: 'middle', fontSize: 16, marginLeft: 2 }}>▲</span>
                          : <span style={{ verticalAlign: 'middle', fontSize: 16, marginLeft: 2 }}>▼</span>
                      )}
                    </>
                  )}
                </th>
              ))}
            </thead>
            <tbody>
              {sortedTeams.map(team => (
                <tr key={team.id}>
                  {columns.map(col => {
                    const stickyClass =
                      col.key === 'position' ? 'sticky-position' :
                      col.key === 'name' ? 'sticky-name' :
                      undefined;

                    if (col.key === 'badge') {
                      return (
                        <td key={col.key} className="sticky-badge-fixture">
                          <img
                            src={`/team-badges/${team.short_name}.svg`}
                            alt={team.short_name}
                            style={{ width: 28, height: 28 }}
                          />
                        </td>
                      );
                    }

                    if (col.key === 'strength') {
                      const strengthValue = team[col.key as keyof Team];
                      const bgColor = getDifficultyColor(Number(strengthValue));
                      return (
                        <td key={col.key}>
                          <span
                            style={{
                              backgroundColor: bgColor,
                              color: '#ffffffff',
                              fontWeight: 'bold',
                              borderRadius: '8px',
                              padding: '4px 12px',
                              display: 'inline-block',
                              minWidth: 32,
                            }}
                          >
                            {strengthValue}
                          </span>
                        </td>
                      );
                    }

                    if (col.key.startsWith('gw_')) {
                      const gwNum = Number(col.key.replace('gw_', ''));
                      const fixture = teamFixturesMap[team.id][gwNum];
                      const bgColor = fixture ? getDifficultyColor(fixture.difficulty) : '#fff';
                      return (
                        <td
                          key={col.key}
                          className={`${stickyClass ? stickyClass + ' ' : ''}${gwNum === currentGW ? 'current-gw-cell' : ''}`}
                          style={{ backgroundColor: bgColor }}
                        >
                          {fixture ? fixture.text : ''}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.key}
                        className={stickyClass}
                      >
                        {team[col.key as keyof Team] ?? ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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