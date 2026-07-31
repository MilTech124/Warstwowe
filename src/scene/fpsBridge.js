// Pomiar FPS żyje wewnątrz <Canvas> (useFrame), a wyświetlany jest w DOM-owym
// panelu jakości. Gdyby wynik szedł przez stan Reacta, scena re-renderowałaby się
// przy każdej aktualizacji — dlatego pomiar publikujemy przez subskrypcję,
// z której korzysta wyłącznie panel.

const listeners = new Set();

export const fpsBridge = {
  value: 0,

  publish(fps) {
    this.value = fps;
    listeners.forEach((listener) => listener(fps));
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
