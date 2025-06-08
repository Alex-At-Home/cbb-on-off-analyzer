import React, { useState } from "react";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import TeamPlayTypeDiagView from "../../components/diags/TeamPlayTypeDiagView";
import TeamPlayTypeDiagRadar from "../../components/diags/TeamPlayTypeDiagRadar";
import {
  IndivStatSet,
  RosterStatsByCode,
  TeamStatSet,
} from "../../utils/StatModels";
import { DivisionStatsCache } from "../../utils/tables/GradeTableUtils";

// Props for TeamPlayTypeDiagView
export type TeamPlayTypeDiagViewProps = {
  title: string;
  players: Array<IndivStatSet>;
  rosterStatsByCode: RosterStatsByCode;
  teamStats: TeamStatSet;
  avgEfficiency: number;
  quickSwitchOptions?: any[];
  showGrades: string;
  grades?: DivisionStatsCache;
  showHelp: boolean;
};
// Props for TeamPlayTypeDiagRadar
export type TeamPlayTypeDiagRadarProps = {
  title?: string;
  players: Array<IndivStatSet>;
  rosterStatsByCode: RosterStatsByCode;
  teamStats: TeamStatSet;
  avgEfficiency: number;
  quickSwitchOptions?: any[];
  showGrades: string;
  grades?: DivisionStatsCache;
  showHelp: boolean;
  playCountToUse?: number;
  quickSwitchOverride: string | undefined;
  defensiveOverride?: any;
  startWithRaw?: boolean;
  configStr?: string;
  updateConfig?: (configStr: string) => void;
};

// Union type for the tabbed view
export type TeamPlayTypeTabbedViewProps = {
  title: string;
  players: Array<IndivStatSet>;
  rosterStatsByCode: RosterStatsByCode;
  teamStats: TeamStatSet;
  avgEfficiency: number;
  quickSwitchOptions?: any[];
  showGrades: string;
  grades?: DivisionStatsCache;
  showHelp: boolean;
  configStr?: string;
  updateConfig?: (configStr: string) => void;
};

const TeamPlayTypeTabbedView: React.FC<TeamPlayTypeTabbedViewProps> = (
  props
) => {
  const [activeKey, setActiveKey] = useState<string>("breakdown");
  return (
    <Tabs
      activeKey={activeKey}
      onSelect={(k) => setActiveKey(k || "breakdown")}
      id="team-playtype-tabs"
      className="mb-1"
    >
      <Tab eventKey="scoring" title="Scoring">
        <TeamPlayTypeDiagView {...props} tableType="scoring" />
      </Tab>
      <Tab eventKey="usage" title="Usage">
        <TeamPlayTypeDiagView {...props} tableType="usage" />
      </Tab>
      <Tab eventKey="breakdown" title="Play Types">
        <TeamPlayTypeDiagRadar {...props} quickSwitchOverride={undefined} />
      </Tab>
    </Tabs>
  );
};

export default TeamPlayTypeTabbedView;
