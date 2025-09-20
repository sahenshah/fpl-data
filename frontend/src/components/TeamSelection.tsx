import React, { useState, useEffect } from 'react';
import styles from './TeamSelection.module.css';
import type { Team, Element } from '../types/fpl';
import TeamSelectionFilters from './TeamSelectionFilters';
import TeamSelectionPlayerTable from './TeamSelectionPlayerTable';
import FormationContainer from './TeamFormationContainer';

interface TeamSelectionProps {
  teamId: string;
}


const TeamSelection: React.FC<TeamSelectionProps> = ({ teamId }) => {
  const [elements, setElements] = useState<Element[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Element[]>([]);
  const [costRange, setCostRange] = useState<[number, number]>([38, 150]);
  const [activeFilters, setActiveFilters] = React.useState<string[]>(['General']);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/static_json/elements.json')
      .then(res => res.json())
      .then(data => setElements(data))
      .catch(() => setElements([]));
    fetch('/static_json/teams.json')
      .then(res => res.json())
      .then(data => setTeams(data))
      .catch(() => setTeams([]));
  }, []);
	useEffect(() => {
		setFilteredPlayers(elements);
	}, [elements]);


  return (
    <div className={styles['team-selection-container']}>
      <div className='team-formation-container'>
        <FormationContainer
          teamId={teamId}
          selectedPlayerId={selectedPlayerId}
          onSelectionHandled={() => setSelectedPlayerId(null)}
        />
      </div>
      <div className={styles['filters-container']}>
        <TeamSelectionFilters
          players={elements}
          teams={teams}
          onFilteredPlayers={setFilteredPlayers}
          costRange={costRange}
          setCostRange={setCostRange}
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
        />
      </div>
      <div className={styles['player-table-container']}>
        <TeamSelectionPlayerTable
          players={filteredPlayers}
          teams={teams}
          activeFilters={activeFilters}
          selectable={true}
          onPlayerSelect={setSelectedPlayerId}
          selectedPlayerId={selectedPlayerId}
        />
      </div>
    </div>
  );
};

export default TeamSelection;
