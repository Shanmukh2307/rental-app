import { cleanParams, createNewUserInDatabase, withToast } from "@/lib/utils";
import {
  Application,
  Lease,
  Manager,
  Payment,
  Property,
  Tenant,
} from "@/types/prismaTypes";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";
import { FiltersState } from ".";

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const session = await fetchAuthSession();
      const { idToken } = session.tokens ?? {};
      if (idToken) {
        headers.set("Authorization", `Bearer ${idToken}`);
      }
      return headers;
    },
  }),
  reducerPath: "api",
  tagTypes: [
    "Managers",
    "Tenants",
    "Properties",
    "PropertyDetails",
    "Leases",
    "Payments",
    "Applications",
  ],
  endpoints: (build) => ({
    getAuthUser: build.query<User, void>({
      queryFn: async (_, _queryApi, _extraoptions, fetchWithBQ) => {
        try {
          // Check if there's an active session first
          const session = await fetchAuthSession();
          
          // If no tokens, user is not logged in - return null without error
          if (!session.tokens) {
            return { data: null as any };
          }
          
          const { idToken } = session.tokens;
          const user = await getCurrentUser();
          const userRole = idToken?.payload["custom:role"] as string;

          const endpoint =
            userRole === "manager"
              ? `/managers/${user.userId}`
              : `/tenants/${user.userId}`;

          let userDetailsResponse = await fetchWithBQ(endpoint);

          // if user doesn't exist, create new user
          if (
            userDetailsResponse.error &&
            userDetailsResponse.error.status === 404
          ) {
            userDetailsResponse = await createNewUserInDatabase(
              user,
              idToken,
              userRole,
              fetchWithBQ
            );
          }

          return {
            data: {
              cognitoInfo: { ...user },
              userInfo: userDetailsResponse.data as Tenant | Manager,
              userRole,
            },
          };
        } catch (error: any) {
          return { error: error.message || "Could not fetch user data" };
        }
      },
    }),

    // property related endpoints
    getProperties: build.query<
      Property[],
      Partial<FiltersState> & { favoriteIds?: number[] }
    >({
      query: (filters) => {
        const params = cleanParams({
          location: filters.location,
          priceMin: filters.priceRange?.[0],
          priceMax: filters.priceRange?.[1],
          beds: filters.beds,
          baths: filters.baths,
          propertyType: filters.propertyType,
          squareFeetMin: filters.squareFeet?.[0],
          squareFeetMax: filters.squareFeet?.[1],
          amenities: Array.isArray(filters.amenities) ? filters.amenities.join(",") : "",
          availableFrom: filters.availableFrom,
          favoriteIds: filters.favoriteIds?.join(","),
          latitude: filters.coordinates?.[1] || null,
          longitude: filters.coordinates?.[0] || null,
        });

        return { url: "properties", params };
      },
      // Fix potential null destructuring with safe mapping
      providesTags: (result) =>
        result && Array.isArray(result)
          ? [
              ...result.map((property) => ({ 
                type: "Properties" as const, 
                id: property?.id || "unknown" 
              })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch properties.",
        });
      },
    }),

    // New endpoint to get all properties for city markers (no filters)
    getAllPropertiesForCities: build.query<Property[], void>({
      query: () => "properties",
      providesTags: (result) =>
        result && Array.isArray(result)
          ? [
              ...result.map((property) => ({ 
                type: "Properties" as const, 
                id: property?.id || "unknown" 
              })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
    }),

    getProperty: build.query<Property, number>({
      query: (id) => {
        if (!id || isNaN(id)) {
          throw new Error(`Invalid property ID: ${id}`);
        }
        console.log(`Fetching property details for ID: ${id}`);
        return `properties/${id}`;
      },
      providesTags: (result, error, id) => [{ type: "PropertyDetails", id }],
      transformErrorResponse: (response) => {
        console.error("Property details error response:", response);
        return response;
      },
      async onQueryStarted(id, { queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          console.log(`Successfully fetched property details for ID ${id}:`, result.data);
        } catch (error) {
          console.error(`Error fetching property details for ID ${id}:`, error);
        }
      },
    }),

    // tenant related endpoints
    getTenant: build.query<Tenant, string>({
      query: (cognitoId) => `tenants/${cognitoId}`,
      // Fix potential null destructuring by using optional chaining
      providesTags: (result) => result ? [{ type: "Tenants", id: result.id }] : [{ type: "Tenants", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to load tenant profile.",
        });
      },
    }),

    getCurrentResidences: build.query<Property[], string>({
      query: (cognitoId) => `tenants/${cognitoId}/current-residences`,
      // Fix potential null destructuring with safe mapping
      providesTags: (result) =>
        result && Array.isArray(result)
          ? [
              ...result.map((property) => ({ 
                type: "Properties" as const, 
                id: property?.id || "unknown" 
              })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch current residences.",
        });
      },
    }),

    updateTenantSettings: build.mutation<
      Tenant,
      { cognitoId: string } & Partial<Tenant>
    >({
      query: ({ cognitoId, ...updatedTenant }) => ({
        url: `tenants/${cognitoId}`,
        method: "PUT",
        body: updatedTenant,
      }),
      // Fix potential null destructuring by using optional chaining and providing fallback
      invalidatesTags: (result) => result ? [{ type: "Tenants", id: result.id }] : [{ type: "Tenants", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Settings updated successfully!",
          error: "Failed to update settings.",
        });
      },
    }),

    addFavoriteProperty: build.mutation<
      Tenant,
      { cognitoId: string; propertyId: number }
    >({
      query: ({ cognitoId, propertyId }) => ({
        url: `tenants/${cognitoId}/favorites/${propertyId}`,
        method: "POST",
      }),
      // Fix potential null destructuring by using optional chaining and providing fallback
      invalidatesTags: (result) => [
        result ? { type: "Tenants", id: result.id } : { type: "Tenants", id: "LIST" },
        { type: "Properties", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Added to favorites!!",
          error: "Failed to add to favorites",
        });
      },
    }),

    removeFavoriteProperty: build.mutation<
      Tenant,
      { cognitoId: string; propertyId: number }
    >({
      query: ({ cognitoId, propertyId }) => ({
        url: `tenants/${cognitoId}/favorites/${propertyId}`,
        method: "DELETE",
      }),
      // Fix potential null destructuring by using optional chaining and providing fallback
      invalidatesTags: (result) => [
        result ? { type: "Tenants", id: result.id } : { type: "Tenants", id: "LIST" },
        { type: "Properties", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Removed from favorites!",
          error: "Failed to remove from favorites.",
        });
      },
    }),

    // manager related endpoints
    getManagerProperties: build.query<Property[], string>({
      query: (cognitoId) => {
        if (!cognitoId) {
          throw new Error("Manager ID is required");
        }
        console.log(`Fetching properties for manager: ${cognitoId}`);
        return `managers/${cognitoId}/properties`;
      },
      // Fix potential null destructuring with safe mapping
      providesTags: (result) =>
        result && Array.isArray(result)
          ? [
              ...result.map((property) => ({ 
                type: "Properties" as const, 
                id: property?.id || "unknown" 
              })),
              { type: "Properties", id: "LIST" },
            ]
          : [{ type: "Properties", id: "LIST" }],
      transformErrorResponse: (response) => {
        console.error("Manager properties error response:", response);
        return response;
      },
      async onQueryStarted(cognitoId, { queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          console.log(`Successfully fetched ${result.data.length} properties for manager ${cognitoId}`);
        } catch (error) {
          console.error(`Error fetching properties for manager ${cognitoId}:`, error);
        }
      },
    }),

    updateManagerSettings: build.mutation<
      Manager,
      { cognitoId: string } & Partial<Manager>
    >({
      query: ({ cognitoId, ...updatedManager }) => ({
        url: `managers/${cognitoId}`,
        method: "PUT",
        body: updatedManager,
      }),
      // Fix potential null destructuring by using optional chaining and providing fallback
      invalidatesTags: (result) => result ? [{ type: "Managers", id: result.id }] : [{ type: "Managers", id: "LIST" }],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Settings updated successfully!",
          error: "Failed to update settings.",
        });
      },
    }),

    createProperty: build.mutation<Property, FormData>({
      query: (newProperty) => ({
        url: `properties`,
        method: "POST",
        body: newProperty,
      }),
      // Fix potential null destructuring by using optional chaining and providing fallback
      invalidatesTags: (result) => [
        { type: "Properties", id: "LIST" },
        result && result.manager ? { type: "Managers", id: result.manager.id } : { type: "Managers", id: "LIST" },
      ],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Property created successfully!",
          error: "Failed to create property.",
        });
      },
    }),

    // lease related enpoints
    getLeases: build.query<Lease[], number>({
      query: () => "leases",
      providesTags: ["Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch leases.",
        });
      },
    }),

    getPropertyLeases: build.query<Lease[], number>({
      query: (propertyId) => {
        if (!propertyId || isNaN(propertyId)) {
          throw new Error(`Invalid property ID: ${propertyId}`);
        }
        console.log(`Fetching leases for property ID: ${propertyId}`);
        return `properties/${propertyId}/leases`;
      },
      providesTags: ["Leases"],
      transformErrorResponse: (response) => {
        console.error("Property leases error response:", response);
        return response;
      },
      async onQueryStarted(propertyId, { queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          console.log(`Successfully fetched ${result.data.length} leases for property ${propertyId}`);
        } catch (error) {
          console.error(`Error fetching leases for property ${propertyId}:`, error);
        }
      },
    }),

    getPayments: build.query<Payment[], number>({
      query: (leaseId) => {
        if (!leaseId || isNaN(leaseId)) {
          throw new Error(`Invalid lease ID: ${leaseId}`);
        }
        console.log(`Fetching payments for lease ID: ${leaseId}`);
        return `leases/${leaseId}/payments`;
      },
      providesTags: ["Payments"],
      transformErrorResponse: (response) => {
        console.error("Payments error response:", response);
        return response;
      },
      async onQueryStarted(leaseId, { queryFulfilled }) {
        try {
          const result = await queryFulfilled;
          console.log(`Successfully fetched ${result.data.length} payments for lease ${leaseId}`);
        } catch (error) {
          console.error(`Error fetching payments for lease ${leaseId}:`, error);
        }
      },
    }),

    // application related endpoints
    getApplications: build.query<
      Application[],
      { userId?: string; userType?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.userId) {
          queryParams.append("userId", params.userId.toString());
        }
        if (params.userType) {
          queryParams.append("userType", params.userType);
        }

        return `applications?${queryParams.toString()}`;
      },
      providesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          error: "Failed to fetch applications.",
        });
      },
    }),

    updateApplicationStatus: build.mutation<
      Application & { lease?: Lease },
      { id: number; status: string }
    >({
      query: ({ id, status }) => ({
        url: `applications/${id}/status`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: ["Applications", "Leases"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Application status updated successfully!",
          error: "Failed to update application settings.",
        });
      },
    }),

    createApplication: build.mutation<Application, Partial<Application>>({
      query: (body) => ({
        url: `applications`,
        method: "POST",
        body: body,
      }),
      invalidatesTags: ["Applications"],
      async onQueryStarted(_, { queryFulfilled }) {
        await withToast(queryFulfilled, {
          success: "Application created successfully!",
          error: "Failed to create applications.",
        });
      },
    }),
  }),
});

export const {
  useGetAuthUserQuery,
  useUpdateTenantSettingsMutation,
  useUpdateManagerSettingsMutation,
  useGetPropertiesQuery,
  useGetPropertyQuery,
  useGetCurrentResidencesQuery,
  useGetManagerPropertiesQuery,
  useCreatePropertyMutation,
  useGetTenantQuery,
  useAddFavoritePropertyMutation,
  useRemoveFavoritePropertyMutation,
  useGetLeasesQuery,
  useGetPropertyLeasesQuery,
  useGetPaymentsQuery,
  useGetApplicationsQuery,
  useUpdateApplicationStatusMutation,
  useCreateApplicationMutation,
  useGetAllPropertiesForCitiesQuery,
} = api;