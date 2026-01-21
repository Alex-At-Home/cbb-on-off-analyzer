import React, { useState } from "react";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import PlayerPlayTypeDiagView from "../../components/diags/PlayerPlayTypeDiagView";
import IndivPlayTypeDiagRadar, {
  PlayerStyleOpts,
} from "../../components/diags/IndivPlayTypeDiagRadar";
import {
  IndivStatSet,
  RosterStatsByCode,
  TeamStatSet,
} from "../../utils/StatModels";
import { DivisionStatsCache } from "../../utils/tables/GradeTableUtils";
import { QuickSwitchMode } from "./QuickSwitchBar";

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
  userOpts?: PlayerStyleOpts;
  onChangeChartOpts?: (opts: PlayerStyleOpts) => void; //(needs to be optional for quick switch options)
  showGrades: string;
  grades?: DivisionStatsCache;
  showHelp: boolean;
  playCountToUse?: number;
  navigationLinkOverride?: React.ReactElement;
  dynamicQuickSwitch?: boolean;
  quickSwitchModesOverride?: QuickSwitchMode[];
};

// Union type for the tabbed view
export type IndivPlayTypeTabbedViewProps = IndivPlayTypeDiagViewProps &
  IndivPlayTypeDiagRadarProps;

const IndivPlayTypeTabbedView: React.FC<IndivPlayTypeTabbedViewProps> = (
  props
) => {
  const [activeKey, setActiveKey] = useState<string>("breakdown");
  const { dynamicQuickSwitch, quickSwitchModesOverride, ...restProps } = props;
  return (
    <Tabs
      activeKey={activeKey}
      onSelect={(k) => setActiveKey(k || "breakdown")}
      id="player-playtype-tabs"
      className="mb-1"
    >
      <Tab eventKey="scoring" title="Scoring">
        <PlayerPlayTypeDiagView {...restProps} />
      </Tab>
      <Tab eventKey="breakdown" title="Play Types">
        <IndivPlayTypeDiagRadar
          {...restProps}
          dynamicQuickSwitch={dynamicQuickSwitch}
          quickSwitchModesOverride={quickSwitchModesOverride}
        />
      </Tab>
    </Tabs>
  );
};

export default IndivPlayTypeTabbedView;
