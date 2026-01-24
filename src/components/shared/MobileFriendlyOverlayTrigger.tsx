import React, { useState, useRef } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import { OverlayTriggerProps } from "react-bootstrap/OverlayTrigger";

export type MobileFriendlyOverlayTriggerProps = {
  /** The tooltip/popover overlay element */
  overlay: React.ReactElement;
  /** Placement of the overlay */
  placement?: OverlayTriggerProps["placement"];
  /** Called on click when overlay is already visible (i.e., second tap on mobile, or click after hover on desktop) */
  onClickWhenVisible?: (ev: React.MouseEvent | React.KeyboardEvent) => void;
  /** The trigger element */
  children: React.ReactElement;
};

/**
 * A wrapper around OverlayTrigger that allows click actions only when the tooltip is visible.
 *
 * On desktop: hover shows tooltip, then click triggers onClickWhenVisible
 * On mobile: first tap shows tooltip, second tap triggers onClickWhenVisible
 *
 * This solves the mobile UX problem where you want to both view a tooltip AND
 * have a clickable action on the same element.
 */
const MobileFriendlyOverlayTrigger: React.FC<
  MobileFriendlyOverlayTriggerProps
> = ({ overlay, placement = "top", onClickWhenVisible, children }) => {
  const [show, setShow] = useState(false);
  // Track when tooltip was shown via genuine mouse hover (not simulated from touch)
  const showFromHoverRef = useRef(false);
  // Track mouseenter timestamp to detect touch-simulated mouseenter
  const mouseEnterTimeRef = useRef(0);

  const handleMouseEnter = () => {
    mouseEnterTimeRef.current = Date.now();
    showFromHoverRef.current = true;
    setShow(true);
  };

  const handleMouseLeave = () => {
    showFromHoverRef.current = false;
    setShow(false);
  };

  const handleClick = (ev: React.MouseEvent) => {
    // On touch devices, mouseenter fires right before click (within ~100ms)
    // In that case, treat this as the "first tap" (show tooltip) not "click after hover"
    const timeSinceMouseEnter = Date.now() - mouseEnterTimeRef.current;
    const isSimulatedHover = timeSinceMouseEnter < 100;

    if (
      show &&
      showFromHoverRef.current &&
      !isSimulatedHover &&
      onClickWhenVisible
    ) {
      // Genuine hover-then-click (desktop) - trigger action, keep tooltip visible
      // (mouseLeave will hide it when user moves away)
      onClickWhenVisible(ev);
    } else if (show && !showFromHoverRef.current && onClickWhenVisible) {
      // Second tap on mobile (tooltip was shown via previous tap, not hover)
      // Trigger action, keep tooltip visible (user can tap elsewhere to dismiss)
      onClickWhenVisible(ev);
    } else {
      // First tap - just show the tooltip
      setShow(true);
      showFromHoverRef.current = false; // Mark that show came from tap, not hover
    }
  };

  const handleKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === "Enter" || ev.key === " ") {
      if (show && onClickWhenVisible) {
        // Trigger action, keep tooltip visible
        onClickWhenVisible(ev);
      } else {
        setShow(true);
        showFromHoverRef.current = false;
      }
    }
  };

  const enhancedChildren = React.cloneElement(children, {
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  });

  return (
    <OverlayTrigger placement={placement} overlay={overlay} show={show}>
      {enhancedChildren}
    </OverlayTrigger>
  );
};

export default MobileFriendlyOverlayTrigger;
