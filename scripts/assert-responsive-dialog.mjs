import assert from "node:assert/strict";

// Check each control in the dialog, including those below the vertical fold.
export async function assertResponsiveDialog(panel) {
  const errors = await panel.evaluate((dialog) => {
    const problems = [];
    if (dialog.scrollWidth > dialog.clientWidth + 1)
      problems.push("dialog overflows horizontally");
    const controls = [
      ...dialog.querySelectorAll(
        "input, select, textarea, button, summary, a[href]",
      ),
    ].filter((el) => el.checkVisibility() && el.getClientRects().length);
    const bounds = dialog.getBoundingClientRect();
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
      for (const sibling of controls.slice(index + 1)) {
        if (control.contains(sibling) || sibling.contains(control)) continue;
        const other = sibling.getBoundingClientRect();
        if (
          Math.min(rect.right, other.right) - Math.max(rect.left, other.left) >
            1 &&
          Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top) >
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
