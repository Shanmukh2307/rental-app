import { useGetPropertyQuery } from "@/state/api";
import React from "react";
import PropertyLocationPreview from "@/components/PropertyLocationPreview";

const PropertyLocation = ({ propertyId }: PropertyDetailsProps) => {
  const {
    data: property,
    isError,
    isLoading,
  } = useGetPropertyQuery(propertyId);

  if (isLoading) return <>Loading...</>;
  if (isError || !property) {
    return <>Property not Found</>;
  }

  return (
    <div className="py-16">
      <PropertyLocationPreview
        coordinates={property.location.coordinates}
        address={property.location.address}
        city={property.location.city}
        state={property.location.state}
        country={property.location.country}
      />
    </div>
  );
};

export default PropertyLocation;