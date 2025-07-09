"use client";
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppSelector } from "@/state/redux";
import { useGetPropertiesQuery } from "@/state/api";
import { Property } from "@/types/prismaTypes";
import { CITIES, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "@/lib/constants";
import { useDispatch } from "react-redux";
import { setFilters } from "@/state";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

const Map = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const dispatch = useDispatch();
  const filters = useAppSelector((state) => state.global.filters);
  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  useEffect(() => {
    if (isLoading || isError || !properties || !mapContainerRef.current) return;

    // Clean up previous map instance
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Determine if we should show city view or property view
    const hasValidCoordinates = filters.coordinates && 
      filters.coordinates[0] !== null && 
      filters.coordinates[1] !== null;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: "mapbox://styles/shanmukh2307/cmcuf6ktl000v01qt54otdzy3",
      center: hasValidCoordinates 
        ? [filters.coordinates[0]!, filters.coordinates[1]!] as [number, number]
        : DEFAULT_MAP_CENTER as [number, number],
      zoom: hasValidCoordinates ? 11 : DEFAULT_MAP_ZOOM,
    });

    mapRef.current = map;

    // Wait for map to load before adding markers and resizing
    map.on('load', () => {
      if (hasValidCoordinates) {
        // Show property markers when location is selected
        properties.forEach((property) => {
          const marker = createPropertyMarker(property, map);
          const markerElement = marker.getElement();
          const path = markerElement.querySelector("path[fill='#3FB1CE']");
          if (path) path.setAttribute("fill", "#000000");
        });
      } else {
        // Show city markers when no specific location is selected
        CITIES.forEach((city) => {
          const marker = createCityMarker(city, map, dispatch);
        });
      }

      // Resize map after it's fully loaded and container is ready
      setTimeout(() => {
        if (map.getContainer() && !map._removed) {
          map.resize();
        }
      }, 100);
    });

    // Handle map errors
    map.on('error', (e) => {
      console.error('Map error:', e.error);
    });

    return () => {
      if (mapRef.current && !mapRef.current._removed) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isLoading, isError, properties, filters.coordinates]);

  if (isLoading) return <>Loading...</>;
  if (isError || !properties) return <div>Failed to fetch properties</div>;

  const hasValidCoordinates = filters.coordinates && 
    filters.coordinates[0] !== null && 
    filters.coordinates[1] !== null;

  return (
    <div className="basis-5/12 grow relative rounded-xl">
      <div
        className="map-container rounded-xl"
        ref={mapContainerRef}
        style={{
          height: "100%",
          width: "100%",
        }}
      />
      {/* Map info indicator */}
      <div className="absolute top-3 left-3 bg-white bg-opacity-90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm text-sm font-medium">
        {hasValidCoordinates ? (
          <span className="text-green-600">📍 Properties in {filters.location}</span>
        ) : (
          <span className="text-blue-600">🏙️ Available Cities</span>
        )}
      </div>
    </div>
  );
};

const createPropertyMarker = (property: Property, map: mapboxgl.Map) => {
  const marker = new mapboxgl.Marker()
    .setLngLat([
      property.location.coordinates.longitude,
      property.location.coordinates.latitude,
    ])
    .setPopup(
      new mapboxgl.Popup().setHTML(
        `
        <div class="marker-popup">
          <div class="marker-popup-image"></div>
          <div>
            <a href="/search/${property.id}" target="_blank" class="marker-popup-title">${property.name}</a>
            <p class="marker-popup-price">
              ₹${property.pricePerMonth}
              <span class="marker-popup-price-unit"> / month</span>
            </p>
          </div>
        </div>
        `
      )
    )
    .addTo(map);
  return marker;
};

const createCityMarker = (
  city: { id: string; name: string; coordinates: number[]; zoom: number }, 
  map: mapboxgl.Map,
  dispatch: any
) => {
  // Create a custom city marker element
  const el = document.createElement('div');
  el.className = 'city-marker';
  el.style.cssText = `
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #ff6b6b;
    border: 3px solid white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
    font-size: 12px;
  `;
  el.textContent = city.name.charAt(0).toUpperCase();

  const marker = new mapboxgl.Marker(el)
    .setLngLat(city.coordinates as [number, number])
    .setPopup(
      new mapboxgl.Popup().setHTML(
        `
        <div class="city-popup">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${city.name}</h3>
          <p style="margin: 0; font-size: 14px; color: #666;">Click to search properties in ${city.name}</p>
        </div>
        `
      )
    )
    .addTo(map);

  // Add click handler to zoom to city and search
  el.addEventListener('click', () => {
    // Update filters to search for this city
    dispatch(setFilters({
      location: city.name,
      coordinates: city.coordinates as [number, number],
    }));
    
    // Animate map to the city
    map.flyTo({
      center: city.coordinates as [number, number],
      zoom: city.zoom,
      duration: 1500
    });
  });

  return marker;
};

export default Map;