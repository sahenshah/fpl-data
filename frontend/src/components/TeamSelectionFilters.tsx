import React from 'react';
import type { Team, Element } from '../types/fpl';
import styles from './TeamSelectionFilters.module.css'; // <-- Use module CSS
import Slider from '@mui/material/Slider';

interface PositionOption {
  value: string;
  label: string;
}

interface TeamSelectionFiltersProps {
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

const TeamSelectionFilters: React.FC<TeamSelectionFiltersProps> = ({
  players, teams, onFilteredPlayers, costRange, setCostRange, setActiveFilters
}) => {
  const [positionFilter, setPositionFilter] = React.useState<string[]>(() => positionOptions.map(p => p.value));
  const [teamFilter, setTeamFilter] = React.useState<string[]>(() => teams.map(t => t.name));
  const [minutesFilter, setMinutesFilter] = React.useState<string>('');
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [showSearchInput, setShowSearchInput] = React.useState(false);
  const [showPositionDropdown, setShowPositionDropdown] = React.useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = React.useState(false);
  const [selectColumnsDropdownOpen, setSelectColumnsDropdownOpen] = React.useState(false);
  const [expandedDropdownOptions, setExpandedDropdownOptions] = React.useState<string[] | null>(null); 
  const [expandedDropdownSelected, setExpandedDropdownSelected] = React.useState<string[]>([]);
  
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

  const handlePositionOption = (value: string) => {
    setPositionFilter(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  // Team dropdown logic
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

  const positionDropdownRef = React.useRef<HTMLDivElement>(null);
  const teamDropdownRef = React.useRef<HTMLDivElement>(null);

  // Outside click handler for dropdowns
  React.useEffect(() => {
    const closeDropdowns = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        showPositionDropdown &&
        positionDropdownRef.current &&
        !positionDropdownRef.current.contains(target) &&
        !target.closest('.custom-dropdown-btn.position')
      ) {
        setShowPositionDropdown(false);
      }
      if (
        showTeamDropdown &&
        teamDropdownRef.current &&
        !teamDropdownRef.current.contains(target) &&
        !target.closest('.custom-dropdown-btn.team')
      ) {
        setShowTeamDropdown(false);
      }
    };
    document.addEventListener('mousedown', closeDropdowns);
    return () => document.removeEventListener('mousedown', closeDropdowns);
  }, [showPositionDropdown, showTeamDropdown]);

  // Filter button click handler
  const handleFilterButtonClick = (label: string) => {
    if (label === 'General') {
      setActiveFilters(['General']);
    } else if (label === 'Predicted') {
      setActiveFilters(['Predicted']);
    } else {
      setActiveFilters(prev => {
        // If General or Predicted is already active, keep it
        const base =
          prev.includes('General') ? ['General'] :
            prev.includes('Predicted') ? ['Predicted'] : [];
        // Add or remove the selected label
        if (prev.includes(label)) {
          // Remove label
          return base.concat(prev.filter(l => l !== label && l !== 'General' && l !== 'Predicted'));
        } else {
          // Add label
          return base.concat(prev.filter(l => l !== 'General' && l !== 'Predicted'), label);
        }
      });
    }
  };

  return (
    <div className={styles['player-filters-root']} style={{ position: 'relative' }}>
      {/* Bottom dropdown for General/Predicted toggle */}
      <div style={{ position: 'absolute', bottom: -30, right: 0 }}>
        <button
          className={styles['filters-dropdown-icon']}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            width: 22,
            height: 22,
          }}
          onClick={() => setSelectColumnsDropdownOpen(open => !open)}
          aria-label="Open bottom dropdown"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" stroke="#7768f6" strokeWidth="2" fill="#23232b"/>
            <path d="M7 9l4 4 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {selectColumnsDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              background: '#23232b',
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              zIndex: 20,
              minWidth: 150,
              padding: '4px 0',
              maxHeight: '60vh', 
              overflowY: 'auto',
            }}
          >
            <button
              style={{
                background: 'none',
                color: '#fff',
                border: 'none',
                width: '100%',
                padding: '10px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 8,
                fontWeight: 500,
              }}
              onClick={() => {
                handleFilterButtonClick('General');
                setExpandedDropdownOptions(topFilterButtonLabels);
                setExpandedDropdownSelected([]);
                setSelectColumnsDropdownOpen(false);
              }}
            >
              General
            </button>
            <button
              style={{
                background: 'none',
                color: '#fff',
                border: 'none',
                width: '100%',
                padding: '10px 16px',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 8,
                fontWeight: 500,
              }}
              onClick={() => {
                handleFilterButtonClick('Predicted');
                setExpandedDropdownOptions(bottomFilterButtonLabels);
                setExpandedDropdownSelected([]);
                setSelectColumnsDropdownOpen(false);
              }}
            >
              Predicted
            </button>
          </div>
        )}
      </div>
      {expandedDropdownOptions && (
        <div
          style={{
            position: 'absolute',
            top: "265px",
            right: 0,
            background: '#23232b',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 21,
            minWidth: 150,
            padding: '8px 0',
          }}
        >
          {expandedDropdownOptions.map(option => (
            option === 'General' || option === 'Predicted' ? (
              <div
                key={option}
                style={{
                  padding: '8px 16px',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                {option}
              </div>
            ) : (
              <label
                key={option}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={expandedDropdownSelected.includes(option)}
                  onChange={() => {
                    setExpandedDropdownSelected(prev =>
                      prev.includes(option)
                        ? prev.filter(o => o !== option)
                        : [...prev, option]
                    );
                    handleFilterButtonClick(option);
                  }}
                  style={{ marginRight: 8 }}
                />
                {option}
              </label>
            )
          ))}
          <button
            style={{
              background: '#7768f6',
              color: '#fff',
              border: 'none',
              width: '100%',
              padding: '8px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              borderRadius: 8,
              fontWeight: 500,
              marginTop: 4,
            }}
            onClick={() => setExpandedDropdownOptions(null)}
          >
            Close
          </button>
        </div>
      )}

      <div className={styles['player-filters-container']}>
        <div className={styles['player-filters-left']}>
          {/* Add margin-top to the slider box for spacing */}
          <div
            className={styles['custom-slider-box']}
            style={{
              width: '100%',
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
          <div className={styles['player-filters-dropdown-input']}>
            <div className={styles['position-toggle-buttons']}>
              {positionOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles['position-toggle-btn']} ${positionFilter.includes(option.value) ? styles['active'] : ''}`}
                  onClick={() => handlePositionOption(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            
            {/* Team filter */}
            <div className={styles['custom-dropdown'] + ' ' + styles['team']} style={{ position: 'relative', display: 'inline-block' }}>
              <button
                className={`${styles['custom-dropdown-btn']} custom-dropdown-btn team`}
                onClick={() => setShowTeamDropdown(v => !v)}
                type="button"
              >
                {teamFilter.length === teams.length
                  ? 'Teams'
                  : teamFilter.length === 0
                    ? 'No Teams'
                    : 'Selected'}
                <span className={styles['custom-dropdown-arrow']}>&#9662;</span>
              </button>
              {showTeamDropdown && (
                <div
                  ref={teamDropdownRef}
                  className={styles['custom-dropdown-menu'] + ' ' + styles['teams-dropdown']}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 20,
                    background: '#23232b',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    minWidth: 140,
                    padding: '8px 0',
                  }}
                >
                  <label className={styles['custom-dropdown-item']}>
                    <input
                      type="checkbox"
                      checked={teamFilter.length === teams.length}
                      onChange={handleAllTeams}
                    />
                    All Teams
                  </label>
                  {teams.map(team => (
                    <label key={team.id} className={styles['custom-dropdown-item']}>
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
              className={styles['mins-filter-input']}
              step={10}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onBlur={() => setShowSearchInput(false)}
              placeholder="Search name"
              className={styles['player-filters-search-input']}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamSelectionFilters;