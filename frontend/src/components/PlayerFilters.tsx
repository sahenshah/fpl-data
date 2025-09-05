import React from 'react';
import type { Team, Element } from '../types/fpl';
import './PlayerFilters.css';
import Slider from '@mui/material/Slider';

interface PositionOption {
  value: string;
  label: string;
}

interface PlayerFiltersProps {
  players: Element[];
  teams: Team[];
  onFilteredPlayers: (filtered: Element[]) => void;
  costRange: [number, number];
  setCostRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  activeFilters: string[];
  setActiveFilters: React.Dispatch<React.SetStateAction<string[]>>;
}

const positionOptions: PositionOption[] = [
  { value: '1', label: 'GK' },
  { value: '2', label: 'DEF' },
  { value: '3', label: 'MID' },
  { value: '4', label: 'FWD' },
];

const topFilterButtonLabels = [
  'General', 
  'Selected %',
  'Bonus Points', 
  'Def Cons', 
  'ICT', 
  'Cards',
  'xData', 
  'Per 90', 
];

const bottomFilterButtonLabels = [
  'Predicted',
  'xPts',
  'xMins',
];

const PlayerFilters: React.FC<PlayerFiltersProps> = ({ players, teams, onFilteredPlayers, costRange, setCostRange, activeFilters, setActiveFilters }) => {
  const [positionFilter, setPositionFilter] = React.useState<string[]>(() => positionOptions.map(p => p.value));
  const [teamFilter, setTeamFilter] = React.useState<string[]>(() => teams.map(t => t.name));
  const [minutesFilter, setMinutesFilter] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [showSearchInput, setShowSearchInput] = React.useState(false);
  const [showPositionDropdown, setShowPositionDropdown] = React.useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = React.useState(false);

  // Update teamFilter if teams prop changes (e.g., after fetch)
  React.useEffect(() => {
    setTeamFilter(teams.map(t => t.name));
  }, [teams]);

  // Filtering logic
  React.useEffect(() => {
    let filtered = [...players];

    // Position filter
    if (positionFilter.length > 0) {
      filtered = filtered.filter(player =>
        positionFilter.includes(String(player.element_type))
      );
    }

    // Team filter
    if (teamFilter.length > 0 && teamFilter.length !== teams.length) {
      filtered = filtered.filter(player => {
        const team = teams.find(t => t.id === player.team);
        return team && teamFilter.includes(team.name);
      });
    }

    // Minutes filter
    if (minutesFilter && !isNaN(Number(minutesFilter))) {
      filtered = filtered.filter(player => player.minutes >= Number(minutesFilter));
    }

    // Cost range filter
    filtered = filtered.filter(player =>
      player.now_cost >= costRange[0] && player.now_cost <= costRange[1]
    );

    // Name search
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(player =>
        player.web_name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      );
    }

    onFilteredPlayers(filtered);
  }, [players, teams, positionFilter, teamFilter, minutesFilter, searchTerm, costRange, onFilteredPlayers]);

  // Focus the input when it appears
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (showSearchInput && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchInput]);

  // Position dropdown logic
  const togglePositionDropdown = () => setShowPositionDropdown(v => !v);
  const handleAllPositions = () => {
    if (positionFilter.length === positionOptions.length) {
      setPositionFilter([]);
    } else {
      setPositionFilter(positionOptions.map(p => p.value));
    }
  };
  const handlePositionOption = (value: string) => {
    setPositionFilter(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  // Team dropdown logic
  const toggleTeamDropdown = () => setShowTeamDropdown(v => !v);
  const handleTeamOption = (value: string) => {
    setTeamFilter(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };
  const handleAllTeams = () => {
    if (teamFilter.length === teams.length) {
      setTeamFilter([]);
    } else {
      setTeamFilter(teams.map(t => t.name));
    }
  };

  // Close dropdowns on outside click
  React.useEffect(() => {
    const closeDropdowns = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.custom-dropdown.position')) setShowPositionDropdown(false);
      if (!target.closest('.custom-dropdown.team')) setShowTeamDropdown(false);
    };
    document.addEventListener('mousedown', closeDropdowns);
    return () => document.removeEventListener('mousedown', closeDropdowns);
  }, []);

  // Filter button click handler
  const handleFilterButtonClick = (label: string) => {
    if (topFilterButtonLabels.includes(label)) {
      if (label === 'General') {
        setActiveFilters(prev => {
          const allTopActive = topFilterButtonLabels.every(l => prev.includes(l));
          // If all top filters are active, deselect all except General
          // If not all are active, select all top filters
          return allTopActive ? ['General'] : [...topFilterButtonLabels];
        });
      } else {
        setActiveFilters(prev => {
          // Remove all bottom row filters
          let next = prev.filter(l => !bottomFilterButtonLabels.includes(l));
          // Always include General
          if (!next.includes('General')) next = ['General', ...next];
          // Toggle the clicked top filter (except General itself)
          if (label !== 'General') {
            if (next.includes(label)) {
              next = next.filter(l => l !== label);
            } else {
              next.push(label);
            }
          }
          return next;
        });
      }
    } else if (bottomFilterButtonLabels.includes(label)) {
      if (label === 'Predicted') {
        setActiveFilters(prev => {
          const allBottomActive = bottomFilterButtonLabels.every(l => prev.includes(l));
          // If all bottom filters are active, deselect all except Predicted
          // If not all are active, select all bottom filters
          return allBottomActive ? ['Predicted'] : [...bottomFilterButtonLabels];
        });
      } else {
        setActiveFilters(prev => {
          // Remove all top row filters
          let next = prev.filter(l => !topFilterButtonLabels.includes(l) && l !== 'General');
          // Always include Predicted
          if (!next.includes('Predicted')) next = ['Predicted', ...next];
          // Toggle the clicked bottom filter (except Predicted itself)
          if (label !== 'Predicted') {
            if (next.includes(label)) {
              next = next.filter(l => l !== label);
            } else {
              next.push(label);
            }
          }
          return next;
        });
      }
    }
  };

  return (
    <div className="player-filters-root">
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div className="player-filters-title">
        Player Filters:
      </div>
        <div className="player-filters-left">
          <div className="player-filters-search-container">
            {!showSearchInput ? (
              <button
                className="player-filters-search-icon"
                onClick={() => setShowSearchInput(true)}
                tabIndex={0}
                aria-label="Search by name"
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="white" strokeWidth="1.5" />
                  <line x1="11.25" y1="11.75" x2="15" y2="15.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            ) : (
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onBlur={() => setShowSearchInput(false)}
                placeholder="Search by name"
                className="player-filters-search-input"
                style={{ minWidth: 180 }}
              />
            )}
          </div>
          <div className="player-filters-dropdown-input">
            {/* Position filter */}
            <div className="custom-dropdown position">
              <button
                className="custom-dropdown-btn"
                onClick={togglePositionDropdown}
                type="button"
              >
                {positionFilter.length === positionOptions.length
                  ? 'Position'
                  : positionFilter.length === 0
                    ? 'No Positions'
                    : positionOptions
                      .filter(opt => positionFilter.includes(opt.value))
                      .map(opt => opt.label)
                      .join(', ')}
                <span className="custom-dropdown-arrow">&#9662;</span>
              </button>
              {showPositionDropdown && (
                <div className="custom-dropdown-menu">
                  <label className="custom-dropdown-item">
                    <input
                      type="checkbox"
                      checked={positionFilter.length === positionOptions.length}
                      onChange={handleAllPositions}
                    />
                    All Positions
                  </label>
                  {positionOptions.map(option => (
                    <label key={option.value} className="custom-dropdown-item">
                      <input
                        type="checkbox"
                        checked={positionFilter.includes(option.value)}
                        onChange={() => handlePositionOption(option.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Team filter */}
            <div className="custom-dropdown team">
              <button
                className="custom-dropdown-btn"
                onClick={toggleTeamDropdown}
                type="button"
              >
                {teamFilter.length === teams.length
                  ? 'Teams'
                  : teamFilter.length === 0
                    ? 'No Teams'
                    : 'Selected'}
                <span className="custom-dropdown-arrow">&#9662;</span>
              </button>
              {showTeamDropdown && (
                <div className="custom-dropdown-menu teams-dropdown">
                  <label className="custom-dropdown-item">
                    <input
                      type="checkbox"
                      checked={teamFilter.length === teams.length}
                      onChange={handleAllTeams}
                    />
                    All Teams
                  </label>
                  {teams.map(team => (
                    <label key={team.id} className="custom-dropdown-item">
                      <input
                        type="checkbox"
                        checked={teamFilter.includes(team.name)}
                        onChange={() => handleTeamOption(team.name)}
                      />
                      <img
                        src={`/team-badges/${team.short_name}.svg`}
                        alt={team.short_name}
                        style={{ width: 22, height: 22, marginRight: 8, verticalAlign: 'middle' }}
                      />
                      {team.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {/* Minutes filter */}
            <input
              type="number"
              min={0}
              value={minutesFilter}
              onChange={e => setMinutesFilter(e.target.value)}
              placeholder="Min Minutes"
              className="xmins-filter-input"
              step={10}
            />
          </div>
          {/* Add margin-top to the slider box for spacing */}
          <div
            className="custom-slider-box"
            style={{
              width: 450,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingLeft: 0,
              paddingRight: 0,

            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 13,
                minWidth: 40,
                padding: 6,
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              £{(costRange[0] / 10).toFixed(1)}
            </span>
            <Slider
              value={costRange}
              min={38}
              max={150}
              step={1}
              marks={[
                { value: 38 },
                { value: 150 }
              ]}
              valueLabelDisplay="off"
              onChange={(_, value) => setCostRange(value as [number, number])}
              disableSwap
              sx={{
                color: '#7768f6',
                flex: 1,
                '& .MuiSlider-rail': {
                  height: 20, // Increase rail thickness here (default is 4)
                  borderRadius: 4,
                  color: '#000000ff'
                },
                '& .MuiSlider-track': {
                  height: 20, // Match the rail thickness
                  borderRadius: 0,
                },
                '& .MuiSlider-thumb': {
                  color: '#000000ff',
                  outline: '3px solid #7768f6',
                  height: 18,
                  width: 18,
                  transition: 'width 0.2s, height 0.2s',
                  '&:hover, &.Mui-focusVisible': {
                    height: 28,
                    width: 28,
                  },
                },
              }}
            />
            <span
              style={{
                color: '#fff',
                fontSize: 13,
                padding: 6,
                minWidth: 40,
                textAlign: 'left',
                flexShrink: 0,
              }}
            >
              £{(costRange[1] / 10).toFixed(1)}
            </span>
          </div>
      </div>
      </div>
      {/* Vertical divider */}
      <div
        className="player-filters-divider"
      />
      <div style={{maxWidth: '500px', minWidth: '350px'}}> 
        {/* Top filter buttons */}
        <div className="player-filters-title">
          Table Data:
        </div>
        <div className='player-filters-buttons-container' 
             style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: 8,
              marginTop: 10
              }}>
          <div className="player-filters-buttons" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {topFilterButtonLabels.map((label) => (
              <button
                key={label}
                type="button"
                className="player-filter-btn"
                style={{
                  background: activeFilters.includes(label) ? '#7768f6' : '#23232b',
                  color: '#fff',
                  border: '1px solid #7768f6',
                  height: 28,
                  borderRadius: 24,
                  padding: '6px 14px',
                  fontWeight: activeFilters.includes(label) ? 600 : 400,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onClick={() => handleFilterButtonClick(label)}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Bottom filter buttons */}
          <div className="player-filters-buttons" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {bottomFilterButtonLabels.map((label) => (
              <button
                key={label}
                type="button"
                className="player-filter-btn"
                style={{
                  background: activeFilters.includes(label) ? '#7768f6' : '#23232b',
                  color: '#fff',
                  border: '1px solid #7768f6',
                  height: 28,
                  borderRadius: 24,
                  padding: '6px 14px',
                  fontWeight: activeFilters.includes(label) ? 600 : 400,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onClick={() => handleFilterButtonClick(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerFilters;