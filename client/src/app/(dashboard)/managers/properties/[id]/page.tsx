"use client";

import Header from "@/components/Header";
import Loading from "@/components/Loading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetPaymentsQuery,
  useGetPropertyLeasesQuery,
  useGetPropertyQuery,
} from "@/state/api";
import { ArrowDownToLine, ArrowLeft, Check, Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";

const PropertyTenants = () => {
  const { id } = useParams();
  const propertyId = Number(id);
  const [error, setError] = React.useState<string | null>(null);

  // Log when component mounts with propertyId
  React.useEffect(() => {
    console.log("PropertyTenants component mounted with property ID:", propertyId);
    if (isNaN(propertyId)) {
      setError(`Invalid property ID: ${id}`);
      console.error("Invalid property ID:", id);
    }
  }, [propertyId, id]);

  const { 
    data: property, 
    isLoading: propertyLoading,
    error: propertyError 
  } = useGetPropertyQuery(propertyId, {
    skip: isNaN(propertyId)
  });
  
  const { 
    data: leases, 
    isLoading: leasesLoading,
    error: leasesError
  } = useGetPropertyLeasesQuery(propertyId, {
    skip: isNaN(propertyId) || !propertyId
  });
  
  // Log property and leases data for debugging
  React.useEffect(() => {
    if (property) {
      console.log("Property data loaded:", property);
    }
    if (leases) {
      console.log("Leases data loaded:", leases);
    }
  }, [property, leases]);
  
  // Get the first lease's ID for payments if available
  const firstLeaseId = leases && leases.length > 0 ? leases[0].id : undefined;
  
  const { 
    data: payments, 
    isLoading: paymentsLoading,
    error: paymentsError
  } = useGetPaymentsQuery(firstLeaseId as number, {
    skip: !firstLeaseId || isNaN(propertyId) || !propertyId || !leases || leases.length === 0
  });

  // Log errors if they occur
  React.useEffect(() => {
    if (propertyError) {
      console.error("Property fetch error:", propertyError);
      setError("Failed to load property details");
    }
    if (leasesError) {
      console.error("Leases fetch error:", leasesError);
      setError("Failed to load lease information");
    }
    if (paymentsError) {
      console.error("Payments fetch error:", paymentsError);
      setError("Failed to load payment information");
    }
    
    // Additional detailed error logging
    if (propertyError || leasesError || paymentsError) {
      console.error("Full error details:", {
        propertyError: JSON.stringify(propertyError),
        leasesError: JSON.stringify(leasesError),
        paymentsError: JSON.stringify(paymentsError)
      });
    }
  }, [propertyError, leasesError, paymentsError]);

  // Check for invalid ID first
  if (isNaN(propertyId)) {
    return (
      <div className="dashboard-container">
        <Link
          href="/managers/properties"
          className="flex items-center mb-4 hover:text-primary-500"
          scroll={false}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to Properties</span>
        </Link>

        <div className="bg-red-50 border border-red-200 rounded p-4 mt-4">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Invalid Property ID</h2>
          <p className="text-red-600">The property ID &quot;{id}&quot; is not valid. Please select a valid property.</p>
        </div>
      </div>
    );
  }
  
  // Show loading state when loading data
  if (propertyLoading || leasesLoading || paymentsLoading) return <Loading />;

  // Show error state if any errors occurred
  if (error || !property) {
    return (
      <div className="dashboard-container">
        <Link
          href="/managers/properties"
          className="flex items-center mb-4 hover:text-primary-500"
          scroll={false}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to Properties</span>
        </Link>

        <div className="bg-red-50 border border-red-200 rounded p-4 mt-4">
          <h2 className="text-lg font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-red-600">{error || "Unable to load property data"}</p>
          {(propertyError || leasesError || paymentsError) && (
            <pre className="mt-4 text-xs bg-red-100 p-2 rounded overflow-auto">
              {JSON.stringify(propertyError || leasesError || paymentsError, null, 2)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  const getCurrentMonthPaymentStatus = (leaseId: number) => {
    try {
      // If we have no payments data at all
      if (!payments) {
        return "Not Available";
      }
      
      const currentDate = new Date();
      const currentMonthPayment = payments.find(
        (payment) => {
          try {
            return payment.leaseId === leaseId &&
              new Date(payment.dueDate).getMonth() === currentDate.getMonth() &&
              new Date(payment.dueDate).getFullYear() === currentDate.getFullYear();
          } catch (err) {
            console.error("Error comparing payment dates:", err);
            return false;
          }
        }
      );
      
      // Log for debugging
      console.log(`Payment status for lease ${leaseId}:`, currentMonthPayment?.paymentStatus || "Not Paid");
      
      return currentMonthPayment?.paymentStatus || "Not Paid";
    } catch (error) {
      console.error(`Error getting payment status for lease ${leaseId}:`, error);
      return "Unknown";
    }
  };

  return (
    <div className="dashboard-container">
      {/* Back to properties page */}
      <Link
        href="/managers/properties"
        className="flex items-center mb-4 hover:text-primary-500"
        scroll={false}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span>Back to Properties</span>
      </Link>

      <Header
        title={property?.name || "My Property"}
        subtitle="Manage tenants and leases for this property"
      />

      <div className="w-full space-y-6">
        <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Tenants Overview</h2>
              <p className="text-sm text-gray-500">
                Manage and view all tenants for this property.
              </p>
            </div>
            <div>
              <button
                className={`bg-white border border-gray-300 text-gray-700 py-2
              px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50`}
              >
                <Download className="w-5 h-5 mr-2" />
                <span>Download All</span>
              </button>
            </div>
          </div>
          <hr className="mt-4 mb-1" />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Lease Period</TableHead>
                  <TableHead>Monthly Rent</TableHead>
                  <TableHead>Current Month Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases && leases.length > 0 ? (
                  leases.map((lease) => (
                    <TableRow key={lease.id} className="h-24">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Image
                            src="/landing-i1.png"
                            alt={lease.tenant.name}
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                          <div>
                            <div className="font-semibold">
                              {lease.tenant.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lease.tenant.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {new Date(lease.startDate).toLocaleDateString()} -
                        </div>
                        <div>{new Date(lease.endDate).toLocaleDateString()}</div>
                      </TableCell>
                      <TableCell>${lease.rent.toFixed(2)}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            getCurrentMonthPaymentStatus(lease.id) === "Paid"
                              ? "bg-green-100 text-green-800 border-green-300"
                              : "bg-red-100 text-red-800 border-red-300"
                          }`}
                        >
                          {getCurrentMonthPaymentStatus(lease.id) === "Paid" && (
                            <Check className="w-4 h-4 inline-block mr-1" />
                          )}
                          {getCurrentMonthPaymentStatus(lease.id)}
                        </span>
                      </TableCell>
                      <TableCell>{lease.tenant.phoneNumber}</TableCell>
                      <TableCell>
                        <button
                          className={`border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex 
                        items-center justify-center font-semibold hover:bg-primary-700 hover:text-primary-50`}
                        >
                          <ArrowDownToLine className="w-4 h-4 mr-1" />
                          Download Agreement
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <p className="text-gray-500">No active leases for this property</p>
                      <p className="text-sm text-gray-400 mt-1">
                        When tenants sign leases for this property, they will appear here.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyTenants;