import Link from "next/link";
import { Expand, MousePointer2, Play, VolumeX } from "lucide-react";
import { LazyProductVideo } from "@/components/saas/LazyProductVideo";

export function HeroProductVideo() {
  return (
    <div className="pm-product-live pm-hero-video-live">
      <LazyProductVideo
        src="/video/hero-video.webm"
        label="Prezentacja konfiguratora Warstwowe3D z animacją bramy"
        className="pm-hero-product-video"
        eager
      />
      <div className="pm-hero-video-meta" aria-hidden="true">
        <span><Play size={11} fill="currentColor" /> Prezentacja produktu</span>
        <span><VolumeX size={12} /> Bez dźwięku</span>
      </div>
      <div className="pm-hero-video-callout" aria-hidden="true">
        <span><MousePointer2 size={15} /></span>
        <div><strong>Zmiana produktu na żywo</strong><small>Wymiary, wypust i animacja bramy</small></div>
      </div>
      <Link className="pm-hero-video-open" href="/demo">
        <Expand size={14} /> Otwórz pełne demo
      </Link>
    </div>
  );
}
