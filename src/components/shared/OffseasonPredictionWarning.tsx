import React, { useState, useEffect } from "react";
import Card from "react-bootstrap/Card";
import { ClientRequestCache } from "../../utils/ClientRequestCache";
import { DateUtils } from "../../utils/DateUtils";
import { UrlRouting } from "../../utils/UrlRouting";
import {
  OffseasonLeaderboardParams,
  ParamDefaults,
} from "../../utils/FilterModels";

type Props = {
  year?: string;
  gender?: string;
};

const OffseasonPredictionWarning: React.FunctionComponent<Props> = ({
  year,
  gender,
}) => {
  const seasonToViewReport =
    year == DateUtils.yearWithActiveTransferPortal
      ? DateUtils.getPrevYear(year)
      : year;

  const OFFSEASON_WARNING_DETAILS = (
    <>
      <p>
        <b>Why not?</b> Basically it assumes any player's (SoS-adjusted)
        "all-in-one metrics" (RAPM, Net Pts) will be similar to their previous
        season's (with a bit of the season before), plus a little bonus for
        getting older. Freshmen are based on their 247 Composite (aka a wild
        guess!), and for unranked international players if I even know about
        them I'll use the first comp I can find on google (or whatever Bart
        has.)
      </p>
      <p>
        <b>Why does it exist then?</b>
      </p>
      <p>
        - Even if the methodology isn't great, it does measure <i>something</i>{" "}
        useful: what would happen if you basically transplanted the roster's
        performance from last season.
      </p>
      <p>
        - Unlike other off-season rankings, it gives a range
        (optimistic/balanced/pessimistic).
      </p>
      <p>
        - You can add / remove players, nerf/buff their offense/defense, and see
        what that does to a team's ranking. This is why I built it in fact, I
        find it easier to play around with.
      </p>
      <p>
        - The
        <a
          href={UrlRouting.getOffseasonLeaderboard({
            year: year || ParamDefaults.defaultYear,
            gender: gender || ParamDefaults.defaultGender,
            transferInOutMode: true,
          } as OffseasonLeaderboardParams)}
          target="_blank"
        >
          "breakdown of offseason metrics"
        </a>{" "}
        view is an interesting decomposition of the ranking into transfer
        in/out, development from returning players. Even if the prediction
        itself is not good, the relative values of the components can be
        insightful.
      </p>
      <p>
        - Where it's different to your intuition (/"obviously wrong"!), the way
        in which it's wrong can be useful.{" "}
        <i>
          Eg a team that always has a good defense is projected to have a bad
          defense - this usually means they've lost their best defenders, or
          brought in some weaker mid major defenders ... so even if the concern
          is unfounded, it's something to look out for.
        </i>
      </p>
      <p>
        <i>
          For what it's worth, empirically it performs similartly to KenPom and
          Torvik. I publish a{" "}
          <a
            href={UrlRouting.getOffseasonLeaderboard({
              year: seasonToViewReport || ParamDefaults.defaultYear,
              gender: gender || ParamDefaults.defaultGender,
              evalMode: true,
            } as OffseasonLeaderboardParams)}
            target="_blank"
          >
            "report"
          </a>{" "}
          of how I did (why don't more people do this?!) - which is often
          interesting itself, to see why teams were better/worse than a simple
          prediction.
        </i>
      </p>
    </>
  );

  const [detailsExpanded, setDetailsExpanded] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return ClientRequestCache.getSavedOffseasonWarning();
    }
    return true;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      ClientRequestCache.setSavedOffseasonWarning(detailsExpanded);
    }
  }, [detailsExpanded]);

  return (
    <Card
      id="offseason-warning"
      className="landing-page offseason-warning-banner"
    >
      <Card.Body>
        <Card.Text style={{ fontSize: "1rem" }}>
          <p>
            <b>Warning</b>: This is a very simple off-season model that isn't
            intended to provide "good" predictions.{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setDetailsExpanded(!detailsExpanded);
              }}
            >
              {detailsExpanded ? "(less)" : "(explain please!)"}
            </a>
          </p>
          {detailsExpanded && OFFSEASON_WARNING_DETAILS}
        </Card.Text>
      </Card.Body>
    </Card>
  );
};

export default OffseasonPredictionWarning;
