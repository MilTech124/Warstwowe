"use client";

import { createContext, useContext, useMemo } from "react";

const defaultCapabilities = {
  coreConfigurator: true,
  orders: true,
  flashings: true,
  gutters: true,
  catalogCuration: true,
  frontProjection: true,
  orderAnalytics: true,
  csvExport: true,
  emailNotifications: true,
  structureView: true,
  gateAnimations: true,
  lighting: true,
  orderPdf: true,
  // Tryb standalone nie ma cennika firmy, więc wycena jest domyślnie wyłączona.
  pricing: false,
};

const defaultValue = {
  company: {
    id: "standalone",
    slug: "standalone",
    branding: {
      name: "Konfigurator garaży warstwowych",
      primaryColor: "#0f766e",
      accentColor: "#f59e0b",
    },
  },
  packageCode: "DIAMOND",
  accessActive: true,
  capabilities: defaultCapabilities,
  // Stawki dostaje wyłącznie bootstrap firmy, i tylko gdy pokazuje ceny klientom.
  priceList: null,
  seatLimit: 10,
  settings: {
    version: 1,
    published: true,
    manuallyEnabled: true,
    defaultPresetId: "single_garage",
    allowedPresetIds: [],
    allowedRoofTypeIds: [],
    allowedOpeningKinds: [],
    allowedWallColorIds: [],
    allowedRoofColorIds: [],
    allowedPanelManufacturerIds: [],
    allowedGateManufacturerIds: [],
    allowedWallPanelModelIds: [],
    allowedRoofPanelModelIds: [],
    allowedGateTypeIds: [],
    allowedGateModelIds: [],
    allowedDoorModelIds: [],
    allowedWindowModelIds: [],
    disabledFeatures: [],
    orderNotificationEmails: [],
  },
  catalog: {
    version: 1,
    panelManufacturers: [],
    gateManufacturers: [],
    presets: [],
    materialFinishes: [],
  },
};

const ConfiguratorContext = createContext(defaultValue);

export function ConfiguratorProvider({ bootstrap, children }) {
  const value = useMemo(
    () => ({
      ...defaultValue,
      ...(bootstrap ?? {}),
      company: {
        ...defaultValue.company,
        ...(bootstrap?.company ?? {}),
        branding: {
          ...defaultValue.company.branding,
          ...(bootstrap?.company?.branding ?? {}),
        },
      },
      capabilities: {
        ...defaultCapabilities,
        ...(bootstrap?.capabilities ?? {}),
      },
      settings: {
        ...defaultValue.settings,
        ...(bootstrap?.settings ?? {}),
      },
    }),
    [bootstrap],
  );
  return <ConfiguratorContext.Provider value={value}>{children}</ConfiguratorContext.Provider>;
}

export function useConfiguratorAccess() {
  return useContext(ConfiguratorContext);
}

export function filterAllowedRecord(record, allowedIds) {
  if (!Array.isArray(allowedIds) || allowedIds.length === 0) return record;
  return Object.fromEntries(Object.entries(record).filter(([key]) => allowedIds.includes(key)));
}

export function filterAllowedColors(colors, allowedIds) {
  if (!Array.isArray(allowedIds) || allowedIds.length === 0) return colors;
  return Object.fromEntries(Object.entries(colors).filter(([key]) => allowedIds.includes(key)));
}
