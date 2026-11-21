import assert from "node:assert/strict";

export async function assertDialogFrame(panel, fitted) {
  const frame = await panel.evaluate((dialog) => {
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    return {
      left,
      right,
      top,
      bottom,
      width: document.documentElement.clientWidth,
      height: innerHeight,
    };
  });
  const { left, right, top, bottom, width, height } = frame;
  if (fitted) {
    assert.ok(
      Math.max(
        Math.abs(left),
        Math.abs(top),
        Math.abs(width - right),
        Math.abs(height - bottom),
      ) <= 1,
      "Mobile dialog should fill the viewport: " + JSON.stringify(frame),
    );
  } else {
    assert.ok(
      left > 0 &&
        top > 0 &&
        Math.abs(left - (width - right)) <= 2 &&
        Math.abs(top - (height - bottom)) <= 2,
      "Desktop dialog should be bounded and centered: " + JSON.stringify(frame),
    );
  }
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
