import React from 'react';
import styles from './TeamSelection.module.css';
import TeamPitchDashboard from './TeamPitchDashboard';

interface TeamSelectionProps {
  teamId: string;
}


const TeamSelection: React.FC<TeamSelectionProps> = ({ teamId }) => {
  return (
    <div className={styles['team-selection-container']}>
      <TeamPitchDashboard teamId={teamId} />
    </div>
  );
};

export default TeamSelection;
