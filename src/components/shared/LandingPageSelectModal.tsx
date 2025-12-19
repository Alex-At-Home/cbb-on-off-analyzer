// React imports:
import React, { useState, useEffect } from "react";

// Lodash:
import _ from "lodash";

// Bootstrap imports:
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

// Additional components:
// @ts-ignore
import Select, { components } from "react-select";

// App imports:
import { ParamDefaults } from "../../utils/FilterModels";
import { DateUtils } from "../../utils/DateUtils";
import { AvailableTeams } from "../../utils/internal-data/AvailableTeams";
import ThemedSelect from "./ThemedSelect";

// Props type definition
type Props = {
  show: boolean;
  onHide: () => void;
  onSave: (year: string, gender: string, team: string) => void;
  /** If specified then on exit opens a new tab with this URL */
  visitOnSave?: (year: string, gender: string, team: string) => string;
  onClear: () => void;
  year: string;
  gender: string;
  team: string;
};

const LandingPageSelectModal: React.FunctionComponent<Props> = ({
  onSave,
  visitOnSave,
  onClear,
  year,
  gender,
  team,
  ...props
}) => {
  // State management for form values
  const [selectedYear, setSelectedYear] = useState(year);
  const [selectedGender, setSelectedGender] = useState(gender);
  const [selectedTeam, setSelectedTeam] = useState(team);

  // Helper function to convert string to Select option format
  const stringToOption = (val: string) => {
    return { value: val, label: val };
  };

  /** For use in team select */
  function getCurrentTeamOrPlaceholder() {
    const currTeam = AvailableTeams.calculateCurrentLabel(
      selectedTeam,
      selectedYear,
      selectedGender,
      (aliasUpdate) => {
        setSelectedTeam(aliasUpdate);
      }
    );
    return currTeam;
  }

  // Function to handle menu list rendering (similar to CommonFilter)
  const maybeMenuList = () => {
    return {};
  };

  // Update state when props change
  useEffect(() => {
    setSelectedYear(year);
    setSelectedGender(gender);
    setSelectedTeam(team);
  }, [year, gender, team]);

  // Handle save action
  const handleSave = () => {
    onSave(selectedYear, selectedGender, selectedTeam);
  };

  return (
    <Modal
      {...props}
      className="modal_upper"
      backdropClassName="modal_backdrop_upper"
      size="xl"
      onEntered={() => {
        document.body.style.overflow = "scroll";
      }}
    >
      <Modal.Header closeButton>
        <Modal.Title>
          {visitOnSave ? "To Continue " : ""}Select Team Season
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Container>
          <Form>
            <Form.Group as={Row}>
              <Col xs={6} sm={6} md={3} lg={2}>
                <ThemedSelect
                  isDisabled={false}
                  value={stringToOption(selectedGender)}
                  options={Array.from(
                    new Set(
                      AvailableTeams.getTeams(
                        selectedTeam,
                        selectedYear,
                        null
                      ).map((r) => r.gender)
                    )
                  ).map((gender) => stringToOption(gender))}
                  isSearchable={false}
                  onChange={(option: any) => {
                    if ((option as any)?.value) {
                      setSelectedGender((option as any).value);
                    }
                  }}
                />
              </Col>
              <Col xs={6} sm={6} md={3} lg={2}>
                <ThemedSelect
                  isDisabled={false}
                  styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
                  value={stringToOption(selectedYear)}
                  options={_.reverse(
                    Array.from(
                      //(reverse because years are descending we want them ascending)
                      new Set(
                        AvailableTeams.getTeams(
                          selectedTeam,
                          null,
                          selectedGender
                        ).map((r) => r.year)
                      )
                    )
                  )
                    .concat([AvailableTeams.extraTeamName])
                    .map((year) => stringToOption(year))}
                  isSearchable={false}
                  onChange={(option: any) => {
                    if ((option as any)?.value) {
                      setSelectedYear((option as any).value);
                    }
                  }}
                />
              </Col>
              <Col className="w-100" bsPrefix="d-lg-none d-md-none" />
              <Col xs={12} sm={12} md={6} lg={6}>
                <ThemedSelect
                  isDisabled={false}
                  components={maybeMenuList()}
                  isClearable={false}
                  styles={{ menu: (base: any) => ({ ...base, zIndex: 1000 }) }}
                  value={getCurrentTeamOrPlaceholder()}
                  options={AvailableTeams.teamsToLabels(
                    AvailableTeams.getTeams(null, selectedYear, selectedGender)
                  )}
                  onChange={(option: any) => {
                    const selection = (option as any)?.value || "";
                    if (selectedYear == AvailableTeams.extraTeamName) {
                      const teamYear = selection.split(/ (?=[^ ]+$)/);
                      setSelectedTeam(teamYear[0]);
                      setSelectedYear(teamYear[1]);
                    } else {
                      setSelectedTeam(selection);
                    }
                  }}
                />
              </Col>
            </Form.Group>
          </Form>
        </Container>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={props.onHide}>
          Cancel
        </Button>
        {visitOnSave ? undefined : (
          <Button variant="danger" onClick={onClear}>
            Clear
          </Button>
        )}
        {visitOnSave ? (
          <>
            <Button
              variant="primary"
              disabled={!selectedYear || !selectedGender || !selectedTeam}
              href={visitOnSave(selectedYear, selectedGender, selectedTeam)}
              target="_blank"
              onClick={handleSave}
              title="Continues to the selected page, and saves the team-season as a default"
            >
              Save & Open...
            </Button>
            <Button
              variant="primary"
              disabled={!selectedYear || !selectedGender || !selectedTeam}
              href={visitOnSave(selectedYear, selectedGender, selectedTeam)}
              title="Continues to the selected page, does NOT save the team-season as a default"
              target="_blank"
            >
              Open...
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              onClick={() => onSave("", selectedGender, "")}
              disabled={!selectedGender}
            >
              Set Default Gender
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!selectedYear || !selectedGender || !selectedTeam}
            >
              Save
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default LandingPageSelectModal;
