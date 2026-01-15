import React, { useState, useEffect } from 'react';
import styles from './TeamSelection.module.css';
import FormationContainer from './TeamFormationContainer';

interface TeamSelectionProps {
  teamId: string;
}


const TeamSelection: React.FC<TeamSelectionProps> = ({ teamId }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/static_json/teams.json')
      .then(res => res.json())
  }, []);


  return (
    <div className={styles['team-selection-container']}>
      <div className='team-formation-container'>
        <FormationContainer
          teamId={teamId}
          selectedPlayerId={selectedPlayerId}
          onSelectionHandled={() => setSelectedPlayerId(null)}
        />
      </div>
      {/* <div className={styles['filters-and-table-container']}>
      
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
      </div> */}
    
    </div>
  );
};

export default TeamSelection;
