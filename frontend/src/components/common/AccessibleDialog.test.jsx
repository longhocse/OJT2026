import { fireEvent, render, screen } from "@testing-library/react";
import AccessibleDialog from "./AccessibleDialog";

test("dialog traps keyboard focus, closes on Escape and restores focus", () => {
  const onClose = jest.fn();
  const trigger = document.createElement("button");
  document.body.appendChild(trigger);
  trigger.focus();

  const { unmount } = render(
    <AccessibleDialog title="Filters" onClose={onClose}>
      <button type="button">First</button>
      <button type="button">Last</button>
    </AccessibleDialog>,
  );
  const first = screen.getByRole("button", { name: "First" });
  const last = screen.getByRole("button", { name: "Last" });
  expect(first).toHaveFocus();
  last.focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(first).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
  unmount();
  expect(trigger).toHaveFocus();
  trigger.remove();
});
