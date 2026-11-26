// The ecosystem simulation. Headless: it must never import three.js or touch the DOM
// (enforced by test/boundaries.test.js), so it can be tested and fast-forwarded in Node.
//
// Empty for now. Roadmap step 1 adds the clock, seasons and gap-model tree growth here;
// the renderer will then read sim state instead of the hand-placed layout in data/plot01.json.

export function createSim() {
  const state = { day: 0 };
  return {
    state,
    step(days = 1) { state.day += days; },
  };
}
