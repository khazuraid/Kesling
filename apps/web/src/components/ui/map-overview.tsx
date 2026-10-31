"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapOverviewProps {
  lat: number;
  lng: number;
  title?: string;
  className?: string;
  height?: string;
  zoom?: number;
}

export function MapOverview({ lat, lng, title, className, height = "160px", zoom = 15 }: MapOverviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function init() {
      if (!containerRef.current) return;
      try {
        const { Map: MapLibreMap, Marker } = await import("maplibre-gl");
        if (!isSubscribed || !containerRef.current) return;

        const map = new MapLibreMap({
          container: containerRef.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
              },
            },
            layers: [
              {
                id: "osm",
                type: "raster",
                source: "osm",
              },
            ],
          },
          center: [lng, lat],
          zoom,
          interactive: false,
        });

        new Marker({ color: "#059669" }).setLngLat([lng, lat]).addTo(map);
        mapRef.current = map;
      } catch (err) {
        console.error("MapOverview error:", err);
      }
    }

    init();

    return () => {
      isSubscribed = false;
      mapRef.current?.remove();
    };
  }, [lat, lng, zoom]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className={cn("rounded-card border border-border overflow-hidden bg-surface flex flex-col", className)}>
      <div ref={containerRef} style={{ width: "100%", height }} />
      <div className="flex items-center justify-between p-2 bg-surface border-t border-border text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium truncate">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">{title ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`}</span>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline font-semibold shrink-0 ml-2"
        >
          <span>Buka Peta</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export default MapOverview;
