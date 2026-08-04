import { Eye, Grid2X2, Ruler } from "lucide-react";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { useConfiguratorAccess } from "@/configurator/ConfiguratorContext";

export function ViewerToolbar() {
  const access = useConfiguratorAccess();
  const config = useConfiguratorStore((state) => state.config);
  const setViewMode = useConfiguratorStore((state) => state.setViewMode);
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

      <button className={config.showDimensions ? "viewer-tool active" : "viewer-tool"} onClick={() => setShowDimensions(!config.showDimensions)} title="Pokaż lub ukryj wymiary">
        <Ruler className="h-4 w-4" />
        <span>Wymiary</span>
      </button>
    </div>
  );
}
