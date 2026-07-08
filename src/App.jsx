"use client";

import { ControlPanel } from "@/components/ControlPanel";
import { GarageScene } from "@/scene/GarageScene";

export default function App() {
  return (
    <main className="app-shell">
      <ControlPanel />
      <GarageScene />
    </main>
  );
}
