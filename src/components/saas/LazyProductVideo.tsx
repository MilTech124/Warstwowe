"use client";

import { useEffect, useRef, useState } from "react";

type LazyProductVideoProps = {
  src: string;
  label: string;
  className?: string;
  eager?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
  poster?: string;
};

export function LazyProductVideo({
  src,
  label,
  className = "",
  eager = false,
  autoPlay = true,
  controls = false,
  poster,
}: LazyProductVideoProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [isVisible, setIsVisible] = useState(eager);
  const [isReady, setIsReady] = useState(eager);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const playVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    void video.play().catch(() => undefined);
  };

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReduceMotion(media.matches);

    syncPreference();
    media.addEventListener("change", syncPreference);
    return () => media.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const syncFromPosition = () => {
      const rect = wrapper.getBoundingClientRect();
      const visible = rect.bottom >= -280 && rect.top <= window.innerHeight + 280;
      setIsVisible(visible);
      if (visible) setShouldLoad(true);
    };

    syncFromPosition();
    const initialSync = window.setTimeout(syncFromPosition, 300);
    window.addEventListener("load", syncFromPosition);
    window.addEventListener("scroll", syncFromPosition, { passive: true });
    window.addEventListener("resize", syncFromPosition);

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      setIsVisible(true);
      return () => {
        window.clearTimeout(initialSync);
        window.removeEventListener("load", syncFromPosition);
        window.removeEventListener("scroll", syncFromPosition);
        window.removeEventListener("resize", syncFromPosition);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) setShouldLoad(true);
      },
      { rootMargin: "280px 0px", threshold: 0.05 },
    );

    observer.observe(wrapper);
    return () => {
      observer.disconnect();
      window.clearTimeout(initialSync);
      window.removeEventListener("load", syncFromPosition);
      window.removeEventListener("scroll", syncFromPosition);
      window.removeEventListener("resize", syncFromPosition);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldLoad) return;

    const markReady = () => setIsReady(true);
    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) markReady();

    if (autoPlay) {
      if (isVisible && !reduceMotion) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    }

    return () => {
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
    };
  }, [autoPlay, isVisible, reduceMotion, shouldLoad]);

  return (
    <div
      ref={wrapperRef}
      className={`pm-lazy-video ${isReady ? "is-ready" : ""} ${poster ? "has-poster" : ""} ${className}`
        .replace(/\s+/g, " ")
        .trim()}
    >
      <span className="pm-video-loading" aria-hidden="true">
        <i />
        Ładowanie podglądu 3D
      </span>
      {controls && !isPlaying ? (
        <button
          className="pm-video-play"
          type="button"
          onClick={playVideo}
          aria-label={`Odtwórz: ${label}`}
        >
          <span aria-hidden="true" />
          Odtwórz prezentację
        </button>
      ) : null}
      <video
        ref={videoRef}
        src={shouldLoad ? src : undefined}
        poster={poster}
        muted
        loop
        playsInline
        controls={controls}
        autoPlay={eager && autoPlay}
        preload={eager ? "metadata" : "none"}
        aria-label={label}
        onCanPlay={() => setIsReady(true)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}
