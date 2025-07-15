"use client";
import React, { useEffect, useRef, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppSelector } from "@/state/redux";
import { useGetPropertiesQuery, useGetAllPropertiesForCitiesQuery } from "@/state/api";
import { Property } from "@/types/prismaTypes";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, CITIES } from "@/lib/constants";
import { useDispatch } from "react-redux";
import { setFilters } from "@/state";

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

// Disable Mapbox telemetry which is causing the ERR_BLOCKED_BY_CLIENT errors
(mapboxgl as any).config.COLLECT_METRICS = false;

// Helper function to extract unique cities from properties
const extractCitiesFromProperties = (properties: Property[]) => {
  const cityMap = new Map<string, {
    id: string;
    name: string;
    coordinates: [number, number];
    propertyCount: number;
    zoom: number;
  }>();

  properties.forEach((property) => {
    if (property.location?.city && property.location?.coordinates) {
      const cityName = property.location.city;
      const coordinates = [
        property.location.coordinates.longitude,
        property.location.coordinates.latitude,
      ] as [number, number];

      if (cityMap.has(cityName)) {
        // Update existing city with new property count
        const existing = cityMap.get(cityName)!;
        existing.propertyCount += 1;
      } else {
        // Add new city
        cityMap.set(cityName, {
          id: cityName.toLowerCase().replace(/\s+/g, '-'),
          name: cityName,
          coordinates,
          propertyCount: 1,
          zoom: 11, // Default zoom level for cities
        });
      }
    }
  });

  return Array.from(cityMap.values());
};

const SearchMap = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const dispatch = useDispatch();
  const filters = useAppSelector((state) => state.global.filters);
  const {
    data: properties,
    isLoading,
    isError,
  } = useGetPropertiesQuery(filters);

  // Get all properties for city extraction (unfiltered)
  const {
    data: allProperties,
    isLoading: isLoadingCities,
  } = useGetAllPropertiesForCitiesQuery();

  // Extract cities from all properties data, fallback to hardcoded cities if none found
  const cities = useMemo(() => {
    if (!allProperties || allProperties.length === 0) {
      // Fallback to hardcoded cities if no properties found
      console.log("No properties found, using hardcoded cities");
      return CITIES.map(city => ({
        ...city,
        propertyCount: 0,
        coordinates: city.coordinates as [number, number],
      }));
    }
    const extractedCities = extractCitiesFromProperties(allProperties);
    console.log("Extracted cities from properties:", extractedCities);
    return extractedCities;
  }, [allProperties]);

  useEffect(() => {
    if (isLoading || isLoadingCities || isError || !properties || !mapContainerRef.current) return;

    // Clean up previous map instance
    if (mapRef.current) {
      try {
        // Check if the map is still valid before removing
        if (!mapRef.current._removed && mapRef.current.getContainer()) {
          mapRef.current.remove();
        }
      } catch (error) {
        console.warn("Error removing previous map:", error);
      }
      mapRef.current = null;
    }

    // Double-check that container still exists
    if (!mapContainerRef.current) return;

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
        // Show dynamic city markers when no specific location is selected
        cities.forEach((city) => {
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
  }, [isLoading, isLoadingCities, isError, properties, filters.coordinates, cities]);

  if (isLoading || isLoadingCities) return <>Loading...</>;
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
          <span className="text-blue-600">
            🏙️ Available Cities {isLoadingCities ? "(Loading...)" : `(${cities.length})`}
          </span>
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
  city: { id: string; name: string; coordinates: [number, number]; propertyCount: number; zoom: number }, 
  map: mapboxgl.Map,
  dispatch: any
) => {
  // Create a custom city marker element with property count
  const el = document.createElement('div');
  el.className = 'city-marker';
  
  // Different styling based on property count
  const hasProperties = city.propertyCount > 0;
  const backgroundColor = hasProperties ? '#ff6b6b' : '#cccccc';
  const borderColor = hasProperties ? 'white' : '#999999';
  
  el.style.cssText = `
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: ${backgroundColor};
    border: 3px solid ${borderColor};
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
    font-size: 10px;
    text-align: center;
    opacity: ${hasProperties ? '1' : '0.7'};
  `;
  
  // Show city initial and property count
  el.innerHTML = `
    <div style="font-size: 12px; line-height: 1;">${city.name.charAt(0).toUpperCase()}</div>
    <div style="font-size: 8px; line-height: 1;">${city.propertyCount}</div>
  `;

  const marker = new mapboxgl.Marker(el)
    .setLngLat(city.coordinates)
    .setPopup(
      new mapboxgl.Popup().setHTML(
        `
        <div class="city-popup">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">${city.name}</h3>
          <p style="margin: 0 0 4px 0; font-size: 14px; color: #666;">
            ${hasProperties 
              ? `${city.propertyCount} propert${city.propertyCount === 1 ? 'y' : 'ies'} available`
              : 'No properties available yet'
            }
          </p>
          <p style="margin: 0; font-size: 12px; color: #888;">Click to search properties in ${city.name}</p>
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
      coordinates: city.coordinates,
    }));
    
    // Animate map to the city
    map.flyTo({
      center: city.coordinates,
      zoom: city.zoom,
      duration: 1500
    });
  });

  return marker;
};

export default SearchMap;