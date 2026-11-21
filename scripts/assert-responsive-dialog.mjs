import assert from "node:assert/strict";

export async function assertDialogFrame(panel, phone, previous) {
  const frame = await panel.evaluate((dialog) => {
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    const style = getComputedStyle(dialog);
    return {
      left,
      right,
      top,
      bottom,
      width: document.documentElement.clientWidth,
      height: innerHeight,
      rounded: [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomLeftRadius,
        style.borderBottomRightRadius,
      ].every((radius) => parseFloat(radius) > 0),
    };
  });
  const { left, right, top, bottom, width, height } = frame;
  if (phone) {
    assert.ok(
      frame.rounded && Math.min(left, top, width - right, height - bottom) >= 4,
      "Floating card must have rounded corners and a visible gap on all sides: " +
        JSON.stringify(frame),
    );
    if (previous) {
      assert.ok(
        ["left", "right", "top"].every(
          (edge) => Math.abs(frame[edge] - previous[edge]) <= 1,
        ),
        "The card's position or width moved when its contents changed: " +
          JSON.stringify({ previous, frame }),
      );
    }
  } else {
    assert.ok(
      left > 0 &&
        top > 0 &&
        Math.abs(left - (width - right)) <= 2 &&
        Math.abs(top - (height - bottom)) <= 2,
      "Desktop dialog should be bounded and centered: " + JSON.stringify(frame),
    );
  }
  return frame;
}

export async function assertCardScrolling(panel) {
  const errors = await panel.evaluate((card) => {
    const body = card.querySelector(".modal-body");
    const problems = [];
    const style = getComputedStyle(body);
    const close = card.querySelector('button[aria-label="Close dialog"]');
    const headerTop = close.getBoundingClientRect().top;
    for (const element of [document.scrollingElement, card, body]) {
      if (element.scrollWidth > element.clientWidth + 1) {
        problems.push("horizontal overflow in " + element.tagName);
      }
      const initial = element.scrollLeft;
      for (const left of [-80, 80]) {
        element.scrollTo({ left, behavior: "instant" });
        if (Math.abs(element.scrollLeft) > 1)
          problems.push("sideways scrolling in " + element.tagName);
      }
      element.scrollTo({ left: initial, behavior: "instant" });
    }
    for (let element = body; element; element = element.parentElement) {
      const { touchAction } = getComputedStyle(element);
      if (
        touchAction !== "auto" &&
        touchAction !== "manipulation" &&
        !touchAction.includes("pinch-zoom")
      ) {
        problems.push("pinch zoom blocked by " + element.tagName);
      }
    }
    const previousTop = body.scrollTop;
    const maxTop = body.scrollHeight - body.clientHeight;
    if (maxTop > 1 && !["auto", "scroll"].includes(style.overflowY))
      problems.push("Long content does not have a user-scrollable body");
    if (maxTop <= 1 && style.overflowY === "scroll")
      problems.push("Short content reserves a vertical scrollbar");
    const form = body.querySelector(":scope > .form:only-child");
    if (maxTop <= 1 && form) {
      const emptySpace =
        body.getBoundingClientRect().bottom -
        parseFloat(style.paddingBottom) -
        form.getBoundingClientRect().bottom -
        parseFloat(getComputedStyle(form).marginBottom);
      if (emptySpace > 2)
        problems.push("Card is taller than its short form needs");
    }
    body.scrollTo({ top: body.scrollHeight, behavior: "instant" });
    if (Math.abs(body.scrollTop - maxTop) > 1)
      problems.push("Could not reach the end of the content");
    if (Math.abs(close.getBoundingClientRect().top - headerTop) > 1)
      problems.push("Close moved when the content scrolled");
    body.scrollTo({ top: previousTop, behavior: "instant" });
    return problems;
  });
  assert.deepEqual(errors, []);
}

export async function assertResponsiveDialog(panel) {
  const errors = await panel.evaluate((dialog) => {
    const problems = [];
    if (dialog.scrollWidth > dialog.clientWidth + 1)
      problems.push("dialog overflows horizontally");
    const body = dialog.querySelector(".modal-body");
    if (body?.clientWidth && body.scrollWidth > body.clientWidth + 1)
      problems.push("dialog body overflows horizontally");
    const controls = [
      ...dialog.querySelectorAll(
        "input, select, textarea, button, summary, a[href]",
      ),
    ].filter((el) => el.checkVisibility() && el.getClientRects().length);
    const bounds = dialog.getBoundingClientRect();
    // A scrollable list may clip its rows above or below the viewport.
    // Only the visible portion can collide with controls outside that list.
    function visibleBounds(control) {
      let { left, right, top, bottom } = control.getBoundingClientRect();
      for (
        let parent = control.parentElement;
        parent && parent !== dialog;
        parent = parent.parentElement
      ) {
        const style = getComputedStyle(parent);
        const clip = parent.getBoundingClientRect();
        if (style.overflowX !== "visible") {
          left = Math.max(left, clip.left);
          right = Math.min(right, clip.right);
        }
        if (style.overflowY !== "visible") {
          top = Math.max(top, clip.top);
          bottom = Math.min(bottom, clip.bottom);
        }
      }
      return { left, right, top, bottom };
    }
    const visible = controls.map(visibleBounds);
    const label = (el) =>
      (
        el.getAttribute("aria-label") ||
        el.labels?.[0]?.textContent ||
        el.textContent ||
        el.tagName
      )
        .trim()
        .slice(0, 50);
    for (const [index, control] of controls.entries()) {
      const rect = control.getBoundingClientRect();
      if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1) {
        problems.push(label(control) + " extends beyond the dialog");
      }
      for (let j = index + 1; j < controls.length; j++) {
        const sibling = controls[j];
        if (control.contains(sibling) || sibling.contains(control)) continue;
        const other = visible[j];
        const here = visible[index];
        if (
          Math.min(here.right, other.right) - Math.max(here.left, other.left) >
            1 &&
          Math.min(here.bottom, other.bottom) - Math.max(here.top, other.top) >
            1
        ) {
          problems.push(label(control) + " overlaps " + label(sibling));
        }
      }
    }
    return problems;
  });
  assert.deepEqual(errors, []);
}
