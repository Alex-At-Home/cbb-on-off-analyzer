import React from "react";
import { Dropdown } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { AnnotationUtils } from "../../utils/AnnotationUtils";

type Props = {
  friendlyChange?: (fn: () => void, changed: boolean) => void;
};

export const AnnotationMenuItems: React.FC<Props> = ({ friendlyChange }) => {
  const handleAnnotation = (captureType: "visible" | "fullpage") => {
    // Use Bootstrap's dropdown API to close cleanly without triggering tooltips
    const openDropdown = document.querySelector(".dropdown-menu.show");
    if (openDropdown) {
      // Remove the 'show' class to close dropdown
      openDropdown.classList.remove("show");

      // Also remove show from parent dropdown if present
      const parentDropdown = openDropdown.closest(".dropdown");
      if (parentDropdown) {
        const toggle = parentDropdown.querySelector(".dropdown-toggle");
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
          // Remove focus to prevent tooltip
          (toggle as HTMLElement).blur();
        }
      }
    }

    // Small delay to let dropdown close animation complete
    setTimeout(() => {
      const fn = () => AnnotationUtils.handleAnnotation(captureType);
      friendlyChange ? friendlyChange(fn, true) : fn();
    }, 100); // Reduced delay since we're closing more directly
  };
  const handlePageToPdf = (portrait: boolean) => {
    // Use Bootstrap's dropdown API to close cleanly without triggering tooltips
    const openDropdown = document.querySelector(".dropdown-menu.show");
    if (openDropdown) {
      // Remove the 'show' class to close dropdown
      openDropdown.classList.remove("show");

      // Also remove show from parent dropdown if present
      const parentDropdown = openDropdown.closest(".dropdown");
      if (parentDropdown) {
        const toggle = parentDropdown.querySelector(".dropdown-toggle");
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
          // Remove focus to prevent tooltip
          (toggle as HTMLElement).blur();
        }
      }
    }

    // Small delay to let dropdown close animation complete
    setTimeout(() => {
      const fn = () => AnnotationUtils.generatePageToPdf(portrait);
      friendlyChange ? friendlyChange(fn, true) : fn();
    }, 100); // Reduced delay since we're closing more directly
  };

  return (
    <>
      <Dropdown.Divider />
      <Dropdown.Item onClick={() => handleAnnotation("visible")}>
        <span>
          <FontAwesomeIcon icon={faEdit} />
          {"  "}Annotate visible screen
        </span>
      </Dropdown.Item>
      <Dropdown.Item onClick={() => handleAnnotation("fullpage")}>
        <span>
          <FontAwesomeIcon icon={faEdit} />
          {"  "}Annotate full page (can be slow)
        </span>
      </Dropdown.Item>
      <Dropdown.Item onClick={() => handlePageToPdf(true)}>
        <span>
          <FontAwesomeIcon icon={faEdit} />
          {"  "}Export page as PDF (portrait)
        </span>
      </Dropdown.Item>
      <Dropdown.Item onClick={() => handlePageToPdf(false)}>
        <span>
          <FontAwesomeIcon icon={faEdit} />
          {"  "}Export page as PDF (landscape)
        </span>
      </Dropdown.Item>
      <Dropdown.Item disabled className="text-muted font-italic small">
        Note: doesn't work well in Safari or Mobile
      </Dropdown.Item>
    </>
  );
};
