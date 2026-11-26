# Calculator UI specification

## Scope

This document defines the calculator's presentation and interaction design. [SPEC.md](SPEC.md) defines operations, calculation state, numerical behavior, and the API. [ASSESSMENT.md](ASSESSMENT.md) defines the submission requirements.

| Priority | Scope |
| --- | --- |
| Required UI baseline | Keep the display and shared keypad in one calculator card. Preserve stable mode switching, readable values, accessible controls, on-demand help, and error recovery. Correct any regressions before submission. |
| Approved history | Include the session-only Recent calculations panel defined below. It is an enhancement to the minimum assessment. |
| Deferred | History across reloads, reuse of previous results, export, and backend storage. |

The functional spec describes Escape as Clear. Open menus and panels handle Escape as described below. Escape remains a calculator shortcut when focus is available to the calculator and navigation does not consume the key.

## Layout and responsive behavior

- Use a top-aligned page with a single calculator card. Keep display, mode controls, keypad, and Advanced controls associated within that card. Give neighboring sections room to grow in normal page flow.
- In Compact and Default, order the calculator header, display, and shared keypad vertically. The header contains a hamburger Modes button with the current mode label and History, with an adjacent Info button in Advanced. Keep the short keyboard hint below the controls.
- Center the card in a page shell capped at `29rem`, including gutters. Use about 12 px side gutters at 320 and 375 px. Keep the title above the card.
- Keep the main keypad in four columns. Use `CE C ⌫` across the first row in Standard and `CE C % ⌫` in Advanced. In Advanced, power and square root split the first three columns of row two equally, with division in the fourth. Finish Advanced with `7 8 9 ×`, `4 5 6 −`, `1 2 3 +`, and `± 0 . =`. Standard uses full rows for common keys, with operators in the right column and a full-width Equals button in the last row. Allow vertical page scrolling on short screens.
- In Compact and Default, dock Recent calculations beside the centered card at `76rem` or wider and use a modal bottom drawer below that breakpoint. Large uses a modal side drawer on wide screens and a bottom drawer on narrower screens. History is closed by default and opening it preserves calculator width and key positions.
- Choose Compact, Default, or Large in the hamburger menu. Default applies on load. Compact and Default keep the `25rem` and `29rem` caps. Large uses approximately 90% of the viewport width and at least 86% of the viewport height. Place a large readout to the left of the four-column keypad beneath a shared header at `60rem` and wider, or from `42rem` on short landscape screens. Stack the readout and keypad in the remaining viewports. Scale type, gaps, and key heights with the available space, keep key targets at least 44px tall, and allow vertical scrolling on short screens. In the side layout, center a shorter readout beside the keypad. Give short values the most space and scale longer values by length and available width and height. Keep the expression next to the value, and distinguish utility, Advanced, and Equals keys. Changing size preserves the current calculation, requests, and history entries.
- Mode switching preserves the active entry, pending operation, result, contextual percentage marker, and any in-flight request. The display stays anchored. Switching to Advanced adds the row for power and square root, moving the numeric rows down.

## Visual system

Use semantic CSS custom properties in [theme.css](../frontend/src/theme.css) and keep layout rules local to each CSS Module.

| Role | Baseline |
| --- | --- |
| Surfaces and text | Warm page `#E8E4DC`, card `#FAF7F1`, body text `#202B3C`, muted text `#536174`, edge `#DDD8CF`. |
| Display | Ink-blue `#14233B`, light result text `#FAFBFF`, muted information `#B9CCFF`, error accent `#FFC4B6`. Show errors in text. |
| Controls | Neutral digit keys, muted utility and Advanced keys, pale-blue standard operators `#E8EEFF`, and solid cobalt Equals `#2148C7` with white text. Give selected mode and marked contextual percentage a distinct treatment. Tint CE green and Backspace red. |
| Typography | System UI, tabular numeric figures, and monospace for exact values and key names. Use 12–14 px for secondary text and about 20 px for digit keys at default settings. Make the display the largest numeric element. |
| Spacing and shape | 4 px spacing base, 8 px keypad gaps, 8/12/20 px radii, a restrained card shadow and subtle key edges. Primary and touch controls are at least 44 px tall. Main key rows can grow to 52 px on taller tablet and desktop layouts. |
| Interaction states | Provide distinct hover on hover-capable devices, active, selected, focus-visible, and disabled states. Use color, borders or shadow without changing box dimensions. Use short transitions around 120 ms and remove them when reduced motion is requested. |

## Display and contextual help

- Display up to 12 significant digits using the existing formatting rules. Use container-relative text sizing, allow extra emphasis for shorter values, and keep the sign and exponent readable. Store and chain from the numeric value returned by the API.
- Use the upper line for the active expression. Show the committed left operand, current operator and entered right operand or rate. Keep a completed request or confirmed standalone number with a trailing equals sign while its result is displayed. A chain starts the next step from the previous result. A square root applied to a pending right operand leaves the binary expression active and updates that operand. Failed requests show the attempted expression without equals, and Clear removes the expression. Long expressions scroll inside the line with the newest content visible and the earlier text still reachable. The large readout continues to show the editable value or result.
- Keep the current readout visible while awaiting the API. For requests pending for 250 ms, show a small activity indicator in the expression header without changing its dimensions. Announce loading only when that indicator appears. Keep keypad colors and focus stable and replay queued keys after a successful request.
- Present accepted results immediately. Fade the value from 90% opacity and raise it by 2 px over 200 ms without changing the layout. Skip animation for other updates and respect reduced-motion preferences.
- Use Ctrl+C and Ctrl+V on Windows or Cmd+C and Cmd+V on macOS through native clipboard events. Copy the unrounded result or current numeric entry when calculator focus is active and the browser has no text selection. Paste a finite decimal or scientific-notation number to replace the current entry, preserving its pending operation and contextual rate marker. After a completed result, paste starts a fresh entry. Ignore invalid text, unavailable clipboard data, and paste during an active API request.
- Preserve all typed characters. When the entry exceeds the display width, scroll inside the display to keep the most recent characters visible and allow the user to scroll back. Formatted results should fit at the supported widths and may wrap under zoom or text enlargement. Keep page-wide horizontal scrolling out of the layout.
- Show `xʸ`, `√`, and `%` in Advanced only, with the accessible names **Power**, **Square root**, and **Contextual percentage**. `%` toggles the marker on the entered right operand of `+`, `−`, `×`, or `÷`. After a completed calculation, entering a rate and pressing % directly calculates the percentage of that result. Give each operation an accessible description and include the descriptions and examples in Advanced help.
- The Info button next to History opens and closes a separate help panel using the same desktop dock and mobile drawer as History. The panel starts collapsed, exposes its state through the button, and leaves the keypad in place. Open it by clicking, tapping, or pressing Enter or Space. Escape closes the panel and focuses the info button. Switching to Standard closes help.

## Mode menu

- The Modes button exposes expanded state and controls the popover. It opens by tap, click, Enter or Space and retains focus on open. Tab reaches Standard, Advanced, Compact, Default, and Large in that order. Size options appear in a labeled Calculator size group. Selecting a size closes the menu and restores focus to the trigger. Show the current mode with a checkmark and pressed state.
- Selecting a mode or pressing Escape closes the popover and focuses its trigger. An outside press or Tab leaving the menu closes it and preserves the destination focus. While the popover is open, calculator shortcuts stay suspended.

## Recent calculations

- The header History button exposes expanded state and opens a named panel with accessible **Clear history** and **Close** icon buttons in the panel header. Close is rightmost, and Clear history is available when there are entries. Opening moves focus to Close. The dock stays open while the calculator is used, and Tab can leave it. The modal drawer keeps focus inside and makes background controls inert. If switching to Large converts an open dock into a drawer, move focus to the drawer’s Close button.
- Escape from the drawer or from the focused desktop panel or its trigger closes history. Close and a drawer backdrop tap restore focus to History. Outside presses leave the desktop dock open. Calculator shortcuts remain suspended while the drawer is open or focus is in the dock. [W3C modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- Show a count and a readable empty state. List up to 10 entries newest first. Align each expression to the left and its result to the right, with wrapping for long values. Keep the list in memory until reload. Mode switching and calculator Clear preserve the list.
- Append a row only when the request hook accepts a successful, current API response. Capture the operation, submitted operand or operands, contextual percentage flag when applicable, and returned numeric result. Format the row for readability without rounding the stored values.
- A left-to-right chain records each successful evaluation. For `10 + 5 × 2`, show `15 × 2 = 30` above `10 + 5 = 15`. Show unary square roots with one operand and retain the `%` marker for contextual rates. Failed, canceled, or stale requests and repeated Equals without a request create zero rows.
- **Clear history** empties only the list. A current calculation may finish afterward and start the new list with its result. Clearing the calculator leaves earlier history intact and invalidates the canceled request as usual. Move focus to Close after clearing because Clear history becomes unavailable in the empty state.
- Keep rows readable and non-interactive for this increment. Manage entries and disclosure state separately from the active calculator reducer. Use the existing successful-response path and keep the API stateless.

## Component responsibilities

| Component | Responsibility |
| --- | --- |
| `App` | Page shell, heading, and responsive spacing. |
| `Calculator` | Compose the card, route navigation and shortcuts, and maintain history entries independently from the active reducer. |
| `CalculatorHeader` | Render the Modes trigger, mode choices and History trigger, and handle menu focus and outside presses. |
| `CalculatorDisplay` | Render the formatted entry or result, pending operation, loading and error feedback. Keep numeric formatting in presentation. |
| `CalculatorKeypad` | Render the shared grid, visual key categories, and callbacks for Standard controls. |
| `CalculatorAdvanced` | Render the top row of the shared keypad, including the help disclosure. |
| `CalculatorHistory` | Render the dock or drawer, entries, empty state, Close and Clear history. |
| `useCalculator` | Own active interactions and accepted API results. Keep the reducer pure and keep history presentation and storage independent. |

## Accessibility

- Use native buttons for keys and disclosures, descriptive accessible names for symbolic keys, and `aria-pressed` for mode and contextual percentage. Use `aria-expanded` on each disclosure trigger and associate it with the controlled region. Collapsed content stays out of the Tab order. [W3C disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
- Preserve the row-by-row key order and visible focus in both modes. History controls retain their own focus and native activation. The open mode menu and modal history handle Escape first. Escape in the focused desktop history panel closes it. Open Advanced help also consumes Escape before calculator Clear.
- Announce accepted results politely, announce delayed loading, and expose errors as alerts. Reading or entering digits should leave the result announcement quiet. Keep Clear and mode switching available during loading. If Equals initiates a request from the keyboard, keep it focused while it reports itself unavailable. Ignore repeat activation until the request settles and preserve the visible focus indicator.
- Target at least 4.5:1 contrast for normal text and 3:1 for focus indicators and meaningful control-state cues against adjacent colors. Combine color with text, shape, outline or state styling where needed. [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) · [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

## Acceptance checks

| Check | Pass condition |
| --- | --- |
| Responsive composition | Inspect screenshots at 320, 375, 768 and 1440 CSS px, plus 320×568 and 1440×650. Text and labels fit, alignment and spacing stay consistent, and the page has no horizontal scroll. Equals is reachable on a short mobile screen. |
| Size presets | At 320, 375, 768 and 1440 CSS px, verify that each size fits without horizontal overflow and keeps at least 44px key targets. Check Large at the `60rem` layout breakpoint and on a short landscape viewport. Open history in each preset and verify the card stays in place. |
| Mode stability | Confirm CE occupies the upper-left corner and Backspace the upper-right, with % immediately before Backspace in Advanced, power and square root share the first three columns of row two in Advanced, and Info sits next to History. Standard has fully occupied rows and a full-width Equals key. Verify that `150 × 20% = 30` uses the single `%` key. Switch both ways while entering an operand and after obtaining a result. The calculation continues in every preset. The display stays anchored when switching modes, and opening help keeps the keypad in place. |
| Long values | Enter a 50-digit operand and scroll back to confirm all digits remain available. Verify that a formatted scientific result such as `-4.18900257888e+305` stays readable with its sign and exponent. Chaining still uses the stored precision. |
| Keyboard, touch and announcements | Confirm Tab follows keypad rows with visible focus. Open, read and dismiss help with keyboard and touch. Verify Equals retains focus and sends a single request when activated repeatedly while pending. Check reduced motion, result and error announcements with a screen reader, and correction after a failed calculation. |
| History | Verify two rows for a mixed chain, a single row for square root, correct contextual markers, a 10-entry limit, and separate clear actions. Check that failed or stale requests add no row, reload resets the list, and opening the panel leaves calculator bounds intact on desktop and mobile. Verify focus restoration, backdrop dismissal and keyboard containment in the drawer. |

Run the frontend suite and production build, plus the existing real-API browser smoke tests. For UI changes, inspect the actual screenshots alongside browser assertions. Include focused tests for menu focus, recording and clearing history, and skipped stale responses.
