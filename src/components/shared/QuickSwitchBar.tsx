// React imports:
import React, { Fragment } from "react";

import _ from "lodash";

// Font Awesome imports
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faArrowAltCircleDown,
  faArrowAltCircleRight,
  faWindowRestore,
  faWindowClose,
} from "@fortawesome/free-regular-svg-icons";

// Bootstrap imports
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

// Utils
import { CommonTableDefs } from "../../utils/tables/CommonTableDefs";

/** Delimiter used to separate the quick switch title from the extra mode (e.g., "extra" or "diff") */
export const quickSwitchDelim = ":|:";

/** The supported modes that can be shown for each quick switch option */
export type QuickSwitchMode =
  | "link"
  | "timer"
  | "diff"
  | "extra_down"
  | "extra_right";

/** Source of the quick switch update - link means the title was clicked, others correspond to icon clicks */
export type QuickSwitchSource = "link" | "timer" | "diff" | "extra";

export type QuickSwitchOption = {
  title?: string;
};

export type QuickSwitchBarProps = {
  /** The title to display when no quick switch is selected */
  title: string;
  /** Optional prefix for the title (e.g., "Shot Chart Analysis:") */
  titlePrefix?: string;
  /** The currently selected quick switch value (not including the delimiter/extra mode) */
  quickSwitch: string | undefined;
  /** The extra mode currently active ("extra" or "diff") */
  quickSwitchExtra: "extra" | "diff" | undefined;
  /** The list of quick switch options to display */
  quickSwitchOptions: QuickSwitchOption[] | undefined;
  /** Callback when a quick switch is selected or changed */
  updateQuickSwitch: (
    quickSwitch: string | undefined,
    newTitle: string | undefined,
    source: QuickSwitchSource,
    fromTimer: boolean
  ) => void;
  /** The current timer interval (if any) */
  quickSwitchTimer: NodeJS.Timer | undefined;
  /** Callback to set/clear the timer */
  setQuickSwitchTimer: (newQuickSwitchTimer: NodeJS.Timer | undefined) => void;
  /** The modes to display for each option (default: ["link", "timer"]) */
  modes?: QuickSwitchMode[];
  /** The current theme ("dark" or other) */
  theme?: string | undefined;
};

const QuickSwitchBar: React.FunctionComponent<QuickSwitchBarProps> = ({
  title,
  titlePrefix,
  quickSwitch,
  quickSwitchExtra,
  quickSwitchOptions,
  updateQuickSwitch,
  quickSwitchTimer,
  setQuickSwitchTimer,
  modes = ["link", "timer"],
  theme,
}) => {
  // Determine which modes are enabled
  const hasLink = _.includes(modes, "link");
  const hasTimer = _.includes(modes, "timer");
  const hasDiff = _.includes(modes, "diff");
  const hasExtraDown = _.includes(modes, "extra_down");
  const hasExtraRight = _.includes(modes, "extra_right");
  const hasExtra = hasExtraDown || hasExtraRight;

  // Tooltip text based on extra mode direction
  const extraTooltipText = hasExtraRight
    ? "Shows a side-by-side comparison between the two data sets"
    : "Shows a top/bottom comparison between the two data sets";
  const cancelExtraTooltipText = hasExtraRight
    ? "Hides the side-by-side comparison"
    : "Hides the top/bottom comparison";

  // Tooltips
  const timeTooltip = (
    <Tooltip id="timerTooltip">
      Sets off a 4s timer switching between the default breakdown and this one
    </Tooltip>
  );
  const rightArrowTooltip = (
    <Tooltip id="rightArrowTooltip">{extraTooltipText}</Tooltip>
  );
  const cancelRightArrowTooltip = (
    <Tooltip id="cancelRightArrowTooltip">{cancelExtraTooltipText}</Tooltip>
  );
  const diffViewTooltip = (
    <Tooltip id="diffViewTooltip">
      Shows a differential view of the two data sets
    </Tooltip>
  );
  const cancelDiffViewTooltip = (
    <Tooltip id="cancelDiffViewTooltip">
      Cancels the differential view of the two data sets
    </Tooltip>
  );

  // Icon builders
  const extraArrowBuilder = (t: string | undefined) => {
    if (quickSwitchExtra === "extra" && t === quickSwitch) {
      return (
        <OverlayTrigger placement="auto" overlay={cancelRightArrowTooltip}>
          <FontAwesomeIcon icon={faWindowClose} />
        </OverlayTrigger>
      );
    } else {
      return (
        <OverlayTrigger placement="auto" overlay={rightArrowTooltip}>
          <FontAwesomeIcon
            icon={hasExtraRight ? faArrowAltCircleRight : faArrowAltCircleDown}
          />
        </OverlayTrigger>
      );
    }
  };

  const diffViewBuilder = (t: string | undefined) => {
    if (quickSwitchExtra === "diff" && t === quickSwitch) {
      return (
        <OverlayTrigger placement="auto" overlay={cancelDiffViewTooltip}>
          <FontAwesomeIcon icon={faWindowClose} />
        </OverlayTrigger>
      );
    } else {
      return (
        <OverlayTrigger placement="auto" overlay={diffViewTooltip}>
          <FontAwesomeIcon icon={faWindowRestore} />
        </OverlayTrigger>
      );
    }
  };

  // Timer logic
  const quickSwitchTimerLogic = (newQuickSwitch: string | undefined) => {
    if (quickSwitchTimer) {
      clearInterval(quickSwitchTimer);
    }
    if (quickSwitch) {
      updateQuickSwitch(undefined, undefined, "timer", false);
    } else {
      updateQuickSwitch(newQuickSwitch, newQuickSwitch, "timer", false);
    }
    if (newQuickSwitch) {
      setQuickSwitchTimer(
        setInterval(() => {
          updateQuickSwitch(newQuickSwitch, newQuickSwitch, "timer", true);
        }, 4000)
      );
    } else {
      setQuickSwitchTimer(undefined);
    }
  };

  // Build the quick switch buttons
  const quickSwitchBuilder = _.map(
    quickSwitchTimer
      ? [{ title: `Cancel 4s timer` }]
      : quickSwitchOptions || [],
    (opt) => opt.title
  ).map((t, index) => {
    const isSelected = t === quickSwitch;

    return (
      <span
        key={`quickSwitch-${index}`}
        style={{
          ...(isSelected
            ? CommonTableDefs.getTextShadow(
                { value: 0 },
                (val: number) => "#772953",
                "15px",
                theme === "dark" ? 3 : 1
              )
            : {}),
          whiteSpace: "nowrap",
        }}
      >
        [
        {hasLink ? (
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (!quickSwitchTimer) {
                const newValue =
                  isSelected && !quickSwitchExtra ? undefined : t;
                updateQuickSwitch(newValue, t, "link", false);
              } else {
                quickSwitchTimerLogic(undefined);
              }
            }}
          >
            {t}
          </a>
        ) : (
          <span>{t}</span>
        )}
        {hasTimer || hasExtra || hasDiff ? " " : ""}
        {quickSwitchTimer ? undefined : (
          <Fragment>
            {hasTimer && (
              <span>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    quickSwitchTimerLogic(t);
                  }}
                >
                  <OverlayTrigger placement="auto" overlay={timeTooltip}>
                    <FontAwesomeIcon icon={faClock} />
                  </OverlayTrigger>
                  &nbsp;
                </a>
              </span>
            )}
            {hasExtra && (
              <span>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (quickSwitchExtra === "extra" && t === quickSwitch) {
                      updateQuickSwitch(undefined, undefined, "extra", false);
                    } else {
                      updateQuickSwitch(
                        `${t}${quickSwitchDelim}extra`,
                        t,
                        "extra",
                        false
                      );
                    }
                  }}
                >
                  {extraArrowBuilder(t)}&nbsp;
                </a>
              </span>
            )}
            {hasDiff && (
              <span>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (quickSwitchExtra === "diff" && t === quickSwitch) {
                      updateQuickSwitch(undefined, undefined, "diff", false);
                    } else {
                      updateQuickSwitch(
                        `${t}${quickSwitchDelim}diff`,
                        t,
                        "diff",
                        false
                      );
                    }
                  }}
                >
                  {diffViewBuilder(t)}&nbsp;
                </a>
              </span>
            )}
          </Fragment>
        )}
        ]&nbsp;
      </span>
    );
  });

  // Determine the displayed title
  const displayedTitle = quickSwitchExtra ? title : quickSwitch || title;
  const fullTitlePrefix = titlePrefix || "Analysis:";

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline" }}>
      <span style={{ whiteSpace: "nowrap" }}>
        <b>
          {fullTitlePrefix} [{displayedTitle}]
        </b>
      </span>
      {_.isEmpty(quickSwitchOptions) ? null : (
        <span style={{ whiteSpace: "nowrap" }}>
          &nbsp;|&nbsp;<i>quick-toggles:</i>&nbsp;
        </span>
      )}
      {_.isEmpty(quickSwitchOptions) ? null : quickSwitchBuilder}
    </div>
  );
};

export default QuickSwitchBar;
