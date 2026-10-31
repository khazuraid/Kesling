"use client";

import { Crosshair, Loader2, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapPickerProps {
  lat?: number | null;
  lng?: number | null;
  onChange?: (lat: number, lng: number) => void;
  className?: string;
  zoom?: number;
  height?: string;
  readonly?: boolean;
}

// Default center: Kota Cirebon (-6.732, 108.552)
const DEFAULT_LAT = -6.732;
const DEFAULT_LNG = 108.552;

export function MapPicker({
  lat,
  lng,
  onChange,
  className,
  zoom = 14,
  height = "260px",
  readonly = false,
}: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);

  const currentLat = lat ?? DEFAULT_LAT;
  const currentLng = lng ?? DEFAULT_LNG;

  useEffect(() => {
    let isSubscribed = true;

    async function initMap() {
      if (!mapContainer.current) return;

      try {
        const { Map: MapLibreMap, Marker, NavigationControl } = await import("maplibre-gl");
        if (!isSubscribed || !mapContainer.current) return;

        const map = new MapLibreMap({
          container: mapContainer.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors",
              },
            },
            layers: [
              {
                id: "osm-tiles",
                type: "raster",
                source: "osm",
                minzoom: 0,
                maxzoom: 19,
              },
            ],
          },
          center: [currentLng, currentLat],
          zoom,
        });

        map.addControl(new NavigationControl({ showCompass: false }), "top-right");

        const marker = new Marker({
          draggable: !readonly,
          color: "#059669",
        })
          .setLngLat([currentLng, currentLat])
          .addTo(map);

        if (!readonly && onChange) {
          marker.on("dragend", () => {
            const pos = marker.getLngLat();
            onChange(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
          });

          map.on("click", (e: any) => {
            marker.setLngLat(e.lngLat);
            onChange(Number(e.lngLat.lat.toFixed(6)), Number(e.lngLat.lng.toFixed(6)));
          });
        }

        mapRef.current = map;
        markerRef.current = marker;
        setLoading(false);
      } catch (err) {
        console.error("Failed to initialize MapLibre:", err);
        setLoading(false);
      }
    }

    initMap();

    return () => {
      isSubscribed = false;
      mapRef.current?.remove();
    };
  }, []);

  // Update marker position if lat/lng prop changes from outside
  useEffect(() => {
    if (markerRef.current && lat != null && lng != null) {
      markerRef.current.setLngLat([lng, lat]);
      mapRef.current?.flyTo({ center: [lng, lat], essential: true });
    }
  }, [lat, lng]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung geolokasi.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = Number(pos.coords.latitude.toFixed(6));
        const userLng = Number(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
        onChange?.(userLat, userLng);
        markerRef.current?.setLngLat([userLng, userLat]);
        mapRef.current?.flyTo({ center: [userLng, userLat], zoom: 16 });
      },
      (err) => {
        setGpsLoading(false);
        console.error("GPS error:", err);
        alert("Gagal membaca GPS lokasi. Pastikan izin lokasi aktif.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className={cn("relative rounded-card border border-border overflow-hidden bg-surface", className)}>
      <div ref={mapContainer} style={{ width: "100%", height }} />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-xs z-10">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground ml-2 font-medium">Memuat peta...</span>
        </div>
      )}

      {/* Coordinate & GPS Actions Bar */}
      <div className="flex items-center justify-between p-2.5 bg-surface border-t border-border text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="tabular-nums">
            {lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Belum diset (Cirebon default)"}
          </span>
        </div>

        {!readonly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={gpsLoading}
            onClick={handleGetCurrentLocation}
            className="h-7 text-xs font-semibold gap-1.5"
          >
            {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3 text-primary" />}
            <span>Lokasi Saya</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export default MapPicker;
