"use client";

import { ControlPanel } from "@/components/ControlPanel";
import { ConfiguratorProvider } from "@/configurator/ConfiguratorContext";
import { GarageScene } from "@/scene/GarageScene";
import {
  ConfiguratorStoreProvider,
  createConfigurationFromSnapshot,
  createInitialConfiguratorConfig,
} from "@/store/configuratorStore";

export default function App({ bootstrap, previewOnly = false }) {
  const branding = bootstrap?.company?.branding;
  const initialConfig = bootstrap?.initialConfiguration
    ? createConfigurationFromSnapshot(
        bootstrap.initialConfiguration,
        bootstrap?.settings?.defaultPresetId,
        bootstrap?.settings,
        bootstrap?.capabilities,
      )
    : createInitialConfiguratorConfig(
        bootstrap?.settings?.defaultPresetId,
        bootstrap?.settings,
        bootstrap?.capabilities,
      );
  return (
    <ConfiguratorProvider bootstrap={bootstrap}>
      <ConfiguratorStoreProvider
        initialConfig={initialConfig}
        availability={{ settings: bootstrap?.settings, capabilities: bootstrap?.capabilities }}
      >
        <main
          className={`app-shell ${previewOnly ? "preview-only" : ""}`}
          style={{
            "--company-primary": branding?.primaryColor || "#0f766e",
            "--company-accent": branding?.accentColor || "#f59e0b",
          }}
        >
          {!previewOnly && <ControlPanel />}
          <GarageScene />
        </main>
      </ConfiguratorStoreProvider>
    </ConfiguratorProvider>
  );
}
