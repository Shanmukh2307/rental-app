"use client";

import Card from "@/components/Card";
import Header from "@/components/Header";
import Loading from "@/components/Loading";
import {
  useGetAuthUserQuery,
  useGetCurrentResidencesQuery,
  useGetTenantQuery,
} from "@/state/api";
import React from "react";

const Residences = () => {
  const { data: authUser } = useGetAuthUserQuery();
  const { 
    data: tenant,
    isLoading: tenantLoading,
    error: tenantError
  } = useGetTenantQuery(
    authUser?.cognitoInfo?.userId || "",
    {
      skip: !authUser?.cognitoInfo?.userId,
    }
  );

  // Log tenant data for debugging
  React.useEffect(() => {
    console.log("Tenant data:", tenant);
    if (tenant && !tenant.favorites) {
      console.warn("Tenant has no favorites array", tenant);
    }
  }, [tenant]);

  const {
    data: currentResidences,
    isLoading,
    error,
  } = useGetCurrentResidencesQuery(authUser?.cognitoInfo?.userId || "", {
    skip: !authUser?.cognitoInfo?.userId,
  });

  // Check all loading states
  if (isLoading || tenantLoading) return <Loading />;
  
  // Handle potential errors
  if (error) return <div className="dashboard-container">Error loading current residences</div>;
  if (tenantError) return <div className="dashboard-container">Error loading tenant information</div>;

  // Ensure favorites is always an array, even if it's null or undefined in the tenant data
  const favorites = tenant?.favorites || [];
  
  // Extract favorite property IDs from the favorites array (which contains Property objects)
  const favoriteIds = favorites.map((fav: any) => fav?.id).filter(Boolean);

  return (
    <div className="dashboard-container">
      <Header
        title="Current Residences"
        subtitle="View and manage your current living spaces"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {currentResidences?.filter(property => property != null)?.map((property) => (
          <Card
            key={property.id || `property-${Math.random()}`}
            property={property}
            isFavorite={(property.id && favoriteIds.includes(property.id)) || false}
            onFavoriteToggle={() => {}}
            showFavoriteButton={false}
            propertyLink={`/tenants/residences/${property.id}`}
          />
        ))}
      </div>
      {(!currentResidences || currentResidences.length === 0) && (
        <p>You don&lsquo;t have any current residences</p>
      )}
    </div>
  );
};

export default Residences;