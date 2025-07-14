"use client";

import Card from "@/components/Card";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import { useGetAuthUserQuery, useGetManagerPropertiesQuery } from "@/state/api";
import React from "react";

const Properties = () => {
  const { data: authUser, isLoading: isLoadingUser } = useGetAuthUserQuery();
  const cognitoId = authUser?.cognitoInfo?.userId || "";
  
  const {
    data: managerProperties,
    isLoading: isLoadingProperties,
    error,
  } = useGetManagerPropertiesQuery(cognitoId, {
    skip: !cognitoId || isLoadingUser,
  });

  // Log more detailed error information
  React.useEffect(() => {
    if (error) {
      console.error("Detailed error information:", error);
    }
  }, [error]);
  // Display loading state when either user data or properties are loading
  if (isLoadingUser || isLoadingProperties) return <Loading />;

  // If user isn't available yet, don't show an error
  if (!authUser) {
    return <Loading />;
  }
  
  // More detailed error handling
  if (error) {
    return (
      <div className="dashboard-container">
        <Header
          title="Error Loading Properties"
          subtitle="We encountered a problem while fetching your properties"
        />
        <div className="bg-red-50 border border-red-200 rounded p-4 mt-4">
          <p className="text-red-700 font-medium">Error details:</p>
          <pre className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header
        title="My Properties"
        subtitle="View and manage your property listings"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {managerProperties?.map((property) => (
          <Card
            key={property.id}
            property={property}
            isFavorite={false}
            onFavoriteToggle={() => {}}
            showFavoriteButton={false}
            propertyLink={`/managers/properties/${property.id}`}
          />
        ))}
      </div>
      {(!managerProperties || managerProperties.length === 0) && (
        <p>You don&lsquo;t manage any properties</p>
      )}
    </div>
  );
};

export default Properties;