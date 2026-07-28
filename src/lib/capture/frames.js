// Oczekiwanie na klatkę animacji z twardym limitem czasu.
//
// requestAnimationFrame NIE odpala się w ukrytej karcie ani w niewidocznym
// kontenerze. Pętla opierająca się wyłącznie na rAF zawisłaby tam bez końca,
// dlatego każde czekanie na klatkę ściga się z setTimeout.

export function nextFrame(fallbackMs = 60) {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    requestAnimationFrame(done);
    setTimeout(done, fallbackMs);
  });
}

// Dwie klatki: pierwsza pozwala Reactowi złożyć zmianę, druga ją odmalować.
export async function twoFrames() {
  await nextFrame();
  await nextFrame();
}
