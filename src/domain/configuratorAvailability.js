import {
  CLADDING_CATALOG,
  DEFAULT_DOOR_SELECTION,
  DEFAULT_GATE_SELECTION,
  DEFAULT_WINDOW_SELECTION,
  DOOR_MODELS,
  GATE_MANUFACTURERS,
  ROOF_CLADDING_CATALOG,
  WINDOW_MODELS,
} from "@/config/catalog";

export function isAllowed(settings, field, key) {
  const values = settings?.[field];
  return !Array.isArray(values) || values.length === 0 || values.includes(key);
}

export function filterAllowedOptions(record, settings, field) {
  return Object.fromEntries(Object.entries(record).filter(([key]) => isAllowed(settings, field, key)));
}

function firstKey(record, fallback) {
  return Object.keys(record)[0] || fallback;
}

function allowedValue(values, current, fallback) {
  return !Array.isArray(values) || values.length === 0 || values.includes(current)
    ? current
    : values[0] || fallback;
}

function normalizeGate(opening, settings) {
  const manufacturers = filterAllowedOptions(GATE_MANUFACTURERS, settings, "allowedGateManufacturerIds");
  const manufacturerKey = manufacturers[opening.manufacturer] ? opening.manufacturer : firstKey(manufacturers, DEFAULT_GATE_SELECTION.manufacturer);
  const manufacturer = manufacturers[manufacturerKey] || GATE_MANUFACTURERS[DEFAULT_GATE_SELECTION.manufacturer];
  const types = filterAllowedOptions(manufacturer.types, settings, "allowedGateTypeIds");
  const gateType = types[opening.gateType] ? opening.gateType : firstKey(types, DEFAULT_GATE_SELECTION.gateType);
  const type = types[gateType] || Object.values(manufacturer.types)[0];
  const models = filterAllowedOptions(type.models, settings, "allowedGateModelIds");
  const model = models[opening.model] ? opening.model : firstKey(models, DEFAULT_GATE_SELECTION.model);
  return { ...opening, manufacturer: manufacturerKey, gateType, model };
}

function normalizeOpening(opening, settings) {
  if (opening.kind === "gate") return normalizeGate(opening, settings);
  if (opening.kind === "door") {
    const models = filterAllowedOptions(DOOR_MODELS, settings, "allowedDoorModelIds");
    return { ...opening, model: models[opening.model] ? opening.model : firstKey(models, DEFAULT_DOOR_SELECTION.model) };
  }
  const models = Object.fromEntries(Object.entries(WINDOW_MODELS).filter(([key, model]) =>
    isAllowed(settings, "allowedWindowModelIds", key)
      && (opening.kind === "roofWindow" ? model.placement === "roof" : model.placement !== "roof"),
  ));
  return { ...opening, model: models[opening.model] ? opening.model : firstKey(models, DEFAULT_WINDOW_SELECTION.model) };
}

export function normalizeConfigurationAvailability(config, settings = {}, capabilities = {}) {
  const roofTypes = settings.allowedRoofTypeIds || [];
  const roofType = !roofTypes.length || roofTypes.includes(config.roof.type) ? config.roof.type : roofTypes[0];
  const wallManufacturers = filterAllowedOptions(CLADDING_CATALOG, settings, "allowedPanelManufacturerIds");
  const manufacturer = wallManufacturers[config.cladding.manufacturer] ? config.cladding.manufacturer : firstKey(wallManufacturers, config.cladding.manufacturer);
  const wallType = wallManufacturers[manufacturer]?.types?.[config.cladding.type] || Object.values(wallManufacturers[manufacturer]?.types || {})[0];
  const wallModels = filterAllowedOptions(wallType?.models || {}, settings, "allowedWallPanelModelIds");
  const model = wallModels[config.cladding.model] ? config.cladding.model : firstKey(wallModels, config.cladding.model);
  const roofManufacturers = filterAllowedOptions(ROOF_CLADDING_CATALOG, settings, "allowedPanelManufacturerIds");
  const roofManufacturer = roofManufacturers[config.cladding.roofManufacturer] ? config.cladding.roofManufacturer : firstKey(roofManufacturers, config.cladding.roofManufacturer);
  const roofModels = filterAllowedOptions(roofManufacturers[roofManufacturer]?.models || {}, settings, "allowedRoofPanelModelIds");
  const roofModel = roofModels[config.cladding.roofModel] ? config.cladding.roofModel : firstKey(roofModels, config.cladding.roofModel);

  return {
    ...config,
    roof: { ...config.roof, type: roofType },
    cladding: {
      ...config.cladding,
      manufacturer,
      model,
      roofManufacturer,
      roofModel,
      color: allowedValue(settings.allowedWallColorIds, config.cladding.color, config.cladding.color),
      roofColor: allowedValue(settings.allowedRoofColorIds, config.cladding.roofColor, config.cladding.roofColor),
    },
    flashings: capabilities.flashings === false ? { ...config.flashings, enabled: false } : config.flashings,
    gutters: capabilities.gutters === false ? { ...config.gutters, enabled: false } : config.gutters,
    openings: (config.openings || []).filter((opening) => isAllowed(settings, "allowedOpeningKinds", opening.kind)).map((opening) => normalizeOpening(opening, settings)),
  };
}
