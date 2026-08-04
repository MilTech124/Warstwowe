"use client";

import { ControlPanel } from "@/components/ControlPanel";
import { ConfiguratorProvider } from "@/configurator/ConfiguratorContext";
import { GarageScene } from "@/scene/GarageScene";
import {
  ConfiguratorStoreProvider,
  createConfigurationFromSnapshot,
  createInitialConfiguratorConfig,
} from "@/store/configuratorStore";

/**
 * @param {{
 *   bootstrap: any,
 *   previewOnly?: boolean,
 *   initialOrder?: Record<string, unknown> | null,
 *   children?: import("react").ReactNode,
 * }} props
 */
export default function App({ bootstrap, previewOnly = false, initialOrder = null, children = null }) {
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
  const hydratedConfig = initialOrder
    ? { ...initialConfig, order: { ...initialConfig.order, ...initialOrder } }
    : initialConfig;

  return (
    <ConfiguratorProvider bootstrap={bootstrap}>
      <ConfiguratorStoreProvider
        initialConfig={hydratedConfig}
        availability={{ settings: bootstrap?.settings, capabilities: bootstrap?.capabilities }}
      >
        {children}
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
