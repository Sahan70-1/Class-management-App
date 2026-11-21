import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import { readTheme, saveTheme, THEME_STORAGE_KEY } from "../src/theme";

test("the cached app shell restores a saved dark choice before rendering", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const script = /<script>([\s\S]*?)<\/script>/.exec(html);
  assert.ok(script && html.indexOf(script[0]) < html.indexOf('<div id="root">'));
  for (const stored of ["dark", "light", "invalid", null]) {
    const dataset: { theme?: string } = {};
    const bar = { content: "#f3f1ec", dataset: { dark: "#131b18" } };
    runInNewContext(script[1], {
      localStorage: { getItem: (key: string) => key === THEME_STORAGE_KEY ? stored : null },
      document: { documentElement: { dataset }, querySelector: () => bar },
    });
    assert.equal(dataset.theme ?? "light", stored === "dark" ? "dark" : "light");
    assert.equal(bar.content, stored === "dark" ? "#131b18" : "#f3f1ec");
  }
});

test("theme changes persist per device and still work when storage is blocked", () => {
  const memory = new Map<string, string>();
  const bar = { content: "", dataset: { light: "#f3f1ec", dark: "#131b18" } };
  const root: { dataset: { theme?: string } } = { dataset: {} };
  let blocked = false;
  const window = {
    get localStorage() {
      if (blocked) throw new Error("Storage unavailable");
      return {
        getItem: (key: string) => memory.get(key),
        setItem: (key: string, value: string) => memory.set(key, value),
      };
    },
  };
  const document = { documentElement: root, querySelector: () => bar };
  const previous = Object.getOwnPropertyDescriptors(globalThis);
  try {
    assert.equal(readTheme(), "light");
    Object.defineProperty(globalThis, "window", { value: window, configurable: true });
    Object.defineProperty(globalThis, "document", { value: document, configurable: true });
    for (const theme of ["dark", "light"] as const) {
      saveTheme(theme);
      assert.equal(readTheme(), theme);
      assert.equal(root.dataset.theme, theme);
      assert.equal(bar.content, bar.dataset[theme]);
      assert.equal(memory.get(THEME_STORAGE_KEY), theme);
    }
    blocked = true;
    saveTheme("dark");
    assert.equal(readTheme(), "dark");
    assert.equal(root.dataset.theme, "dark");
    assert.equal(memory.get(THEME_STORAGE_KEY), "light");
  } finally {
    for (const key of ["window", "document"] as const) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key]);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
