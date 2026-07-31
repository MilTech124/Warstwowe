import assert from "node:assert/strict";
import test from "node:test";

import { resolveFinishMaps } from "@/config/materialFinishes";
import { selectEffectiveQuality } from "@/store/configuratorStore";

const ui = (overrides) => ({
  ui: {
    qualityPreference: "auto",
    autoQuality: "high",
    qualityOverride: null,
    ...overrides,
  },
});

test("tryb auto oddaje sterowanie detekcji sprzętu i PerformanceMonitorowi", () => {
  assert.equal(selectEffectiveQuality(ui({ autoQuality: "balanced" })), "balanced");
  assert.equal(selectEffectiveQuality(ui({ autoQuality: "low" })), "low");
});

test("ręczny wybór użytkownika nie może zostać nadpisany przez automat", () => {
  const state = ui({ qualityPreference: "high", autoQuality: "low" });
  assert.equal(selectEffectiveQuality(state), "high");
});

test("nadpisanie na czas zrzutów do PDF wygrywa z każdym ustawieniem", () => {
  const state = ui({ qualityPreference: "low", autoQuality: "low", qualityOverride: "high" });
  assert.equal(selectEffectiveQuality(state), "high");
});

test("poziom low korzysta z tekstur 1k, tak jak balanced", () => {
  const low = resolveFinishMaps("anthracite", "low");
  const balanced = resolveFinishMaps("anthracite", "balanced");
  const high = resolveFinishMaps("anthracite", "high");

  assert.deepEqual(low, balanced);
  assert.notDeepEqual(low, high);
});
