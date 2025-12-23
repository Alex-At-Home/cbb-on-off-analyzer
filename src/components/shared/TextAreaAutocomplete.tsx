/* Taken from https://github.com/yury-dymov/react-autocomplete-input/issues/135
 * because the original just stoppped working altogether in React 17 - this one was also broken out of the box
 * but I can edit changes to it to make it work again.
 * Slightly unclear what the licensing requirements are to duplicate the file, but I've attributed it
 * so will leave it like that for now since I was using the library before anyway so nothing should have changed.
 */

import type {
  ChangeEvent,
  ComponentProps,
  ForwardRefExoticComponent,
  MutableRefObject,
  ReactElement,
  ReactNode,
  RefObject,
} from "react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
//@ts-ignore
import getCaretCoordinates from "textarea-caret";
//@ts-ignore
import getInputSelection, { setCaretPosition } from "get-input-selection";
//@ts-ignore
import scrollIntoView from "scroll-into-view-if-needed";

import styles from "./TextAreaAutocomplete.module.css";

const KEY_UP = 38;
const KEY_DOWN = 40;
const KEY_RETURN = 13;
const KEY_ENTER = 14;
const KEY_ESCAPE = 27;
const KEY_TAB = 9;

const OPTION_LIST_MIN_WIDTH = 100;

export type Props<C extends string | ForwardRefExoticComponent<any>> = {
  Component?: C;
  defaultValue?: string;
  disabled?: boolean;
  maxOptions?: number;
  onBlur?: (...args: any[]) => void;
  onChange?: (value: string) => void;
  onKeyDown?: (...args: any[]) => void;
  onRequestOptions?: (value: string) => void;
  requestOnlyIfNoOptions?: boolean;
  onSelect?: (...args: any[]) => void;
  changeOnSelect?: (trigger: string | string[], slug: string) => string;
  options?: Record<string, string[]> | string[];
  richTextReplacements?: Record<string, { renderTo: ReactNode }>;
  regex?: string;
  matchAny?: boolean;
  minChars?: number;
  spaceRemovers?: string[];
  spacer?: string;
  trigger?: string | string[];
  value?: string;
  offsetX?: number;
  offsetY?: number;
  passThroughEnter?: boolean;
  passThroughTab?: boolean;
  triggerMatchWholeWord?: boolean;
  triggerCaseInsensitive?: boolean;
} & Omit<ComponentProps<any>, "onChange">;

export const TextAreaAutocomplete = forwardRef<HTMLInputElement, Props<any>>(
  (
    {
      Component,
      defaultValue,
      disabled,
      maxOptions = 4,
      onBlur,
      onChange,
      onKeyDown,
      onRequestOptions,
      requestOnlyIfNoOptions,
      onSelect,
      changeOnSelect = (trigger, slug) => trigger + slug,
      options = [],
      richTextReplacements,
      regex = "^[A-Za-z0-9\\-_.!]+$",
      matchAny,
      minChars = 0,
      spaceRemovers = [",", "?"],
      spacer = " ",
      trigger = "@",
      offsetX = 0,
      offsetY = 0,
      value,
      passThroughEnter,
      passThroughTab = true,
      triggerMatchWholeWord,
      triggerCaseInsensitive,
      ...rest
    },
    ref
  ) => {
    const [helperVisible, setHelperVisible] = useState(false);
    const [left, setLeft] = useState(0);
    const [stateTrigger, setStateTrigger] = useState<string | null>(null);
    const [matchLength, setMatchLength] = useState(0);
    const [matchStart, setMatchStart] = useState(0);
    const [stateOptions, setStateOptions] = useState<string[]>([]);
    const [selection, setSelection] = useState(0);
    const [top, setTop] = useState(0);
    const [stateValue, setStateValue] = useState<string | null>(null);
    const [caret, setCaret] = useState<number | null>(null);

    const recentValue = useRef(defaultValue);
    const enableSpaceRemovers = useRef(false);
    const internalRefInput = useRef<HTMLInputElement | null>(null);
    const refInput =
      (ref as MutableRefObject<HTMLInputElement | null>) || internalRefInput;
    const refCurrent = useRef<HTMLLIElement>(null);
    const refParent = useRef<HTMLUListElement>(null);

    // Rich text rendering logic
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const refRenderedInput = useRef<HTMLDivElement>(null);
    const [richRenderTimeoutId, setRichRenderTimeoutId] = useState(-1);
    /** Gets called whenever the value is changed externally, just reduces the rate at which we call the quite
     * expective rich text rendering logic */
    if (richTextReplacements)
      useEffect(() => {
        if (richRenderTimeoutId == -1) {
          setRichRenderTimeoutId(
            (currTimeoutId) =>
              currTimeoutId != -1
                ? currTimeoutId
                : window.setTimeout(() => {
                    setRichRenderTimeoutId(-1);
                  }, 100) //(arbitrary 100ms max render rate)
          );
        }
      }, [value, defaultValue]);

    const handleResize = () => {
      setHelperVisible(false);
    };

    const arrayTriggerMatch = (triggers: string[], re: RegExp) => {
      const triggersMatch = triggers.map((trigger) => ({
        triggerStr: trigger,
        triggerMatch: trigger.match(re),
        triggerLength: trigger.length,
      }));

      return triggersMatch;
    };

    const isTrigger = (passedTrigger: string, str: string, i: number) => {
      if (!passedTrigger || !passedTrigger.length) {
        return true;
      }

      if (triggerMatchWholeWord && i > 0 && str.charAt(i - 1).match(/[\w]/)) {
        return false;
      }

      if (
        str.substr(i, passedTrigger.length) === passedTrigger ||
        (triggerCaseInsensitive &&
          str.substr(i, passedTrigger.length).toLowerCase() ===
            passedTrigger.toLowerCase())
      ) {
        return true;
      }

      return false;
    };

    const getMatch = (
      str: string,
      caret: number,
      providedOptions: Props<any>["options"]
    ) => {
      const re = new RegExp(regex);

      const triggers = (
        !Array.isArray(trigger) ? new Array(trigger) : trigger
      ).sort();

      const providedOptionsObject = triggers.reduce((acc, eachTrigger) => {
        if (Array.isArray(providedOptions)) {
          acc[eachTrigger] = providedOptions;
        }
        return acc;
      }, {} as Record<string, string[]>);

      const triggersMatch = arrayTriggerMatch(triggers, re);

      let slugData: {
        trigger: string;
        matchStart: number;
        matchLength: number;
        options: string[];
      } | null = null;

      for (
        let triggersIndex = 0;
        triggersIndex < triggersMatch.length;
        triggersIndex++
      ) {
        const { triggerStr, triggerMatch, triggerLength } =
          triggersMatch[triggersIndex];

        // Super hack to fix the auto-complete which has broken for no reason i can tell
        const endOfStream = (pos: number) => {
          if (trigger.length === 0) {
            //(I assume whatever has broken this is related to setting empty triggers so will gate on that)
            if (pos >= 0 && spaceRemovers.indexOf(str[pos]) !== -1) return true;
            if (
              pos >= 1 &&
              spaceRemovers.indexOf(str[pos - 1]) !== -1 &&
              str[pos] == " "
            )
              return true;
          }
          return false;
        };
        for (let i = caret - 1; i >= 0; --i) {
          if (i < caret - 1 && endOfStream(i + 1)) {
            break;
          }
          const substr = str.substring(i, caret);
          const match = substr.match(re);
          let matchStart = -1;

          if (triggerLength > 0) {
            const triggerIdx = triggerMatch ? i : i - triggerLength + 1;

            if (triggerIdx < 0) {
              // out of input
              break;
            }

            if (isTrigger(triggerStr, str, triggerIdx)) {
              matchStart = triggerIdx + triggerLength;
            }

            if (!match && matchStart < 0) {
              break;
            }
          } else {
            if (match && i > 0) {
              // find first non-matching character or begin of input
              continue;
            }
            matchStart = i === 0 && match ? 0 : i + 1;

            if (caret - matchStart === 0) {
              // matched slug is empty
              break;
            }
          }
          if (matchStart >= 0) {
            const triggerOptions = providedOptionsObject[triggerStr];
            if (!triggerOptions) {
              continue;
            }

            const matchedSlug = str.substring(matchStart, caret);

            const options = triggerOptions.filter((slug) => {
              const idx = slug.toLowerCase().indexOf(matchedSlug.toLowerCase());
              return idx !== -1 && (matchAny || idx === 0);
            });

            const currTrigger = triggerStr;
            const matchLength = matchedSlug.length;

            if (!slugData) {
              slugData = {
                trigger: currTrigger,
                matchStart,
                matchLength,
                options,
              };
            } else {
              slugData = {
                ...(slugData as Record<string, any>),
                trigger: currTrigger,
                matchStart,
                matchLength,
                options,
              };
            }
          }
        }
      }

      return slugData;
    };

    const updateHelper = (
      str: string,
      caret: number,
      passedOptions: NonNullable<Props<any>["options"]>,
      makeRequest = true
    ) => {
      const input = refInput.current;
      const slug = getMatch(str, caret, passedOptions);

      if (input && slug) {
        const caretPos = getCaretCoordinates(input, caret);
        const { top, left, width } = input.getBoundingClientRect();

        const isCloseToEnd = width - caretPos.left < 150;
        const topOffset = top + window.scrollY;
        const leftOffset = left + window.scrollX;

        const newTop = caretPos.top + topOffset - input.scrollTop + 24;
        const newLeft = Math.min(
          /* Fully inside the viewport */
          caretPos.left + leftOffset - input.scrollLeft - slug.matchLength,
          /* Ensure minimal width inside viewport */
          window.innerWidth - OPTION_LIST_MIN_WIDTH
        );

        if (
          slug.matchLength >= minChars &&
          (slug.options.length > 1 ||
            (slug.options.length === 1 &&
              (slug.options[0].length !== slug.matchLength ||
                slug.options[0].length === 1)))
        ) {
          setTop(newTop);
          setLeft(isCloseToEnd ? newLeft - 175 : newLeft);
          setStateTrigger(slug.trigger);
          setStateOptions(slug.options);
          setMatchLength(slug.matchLength);
          setMatchStart(slug.matchStart);
          setHelperVisible(true);
        } else {
          if (
            onRequestOptions &&
            (requestOnlyIfNoOptions != false || !slug.options.length)
          ) {
            onRequestOptions(str.substr(slug.matchStart, slug.matchLength));
          }
          resetHelper();
        }
      } else {
        resetHelper();
      }
    };

    useEffect(() => {
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, []);

    useEffect(() => {
      if (typeof caret === "number" && !!options) {
        updateHelper(recentValue.current!, caret, options, false);
      }
    }, [JSON.stringify(options)]);

    useEffect(() => {
      if (helperVisible && refCurrent.current) {
        scrollIntoView(refCurrent.current, {
          boundary: refParent.current,
          scrollMode: "if-needed",
        });
      }
    }, [helperVisible]);

    const resetHelper = () => {
      setHelperVisible(false);
      setSelection(0);
    };

    const updateCaretPosition = (caret: number) => {
      setCaret(caret);
      setCaretPosition(refInput.current, caret);
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const old = recentValue.current;
      const str = e.target.value;
      const caret = getInputSelection(e.target).end;

      if (!str.length) {
        setHelperVisible(false);
      }

      recentValue.current = str;

      setCaret(caret);
      setStateValue(str);

      if (!str.length || !caret) {
        return onChange?.(e.target.value);
      }

      // '@wonderjenny ,|' -> '@wonderjenny, |'
      if (
        enableSpaceRemovers.current &&
        spaceRemovers.length &&
        str.length > 2 &&
        spacer.length
      ) {
        for (let i = 0; i < Math.max(old!.length, str.length); ++i) {
          if (old![i] !== str[i]) {
            if (
              i >= 2 &&
              str[i - 1] === spacer &&
              spaceRemovers.indexOf(str[i - 2]) === -1 &&
              spaceRemovers.indexOf(str[i]) !== -1 &&
              getMatch(str.substring(0, i - 2), caret - 3, options!)
            ) {
              const newValue = `${str.slice(0, i - 1)}${str.slice(
                i,
                i + 1
              )}${str.slice(i - 1, i)}${str.slice(i + 1)}`;

              updateCaretPosition(i + 1);
              if (refInput.current) {
                refInput.current.value = newValue;
              }

              if (!value) {
                setStateValue(newValue);
              }

              return onChange?.(newValue);
            }

            break;
          }
        }

        enableSpaceRemovers.current = false;
      }

      updateHelper(str, caret, options!);

      if (!value) {
        setStateValue(e.target.value);
      }

      return onChange?.(e.target.value);
    };

    const handleBlur = (e: KeyboardEvent) => {
      setIsEditing(false);
      resetHelper();
      if (refInput.current) {
        refInput.current.style.height = rest.style?.height || "2.4rem"; //(reset back to single line)
      }

      onBlur?.(e);
    };

    const handleSelection = (idx: number) => {
      const slug = stateOptions[idx];
      const value = recentValue.current!;

      var varActualMatchStart = matchStart;
      var varActualMatchLength = matchLength;

      // Special case for when we couldn't match on the entire slug because it traversed a delimiter
      const slugMatchIdx = slug
        .toLowerCase()
        .indexOf(
          value.substring(matchStart, matchStart + matchLength).toLowerCase()
        );
      if (
        slugMatchIdx > 0 &&
        slug.substring(0, slugMatchIdx) ==
          value.substring(Math.max(0, matchStart - slugMatchIdx), matchStart)
      ) {
        varActualMatchStart = Math.max(0, matchStart - slugMatchIdx);
        varActualMatchLength = matchLength + (matchStart - varActualMatchStart);
      }
      // In the other direction, we remove everything matching the regex before injecting the slug
      const re = new RegExp(regex.replace("$", "")); //(still anchor at the start because we are using substring(startIndex))
      const fwdMatch = value
        .substring(varActualMatchStart + varActualMatchLength)
        .match(re);
      if (fwdMatch) {
        varActualMatchLength += fwdMatch[0].length;
      }

      const part1 =
        //(new trigger.length > 0 because I use zero triggers, and that now requires slightly different logic
        // so gating it on that)
        stateTrigger?.length === 0 && trigger.length > 0
          ? ""
          : value.substring(0, varActualMatchStart - trigger.length);
      const part2 = value.substring(varActualMatchStart + varActualMatchLength);

      const event = { target: refInput.current! };
      const changedStr = changeOnSelect(stateTrigger!, slug);

      const spacerToUse =
        part2.startsWith(spacer) ||
        _.find(spaceRemovers, (s) => part2.startsWith(s))
          ? ""
          : spacer;

      event.target.value = `${part1}${changedStr}${spacerToUse}${part2}`;

      handleChange(event as any);
      onSelect?.(event.target.value);

      resetHelper();

      const advanceCaretDistance =
        part1.length + changedStr.length + (spacer ? spacer.length : 1);

      updateCaretPosition(advanceCaretDistance);

      enableSpaceRemovers.current = true;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const optionsCount =
        maxOptions > 0
          ? Math.min(stateOptions!.length, maxOptions)
          : stateOptions!.length;

      if (helperVisible) {
        switch (event.keyCode) {
          case KEY_ESCAPE:
            event.preventDefault();
            resetHelper();
            break;
          case KEY_UP:
            event.preventDefault();
            if (optionsCount > 0) {
              setSelection(
                Math.max(0, optionsCount + selection - 1) % optionsCount
              );
            }
            break;
          case KEY_DOWN:
            event.preventDefault();
            if (optionsCount > 0) {
              setSelection((selection + 1) % optionsCount);
            }
            break;
          case KEY_ENTER:
          case KEY_RETURN:
            if (!passThroughEnter) {
              event.preventDefault();
            }
            // (sometimes the helper is visible but empty, in such cases treat enter as a normal key)
            if (stateOptions[selection]) {
              handleSelection(selection);
            } else {
              onKeyDown?.(event);
            }
            break;
          case KEY_TAB:
            if (!passThroughTab) {
              event.preventDefault();
            }
            handleSelection(selection);
            break;
          default:
            onKeyDown?.(event);
            break;
        }
      } else {
        onKeyDown?.(event);
      }
    };

    const renderAutocompleteList = () => {
      if (!helperVisible) {
        return null;
      }

      if (stateOptions.length === 0) {
        return null;
      }

      if (selection >= stateOptions.length) {
        setSelection(0);

        return null;
      }

      const optionNumber = maxOptions === 0 ? stateOptions.length : maxOptions;

      const helperOptions = stateOptions
        .slice(0, optionNumber)
        .map((val, idx) => {
          const highlightStart = val
            .toLowerCase()
            .indexOf(stateValue!.substr(matchStart, matchLength).toLowerCase());

          return (
            <li
              className={
                idx === selection
                  ? `${styles["active"]} ${styles["react-autocomplete-input-li"]}`
                  : styles["react-autocomplete-input-li"]
              }
              ref={idx === selection ? refCurrent : undefined}
              key={val}
              onClick={() => {
                handleSelection(idx);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
              }}
              onMouseEnter={() => {
                setSelection(idx);
              }}
            >
              <span>
                {val.slice(0, highlightStart)}
                <strong>{val.substr(highlightStart, matchLength)}</strong>
                {val.slice(highlightStart + matchLength)}
              </span>
            </li>
          );
        });

      /* FIXME: de-hardcode that 5 pixels margin */
      const maxWidth = window.innerWidth - left - offsetX - 5;
      const maxHeight = window.innerHeight - top - offsetY - 5;

      return (
        <ul
          className={styles["react-autocomplete-input"]}
          style={{
            left: left + offsetX,
            top: top + offsetY,
            maxHeight,
            maxWidth,
          }}
          ref={refParent}
        >
          {helperOptions}
        </ul>
      );
    };

    const val =
      typeof value !== "undefined" && value !== null //(afaict value is always null)
        ? value
        : stateValue != null //(note i fixed a bug(?) here where it was treating "" and null the same)
        ? stateValue
        : defaultValue;

    //TODO: maybe only render nicely 100ms after the last change in value?
    // In on/off mode, as we type in the "on" window, the "off" is getting re-rendered on every keypress

    /** Replace the raw text with optional rendered text */
    const renderRichText = (rawText: string) => {
      // Step 1: build an efficient lookup table:
      const lookupTable = _.transform(
        richTextReplacements || {},
        (acc, value, key) => {
          const keyLen = key.length;
          if (!acc[keyLen]) {
            acc[keyLen] = {};
          }
          acc[keyLen][key] = value;
        },
        {} as Record<string, Record<string, ReactNode>>
      );

      // Step 2: define the replacement logic at each candidate point
      const lookForReplacementAt = (text: string, idx: number) => {
        return _.chain(lookupTable)
          .map(
            (candidateMatches: Record<string, ReactNode>, keyLen: string) => {
              const key = text.substring(idx, idx + Number(keyLen));
              if (candidateMatches[key]) {
                return key;
              } else {
                return undefined;
              }
            }
          )
          .filter((key) => key != undefined)
          .sortBy((key) => key?.length || 0)
          .last() //(pick longest match)
          .value();
      };

      // Step 3: loop through the text and replace as needed
      var accRenderedText: ReactNode[] = [];
      var lastPushedIdx = 0;
      for (let idx = 0; idx < rawText.length - 1; idx++) {
        const charIsDelimiter = !rawText.charAt(idx).match(regex);
        if (idx == 0 || charIsDelimiter) {
          const candidate = lookForReplacementAt(
            rawText,
            charIsDelimiter ? idx + 1 : idx
          );
          if (candidate) {
            if (lastPushedIdx <= idx && charIsDelimiter) {
              accRenderedText.push(rawText.substring(lastPushedIdx, idx + 1)); //(ie up to + including idx)
            }
            accRenderedText.push(richTextReplacements?.[candidate]?.renderTo);
            if (
              !charIsDelimiter &&
              rawText[idx + 1] != spacer &&
              !_.find(spaceRemovers, (s) => s == rawText[idx + 1])
            ) {
              //(add a delimiter if needed)
              accRenderedText.push(" ");
            }
            idx += candidate.length - (!charIsDelimiter ? 1 : 0); //(replacing from 0 not +1 in the idx==0/!delimiter case)
            lastPushedIdx = idx + 1;
          }
        }
      }
      accRenderedText.push(rawText.substring(lastPushedIdx));
      return accRenderedText;
    };

    return (
      <>
        {!richTextReplacements || isEditing || richRenderTimeoutId != -1 ? (
          <Component
            disabled={disabled}
            onBlur={handleBlur}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={(e: any) => {
              if (refInput.current) {
                refInput.current.selectionStart = (val || "").length;

                refInput.current.style.height = "auto"; // reset
                refInput.current.style.height = `${refInput.current.scrollHeight}px`;
                if (refRenderedInput.current?.scrollHeight)
                  refInput.current.height =
                    refRenderedInput.current?.scrollHeight;
              }
            }}
            ref={refInput}
            value={val}
            {...rest}
            style={{
              height: "auto",
              ...((rest.style as Record<string, string>) || {}),
            }}
          />
        ) : (
          <div
            ref={refRenderedInput}
            onClick={(e) => {
              if (!(disabled || rest.readOnly)) setIsEditing(true);
              setTimeout(() => {
                refInput.current?.focus();
                refInput.current?.focus();
                if (refInput.current) {
                  refInput.current.selectionStart = (val || "").length;
                }
              }, 0);
            }}
            {...rest}
            style={{
              height: "auto",
              ...((rest.style as Record<string, string>) || {}),
              resize: "vertical",
              backgroundColor:
                disabled || rest.readOnly ? "rgb(233, 236, 239)" : "white",
              overflow: "hidden",
              padding: ".375rem .75rem",
              border: "1px solid #ccc",
              borderRadius: ".25rem",
              cursor: "text",
            }}
          >
            {val ? (
              richRenderTimeoutId == -1 ? (
                renderRichText(val)
              ) : (
                val //(in practice not called because we render as a textarea instead, which helps with the width/height calcs)
              )
            ) : (
              <div style={{ color: "darkgray" }}>{rest.placeholder || ""}</div>
            )}
          </div>
        )}
        {renderAutocompleteList()}
      </>
    );
  }
);

TextAreaAutocomplete.displayName = "TextAreaAutocomplete";

export default TextAreaAutocomplete as <
  C extends string | ForwardRefExoticComponent<any>
>(
  props: Props<C> & { ref?: RefObject<HTMLInputElement | HTMLTextAreaElement> }
) => ReactElement;
