"use client";

import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Search, MapPin, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string;

// Disable Mapbox telemetry
(mapboxgl as any).config.COLLECT_METRICS = false;

// Default coordinates (Bangalore)
const DEFAULT_COORDS: [number, number] = [77.5946, 12.9716];

interface LocationData {
  coordinates: [number, number];
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

interface MapWithPinProps {
  value?: LocationData;
  onChange: (data: LocationData) => void;
  className?: string;
}

export default function MapWithPin({ value, onChange, className }: MapWithPinProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [locationData, setLocationData] = useState<LocationData>(value || {
    coordinates: DEFAULT_COORDS,
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  });
  const [isValidLocation, setIsValidLocation] = useState(true);
  const [manualOverride, setManualOverride] = useState(false);

  // Initialize map and marker
  useEffect(() => {
    if (!mapContainer.current) return;

    // Clean up previous map instance if it exists
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
    if (!mapContainer.current) return;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/shanmukh2307/cmcuf6ktl000v01qt54otdzy3",
      center: locationData.coordinates,
      zoom: 13,
    });

    mapRef.current = map;

    // Create draggable marker
    const marker = new mapboxgl.Marker({ 
      draggable: true,
      color: "#3B82F6"
    })
      .setLngLat(locationData.coordinates)
      .addTo(map);

    markerRef.current = marker;

    // Handle marker drag end
    const handleMarkerDragEnd = async () => {
      if (!markerRef.current) return;
      
      const lngLat = markerRef.current.getLngLat();
      const newCoords: [number, number] = [lngLat.lng, lngLat.lat];
      
      // Validate location (not in ocean, etc.)
      const isValid = lngLat.lng > -180 && lngLat.lng < 180 && 
                     lngLat.lat > -90 && lngLat.lat < 90;
      setIsValidLocation(isValid);

      if (isValid) {
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lngLat.lng},${lngLat.lat}.json?access_token=${mapboxgl.accessToken}&types=address,poi`
          );
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const context = feature.context || [];
            
            const newLocationData: LocationData = {
              coordinates: newCoords,
              address: feature.place_name || "",
              city: context.find((c: any) => c.id.startsWith('place'))?.text || "",
              state: context.find((c: any) => c.id.startsWith('region'))?.text || "",
              country: context.find((c: any) => c.id.startsWith('country'))?.text || "",
              postalCode: context.find((c: any) => c.id.startsWith('postcode'))?.text || "",
            };
            
            setLocationData(newLocationData);
            setManualOverride(false);
            onChange(newLocationData);
          }
        } catch (error) {
          console.error("Error reverse geocoding:", error);
        }
      }
    };

    marker.on("dragend", handleMarkerDragEnd);

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
  }, [locationData.coordinates, onChange]);

  // Handle address search
  const handleAddressSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxgl.accessToken}&fuzzyMatch=true&limit=1`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.center;
        const context = feature.context || [];
        
        const newLocationData: LocationData = {
          coordinates: [lng, lat],
          address: feature.place_name || "",
          city: context.find((c: any) => c.id.startsWith('place'))?.text || "",
          state: context.find((c: any) => c.id.startsWith('region'))?.text || "",
          country: context.find((c: any) => c.id.startsWith('country'))?.text || "",
          postalCode: context.find((c: any) => c.id.startsWith('postcode'))?.text || "",
        };
        
        setLocationData(newLocationData);
        setManualOverride(false);
        onChange(newLocationData);
        
        // Move marker and map
        if (markerRef.current && mapRef.current) {
          markerRef.current.setLngLat([lng, lat]);
          mapRef.current.flyTo({ center: [lng, lat], zoom: 15 });
        }
        
        setIsValidLocation(true);
      }
    } catch (error) {
      console.error("Error searching address:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle manual address field changes
  const handleAddressFieldChange = (field: keyof LocationData, value: string) => {
    const newLocationData = { ...locationData, [field]: value };
    setLocationData(newLocationData);
    setManualOverride(true);
    onChange(newLocationData);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Search for an address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
          className="flex-1"
        />
        <Button 
          onClick={handleAddressSearch}
          disabled={isSearching}
          className="px-4"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Map */}
      <div className="relative">
        <div 
          ref={mapContainer} 
          className="w-full h-80 rounded-lg border-2 border-gray-200"
        />
        {!isValidLocation && (
          <div className="absolute top-2 left-2 bg-red-100 border border-red-300 text-red-700 px-3 py-1 rounded-md text-sm flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            Invalid location
          </div>
        )}
      </div>

      {/* Address Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={locationData.address}
            onChange={(e) => handleAddressFieldChange('address', e.target.value)}
            placeholder="Address will be auto-filled from map"
            className={manualOverride ? "border-blue-500" : ""}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={locationData.city}
              onChange={(e) => handleAddressFieldChange('city', e.target.value)}
              placeholder="City"
              className={manualOverride ? "border-blue-500" : ""}
            />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={locationData.state}
              onChange={(e) => handleAddressFieldChange('state', e.target.value)}
              placeholder="State"
              className={manualOverride ? "border-blue-500" : ""}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={locationData.country}
              onChange={(e) => handleAddressFieldChange('country', e.target.value)}
              placeholder="Country"
              className={manualOverride ? "border-blue-500" : ""}
            />
          </div>
          <div>
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={locationData.postalCode}
              onChange={(e) => handleAddressFieldChange('postalCode', e.target.value)}
              placeholder="Postal Code"
              className={manualOverride ? "border-blue-500" : ""}
            />
          </div>
        </div>

        {manualOverride && (
          <div className="text-sm text-blue-600 flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            Address fields manually edited
          </div>
        )}
      </div>
    </div>
  );
} 