import type { Team, Element } from '../types/fpl';
import './PlayerData.css';
import PlayerTableBody from './PlayerTableBody';
import React, { useEffect, useState, useRef } from 'react';
import LineChart from './LineChart';
import ScatterChart from './ScatterChart';
import MultiAreaRadar from './MultiAreaRadar';
import MultiAreaRadarAttack from './MultiAreaRadarAttack';
import MultiAreaRadarDefence from './MultiAreaRadarDefence';
import PlayerFilters from './PlayerFilters';

const chartSections = [
	{
		header: 'Predicted',
		options: [
			{ value: 'xPoints', label: 'Predicted Points', component: 'line' },
			{ value: 'xMins', label: 'Predicted Minutes', component: 'line' },
		],
	},
	{
		header: 'Radar',
		options: [
			{ value: 'playerSummaryRadar', label: 'Player Summary', component: 'radar' },
			{ value: 'attackSummaryRadar', label: 'Attack Summary', component: 'radar-attack' },
			{ value: 'defenceSummaryRadar', label: 'Defence Summary', component: 'radar-defence' },
		],
	},
	{
		header: 'Scatter',
		options: [
			{ value: 'totalPoints', label: 'Total Points', component: 'scatter' },
			{ value: 'xGI', label: 'xGI', component: 'scatter' },
			{ value: 'xGI90', label: 'xGI/90', component: 'scatter' },
			{ value: 'xG', label: 'xG', component: 'scatter' },
			{ value: 'xG90', label: 'xG/90', component: 'scatter' },
			{ value: 'xA', label: 'xA', component: 'scatter' },
			{ value: 'xA90', label: 'xA/90', component: 'scatter' },
			{ value: 'defCon', label: 'DefCons', component: 'scatter' },
			{ value: 'defCon90', label: 'DefCons/90', component: 'scatter' },
		],
	},
];

function PlayerData() {
	const [players, setPlayers] = useState<Element[]>([]);
	const [teams, setTeams] = useState<Team[]>([]);
	const [checked, setChecked] = useState<{ [id: number]: boolean }>({});
	const [filteredPlayers, setFilteredPlayers] = useState<Element[]>([]);
	const [chartMode, setChartMode] = useState<string>('xPoints');
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const gwRange: [number, number] = [1, 38];
	const [costRange, setCostRange] = useState<[number, number]>([40, 150]); // Example: £4.0m to £15.0m

	// Get the section that contains the current chart mode
	const getCurrentSection = () => {
		return chartSections.find(section => 
			section.options.some(option => option.value === chartMode)
		)?.header || 'Expected';
	};

	// Initialize collapsed sections - collapse all except the current section
	const [collapsedSections, setCollapsedSections] = useState<{ [key: string]: boolean }>(() => {
		const currentSection = getCurrentSection();
		const initialState: { [key: string]: boolean } = {};
		chartSections.forEach(section => {
			initialState[section.header] = section.header !== currentSection;
		});
		return initialState;
	});

	// Update collapsed sections when chart mode changes
	useEffect(() => {
		const currentSection = getCurrentSection();
		setCollapsedSections(() => {
			const newState: { [key: string]: boolean } = {};
			chartSections.forEach(section => {
				newState[section.header] = section.header !== currentSection;
			});
			return newState;
		});
	}, [chartMode]);

	useEffect(() => {
		fetch(`/static_json/elements.json`)
			.then(res => res.json())
			.then(data => setPlayers(data))
			.catch(() => setPlayers([]));
	}, []);

	useEffect(() => {
		fetch(`/static_json/teams.json`)
			.then(res => res.json())
			.then(data => setTeams(data))
			.catch(() => setTeams([]));
	}, []);

	useEffect(() => {
		setFilteredPlayers(players);
	}, [players]);

	// Close dropdown on outside click
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setDropdownOpen(false);
			}
		}
		if (dropdownOpen) {
			document.addEventListener('mousedown', handleClickOutside);
		} else {
			document.removeEventListener('mousedown', handleClickOutside);
		}
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [dropdownOpen]);

	// Toggle section collapse
	const toggleSection = (sectionHeader: string) => {
		setCollapsedSections(prev => ({
			...prev,
			[sectionHeader]: !prev[sectionHeader]
		}));
	};

	// Get selected players from the filtered list
	const selectedPlayers = filteredPlayers.filter(player => checked[player.id]);
	const selectedPlayerIds = Object.keys(checked).filter(key => checked[parseInt(key)]).map(id => parseInt(id));

	// Dynamically get the next 5 GW data for each player based on gwRange
	const chartPlayers = React.useMemo(() => {
		const getGWProp = (prefix: string, gw: number) => `${prefix}_gw_${gw}` as keyof Element;

		return selectedPlayers.map(player => {
			const predicted_points_gw: number[] = [];
			const predicted_xmins_gw: number[] = [];
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
	}, [selectedPlayers, gwRange]);

	// Get current chart mode config
	const getCurrentChartMode = () => {
		for (const section of chartSections) {
			const option = section.options.find(opt => opt.value === chartMode);
			if (option) return option;
		}
		return null;
	};

	const currentChartMode = getCurrentChartMode();

	// Get the display label for the current chart
	const getChartDisplayLabel = () => {
		return currentChartMode?.label || 'Player Data';
	};

	return (
		<div className="player-data-root">
			{/* Header Section */}
			<section className="player-data-section player-data-header">
				<h2>{getChartDisplayLabel()}</h2>
			</section>

			{/* Chart Section */}
			<section className="player-data-section" style={{ position: 'relative' }}>
				<div
					className="chart-dropdown-container"
					ref={dropdownRef}
				>
					<button
						className="chart-mode-arrow-btn"
						onClick={() => setDropdownOpen(!dropdownOpen)}
						aria-label="Change chart mode"
						type="button"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
							<path d="M7 10l5 5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
						</svg>
					</button>
					{dropdownOpen && (
						<div className="chart-mode-dropdown-list">
							{chartSections.map((section, sectionIndex) => (
								<div key={section.header}>
									<div 
										className="chart-section-header"
										onClick={() => toggleSection(section.header)}
										style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
									>
										<span>{section.header}</span>
										<svg 
											width="16" 
											height="16" 
											viewBox="0 0 24 24" 
											fill="none"
											style={{ 
												transform: collapsedSections[section.header] ? 'rotate(-90deg)' : 'rotate(0deg)',
												transition: 'transform 0.2s'
											}}
										>
											<path d="M7 10l5 5 5-5" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
										</svg>
									</div>
									{!collapsedSections[section.header] && (
										<div className="chart-section-options">
											{section.options.map(option => (
												<div
													key={option.value}
													className={`chart-mode-dropdown-option${chartMode === option.value ? ' selected' : ''}`}
													onClick={() => {
														setChartMode(option.value);
														setDropdownOpen(false);
													}}
													role="button"
													tabIndex={0}
												>
													{option.label}
												</div>
											))}
										</div>
									)}
									{sectionIndex < chartSections.length - 1 && (
										<div className="chart-section-divider"></div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
				<div className="player-data-chart">
					{currentChartMode?.component === 'scatter' ? (
						<ScatterChart
							players={selectedPlayers}
							yKey={chartMode === 'totalPoints' ? 'total_points' :
								chartMode === 'xGI' ? 'expected_goal_involvements' :
									chartMode === 'xGI90' ? 'expected_goal_involvements_per_90' :
										chartMode === 'xG' ? 'expected_goals' :
											chartMode === 'xG90' ? 'expected_goals_per_90' :
												chartMode === 'xA' ? 'expected_assists' :
													chartMode === 'xA90' ? 'expected_assists_per_90' :
														chartMode === 'defCon' ? 'defensive_contribution' :
															chartMode === 'defCon90' ? 'defensive_contribution_per_90' : ''}
							yLabel={chartMode === 'totalPoints' ? 'Total Points' :
								chartMode === 'xGI' ? 'xGI' :
									chartMode === 'xGI90' ? 'xGI/90' :
										chartMode === 'xG' ? 'xG' :
											chartMode === 'xG90' ? 'xG/90' :
												chartMode === 'xA' ? 'xA' :
													chartMode === 'xA90' ? 'xA/90' :
														chartMode === 'defCon' ? 'DefCons' :
															chartMode === 'defCon90' ? 'DefCons / 90' : ''}
							costRange={costRange} // Pass the cost range here
						/>
					) : chartMode === 'playerSummaryRadar' ? (
						selectedPlayerIds.length > 0 && selectedPlayerIds.length <= 10 ? (
							<MultiAreaRadar player={players.filter(p => selectedPlayerIds.includes(p.id))} />
						) : selectedPlayerIds.length > 10 ? (
							<div style={{ color: '#c70000ff', textAlign: 'center', padding: 24 }}>
								Please select no more than 10 players for the radar chart.
							</div>
						) : (
							<div style={{ color: '#ffffffff', textAlign: 'center', padding: 24 }}>
								<strong>Select 1-10 players using the checkboxes to view the radar chart.</strong>
							</div>
						)
					) : chartMode === 'attackSummaryRadar' ? (
						selectedPlayerIds.length > 0 && selectedPlayerIds.length <= 10 ? (
							<MultiAreaRadarAttack player={players.filter(p => selectedPlayerIds.includes(p.id))} />
						) : selectedPlayerIds.length > 10 ? (
							<div style={{ color: '#c70000ff', textAlign: 'center', padding: 24 }}>
								Please select no more than 10 players for the radar chart.
							</div>
						) : (
							<div style={{ color: '#ffffffff', textAlign: 'center', padding: 24 }}>
								<strong>Select 1-10 players using the checkboxes to view the radar chart.</strong>
							</div>
						)
					) : chartMode === 'defenceSummaryRadar' ? (
						selectedPlayerIds.length > 0 && selectedPlayerIds.length <= 10 ? (
							<MultiAreaRadarDefence player={players.filter(p => selectedPlayerIds.includes(p.id))} />
						) : selectedPlayerIds.length > 10 ? (
							<div style={{ color: '#c70000ff', textAlign: 'center', padding: 24 }}>
								Please select no more than 10 players for the radar chart.
							</div>
						) : (
							<div style={{ color: '#ffffffff', textAlign: 'center', padding: 24 }}>
								<strong>Select 1-10 players using the checkboxes to view the radar chart.</strong>
							</div>
						)
					) : (
						<LineChart
							players={chartPlayers}
							mode={chartMode === 'xPoints' || chartMode === 'xMins' ? chartMode : undefined}
						/>
					)}
				</div>
			</section>

			{/* Filters Section */}
			<section className="player-data-section">
				<div className="player-data-filters">
					<PlayerFilters
						players={players}
						teams={teams}
						onFilteredPlayers={setFilteredPlayers}
						costRange={costRange}
						setCostRange={setCostRange}
					/>
				</div>
			</section>

			{/* Table Section */}
			<section>
				<div className="player-data-table">
					<PlayerTableBody
						players={filteredPlayers}
						teams={teams}
						checked={checked}
						setChecked={setChecked}
					/>
				</div>
			</section>
		</div>
	);
}

export default PlayerData;