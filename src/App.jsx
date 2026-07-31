"use client";

import { ControlPanel } from "@/components/ControlPanel";
import { ConfiguratorProvider } from "@/configurator/ConfiguratorContext";
import { GarageScene } from "@/scene/GarageScene";
import {
  ConfiguratorStoreProvider,
  createInitialConfiguratorConfig,
} from "@/store/configuratorStore";

export default function App({ bootstrap }) {
  const branding = bootstrap?.company?.branding;
  const initialConfig = createInitialConfiguratorConfig(bootstrap?.settings?.defaultPresetId);
  return (
    <ConfiguratorProvider bootstrap={bootstrap}>
      <ConfiguratorStoreProvider initialConfig={initialConfig}>
        <main
          className="app-shell"
          style={{
            "--company-primary": branding?.primaryColor || "#0f766e",
            "--company-accent": branding?.accentColor || "#f59e0b",
          }}
        >
          <ControlPanel />
          <GarageScene />
        </main>
      </ConfiguratorStoreProvider>
    </ConfiguratorProvider>
  );
}
