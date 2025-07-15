"use client";

import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, ExternalLink } from "lucide-react";

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

// Disable Mapbox telemetry
(mapboxgl as any).config.COLLECT_METRICS = false;

interface PropertyLocationPreviewProps {
  coordinates: {
    longitude: number;
    latitude: number;
  };
  address: string;
  city: string;
  state: string;
  country: string;
  className?: string;
}

export default function PropertyLocationPreview({
  coordinates,
  address,
  city,
  state,
  country,
  className = "",
}: PropertyLocationPreviewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !coordinates.longitude || !coordinates.latitude) return;

    // Clean up previous map instance
    if (mapRef.current) {
      try {
        mapRef.current.remove();
      } catch (error) {
        console.warn("Error removing previous map:", error);
      }
      mapRef.current = null;
    }

    // Double-check that container still exists
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/shanmukh2307/cmcuf6ktl000v01qt54otdzy3",
      center: [coordinates.longitude, coordinates.latitude],
      zoom: 15,
      interactive: true,
    });

    mapRef.current = map;

    // Add marker
    const marker = new mapboxgl.Marker({ 
      color: "#3B82F6",
      draggable: false 
    })
      .setLngLat([coordinates.longitude, coordinates.latitude])
      .addTo(map);

    // Add popup with address
    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(`
        <div class="p-2">
          <div class="font-semibold text-sm">${address}</div>
          <div class="text-xs text-gray-600">${city}, ${state}, ${country}</div>
        </div>
      `);

    marker.setPopup(popup);

    return () => {
      if (mapRef.current) {
        try {
          // Check if the map is still valid before removing
          if (!mapRef.current._removed && mapRef.current.getContainer()) {
            mapRef.current.remove();
          }
        } catch (error) {
          console.warn("Error removing map during cleanup:", error);
        }
        mapRef.current = null;
      }
    };
  }, [coordinates, address, city, state, country]);

  const fullAddress = `${address}, ${city}, ${state}, ${country}`;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold">Location</h3>
        </div>
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Get Directions
        </a>
      </div>
      
      <div className="space-y-2">
        <p className="text-sm text-gray-600">{fullAddress}</p>
        <div 
          ref={mapContainer} 
          className="w-full h-64 rounded-lg border border-gray-200"
        />
      </div>
    </div>
  );
} 