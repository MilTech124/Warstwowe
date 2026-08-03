import type { CompanyConfiguratorSettings, ConfiguratorBootstrap } from "@/types/saas";

type DemoBranding = ConfiguratorBootstrap["company"]["branding"];

export type DemoState = {
  branding?: DemoBranding;
  settings?: CompanyConfiguratorSettings;
};

type DemoStorage = {
  draft?: DemoState;
  published?: DemoState;
};

const demoGlobal = globalThis as typeof globalThis & {
  __warstwoweDemoState?: DemoStorage | DemoState;
};

export function getDemoState(): DemoState {
  const state = demoGlobal.__warstwoweDemoState;
  if (!state) return {};
  if ("published" in state || "draft" in state) return (state as DemoStorage).published ?? {};
  return state as DemoState;
}

export function getDemoDraftState(): DemoState {
  const state = demoGlobal.__warstwoweDemoState;
  if (!state) return {};
  if ("published" in state || "draft" in state) {
    const storage = state as DemoStorage;
    return storage.draft ?? storage.published ?? {};
  }
  return state as DemoState;
}

export function saveDemoState(input: {
  branding?: DemoBranding;
  settings: Omit<CompanyConfiguratorSettings, "published"> & { published?: boolean };
  publish: boolean;
}): DemoState {
  const current = getDemoDraftState();
  const nextVersion = Math.max(1, Number(current.settings?.version || input.settings.version || 1)) + 1;
  const next: DemoState = {
    branding: input.branding ?? current.branding,
    settings: {
      ...input.settings,
      version: nextVersion,
      published: input.publish || Boolean(input.settings.published) || Boolean(current.settings?.published),
    },
  };

  const published = getDemoState();
  demoGlobal.__warstwoweDemoState = {
    draft: next,
    published: input.publish ? next : published,
  };
  return next;
}
