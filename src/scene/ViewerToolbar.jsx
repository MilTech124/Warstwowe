import { Box, Camera, Eye, Grid2X2, Home, Maximize2, Ruler, Square, Warehouse } from "lucide-react";
import { CAMERA_MODES } from "@/config/catalog";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { useConfiguratorAccess } from "@/configurator/ConfiguratorContext";

const cameraIcons = {
  orbit: Maximize2,
  front: Home,
  side: Square,
  top: Box,
  interior: Camera,
  structure: Warehouse,
};

export function ViewerToolbar() {
  const access = useConfiguratorAccess();
  const config = useConfiguratorStore((state) => state.config);
  const setViewMode = useConfiguratorStore((state) => state.setViewMode);
  const setCameraMode = useConfiguratorStore((state) => state.setCameraMode);
  const setShowDimensions = useConfiguratorStore((state) => state.setShowDimensions);

  return (
    <div className="viewer-toolbar">
      <div className="viewer-tool-group">
        <button className={config.viewMode === "full" ? "viewer-tool active" : "viewer-tool"} onClick={() => setViewMode("full")} title="Widok całości">
          <Eye className="h-4 w-4" />
          <span>Całość</span>
        </button>
        {access.capabilities.structureView && (
          <button className={config.viewMode === "structure" ? "viewer-tool active" : "viewer-tool"} onClick={() => setViewMode("structure")} title="Widok konstrukcji">
            <Grid2X2 className="h-4 w-4" />
            <span>Konstrukcja</span>
          </button>
        )}
      </div>

      <div className="viewer-tool-group camera-tools">
        {Object.entries(CAMERA_MODES)
          .filter(([key]) => key !== "structure" || access.capabilities.structureView)
          .map(([key, label]) => {
          const Icon = cameraIcons[key] || Camera;
          return (
            <button key={key} className={config.cameraMode === key ? "viewer-tool icon-only active" : "viewer-tool icon-only"} onClick={() => setCameraMode(key)} title={`Kamera: ${label}`}>
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      <button className={config.showDimensions ? "viewer-tool active" : "viewer-tool"} onClick={() => setShowDimensions(!config.showDimensions)} title="Pokaż lub ukryj wymiary">
        <Ruler className="h-4 w-4" />
        <span>Wymiary</span>
      </button>
    </div>
  );
}
