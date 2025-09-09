import React from 'react';
import 'flag-icons/css/flag-icons.min.css';
import styles from './TeamSummary.module.css';

interface TeamSummaryProps {
  teamId: string;
}

const TeamSummary: React.FC<TeamSummaryProps> = ({ teamId }) => {
  const teamDataRaw = localStorage.getItem(`team_${teamId}_data`);
  if (!teamDataRaw) {
    return (
      <div className={styles['team-summary-container']}>
        <h3>No team data found.</h3>
      </div>
    );
  }

  const teamData = JSON.parse(teamDataRaw);
  const isoCode = teamData.player_region_iso_code_short?.toLowerCase();

  return (
    <div className={styles['team-summary-container']}>
      <div className={styles['player-region-flag-container']}>
        {isoCode ? (
          <span className={`fi fi-${isoCode}`} style={{ fontSize: '3em' }}></span>
        ) : (
          <span>🌍</span>
        )}
      </div>
      <div className={styles['player-names-container']}>
        <div className={styles['player-name-large']}>
            {teamData.player_first_name} {teamData.player_last_name}
        </div>
        <div className={styles['player-team-name']}>
            {teamData.name}
        </div>
      </div>
    </div>
  );
};

export default TeamSummary;