import assert from "node:assert/strict";
import { test } from "node:test";
import { confirmCheckinSave } from "../src/feedback";

test("check-in haptics respect capability, reduced motion and rapid repeats", (t) => {
  const globals = ["window", "navigator", "document"] as const;
  const original = globals.map((key) =>
    Object.getOwnPropertyDescriptor(globalThis, key),
  );
  t.after(() => {
    globals.forEach((key, i) => {
      if (original[i]) Object.defineProperty(globalThis, key, original[i]!);
      else Reflect.deleteProperty(globalThis, key);
    });
  });

  const pulses: number[] = [];
  const mediaQuery = { matches: false };
  const page = { hidden: false };
  let now = 1000;
  t.mock.method(performance, "now", () => now);
  const device: { vibrate?: (ms: number) => boolean } = {};
  for (const [key, value] of Object.entries({
    window: { matchMedia: () => mediaQuery },
    navigator: device,
    document: page,
  }))
    Object.defineProperty(globalThis, key, { configurable: true, value });

  assert.doesNotThrow(() => confirmCheckinSave("attendance"));
  device.vibrate = (ms) => {
    pulses.push(ms);
    return true;
  };
  confirmCheckinSave("schedules");
  mediaQuery.matches = true;
  confirmCheckinSave("fees");
  mediaQuery.matches = false;
  page.hidden = true;
  confirmCheckinSave("issues");
  assert.deepEqual(pulses, []);

  page.hidden = false;
  confirmCheckinSave("attendance");
  confirmCheckinSave("attendance");
  assert.deepEqual(pulses, [12]);
  now += 300;
  confirmCheckinSave("fees");
  now += 300;
  confirmCheckinSave("issues");
  assert.deepEqual(pulses, [12, 12, 12]);

  now += 300;
  device.vibrate = () => {
    throw Error("Capability disabled");
  };
  assert.doesNotThrow(() => confirmCheckinSave("attendance"));
});
