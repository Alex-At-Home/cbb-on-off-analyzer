import React, { useState } from "react";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import PlayerPlayTypeDiagView from "../../components/diags/PlayerPlayTypeDiagView";
import IndivPlayTypeDiagRadar from "../../components/diags/IndivPlayTypeDiagRadar";
import {
  IndivStatSet,
  RosterStatsByCode,
  TeamStatSet,
} from "../../utils/StatModels";
import { DivisionStatsCache } from "../../utils/tables/GradeTableUtils";

// Props for IndivPlayTypeDiagView
export type IndivPlayTypeDiagViewProps = {
  player: IndivStatSet;
  rosterStatsByCode: RosterStatsByCode;
  teamStats: TeamStatSet;
  showHelp: boolean;
  showDetailsOverride?: boolean;
};
// Props for IndivPlayTypeDiagRadar
export type IndivPlayTypeDiagRadarProps = {
  title?: string;
  player: IndivStatSet;
  rosterStatsByCode: RosterStatsByCode;
  teamStats: TeamStatSet;
  avgEfficiency: number;
  quickSwitchOptions?: IndivPlayTypeDiagRadarProps[];
  showGrades: string;
  grades?: DivisionStatsCache;
  showHelp: boolean;
  playCountToUse?: number;
  quickSwitchOverride: string | undefined;
};

// Union type for the tabbed view
export type IndivPlayTypeTabbedViewProps = IndivPlayTypeDiagViewProps &
  IndivPlayTypeDiagRadarProps;

const IndivPlayTypeTabbedView: React.FC<IndivPlayTypeTabbedViewProps> = (
  props
) => {
  const [activeKey, setActiveKey] = useState<string>("breakdown");
  return (
    <Tabs
      activeKey={activeKey}
      onSelect={(k) => setActiveKey(k || "breakdown")}
      id="player-playtype-tabs"
      className="mb-1"
    >
      <Tab eventKey="scoring" title="Scoring">
        <PlayerPlayTypeDiagView {...props} />
      </Tab>
      <Tab eventKey="breakdown" title="Play Types">
        <IndivPlayTypeDiagRadar {...props} quickSwitchOverride={undefined} />
      </Tab>
    </Tabs>
  );
};

export default IndivPlayTypeTabbedView;
