"use client";

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
  useGetAuthUserQuery,
  useGetLeasesQuery,
  useGetPaymentsQuery,
  useGetPropertyQuery,
} from "@/state/api";
import { Lease, Payment, Property } from "@/types/prismaTypes";
import {
  ArrowDownToLineIcon,
  Check,
  CreditCard,
  Download,
  Edit,
  FileText,
  Mail,
  MapPin,
  User,
} from "lucide-react";
import { useParams } from "next/navigation";
import React from "react";

const PaymentMethod = () => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 mt-10 md:mt-0 flex-1">
      <h2 className="text-2xl font-bold mb-4">Payment method</h2>
      <p className="mb-4">Change how you pay for your plan.</p>
      <div className="border rounded-lg p-6">
        <div>
          {/* Card Info */}
          <div className="flex gap-10">
            <div className="w-36 h-20 bg-blue-600 flex items-center justify-center rounded-md">
              <span className="text-white text-2xl font-bold">VISA</span>
            </div>
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-5">
                  <h3 className="text-lg font-semibold">Visa ending in 2024</h3>
                  <span className="text-sm font-medium border border-primary-700 text-primary-700 px-3 py-1 rounded-full">
                    Default
                  </span>
                </div>
                <div className="text-sm text-gray-500 flex items-center">
                  <CreditCard className="w-4 h-4 mr-1" />
                  <span>Expiry • 26/06/2024</span>
                </div>
              </div>
              <div className="text-sm text-gray-500 flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                <span>billing@baseclub.com</span>
              </div>
            </div>
          </div>

          <hr className="my-4" />
          <div className="flex justify-end">
            <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50">
              <Edit className="w-5 h-5 mr-2" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResidenceCard = ({
  property,
  currentLease,
  leaseStatus,
}: {
  property: Property;
  currentLease: Lease | any;
  leaseStatus: 'your' | 'other' | 'available';
}) => {
  const propertyImage = property.photoUrls && property.photoUrls.length > 0
    ? property.photoUrls[0]
    : null;

  const isActiveLease = leaseStatus === 'your';
  const displayPrice = isActiveLease
    ? (currentLease.rent || property.pricePerMonth)
    : property.pricePerMonth;

  // Dynamic lease status label and color
  let leaseLabel = '';
  let leaseColor = '';
  if (leaseStatus === 'your') {
    leaseLabel = 'Your Active Lease';
    leaseColor = 'bg-green-500';
  } else if (leaseStatus === 'other') {
    leaseLabel = 'Leased by Another Tenant';
    leaseColor = 'bg-amber-500';
  } else {
    leaseLabel = 'Available';
    leaseColor = 'bg-blue-500';
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 flex-1 flex flex-col justify-between">
      {/* Header */}
      <div className="flex gap-5">
        <div 
          className="w-64 h-32 bg-slate-200 rounded-xl overflow-hidden"
          style={propertyImage ? {
            backgroundImage: `url(${propertyImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        ></div>

        <div className="flex flex-col justify-between">
          <div>
            <div className={`${leaseColor} w-fit text-white px-4 py-1 rounded-full text-sm font-semibold`}>
              {leaseLabel}
            </div>
            <h2 className="text-2xl font-bold my-2">{property.name}</h2>
            <div className="flex items-center mb-2">
              <MapPin className="w-5 h-5 mr-1" />
              <span>
                {property.location?.city || 'City'}, {property.location?.country || 'Country'}
              </span>
            </div>
          </div>
          <div className="text-xl font-bold">
            ₹{displayPrice || 'N/A'}{" "}
            <span className="text-gray-500 text-sm font-normal">/ month</span>
          </div>
        </div>
      </div>
      {/* Dates */}
      <div>
        <hr className="my-4" />
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="xl:flex">
            <div className="text-gray-500 mr-2">Start Date: </div>
            <div className="font-semibold">
              {isActiveLease && currentLease.startDate 
                ? (() => {
                    try {
                      return new Date(currentLease.startDate).toLocaleDateString();
                    } catch (error) {
                      console.error("Error formatting start date:", error);
                      return 'N/A';
                    }
                  })()
                : 'N/A'}
            </div>
          </div>
          <div className="border-[0.5px] border-primary-300 h-4 hidden sm:block" />
          <div className="xl:flex">
            <div className="text-gray-500 mr-2">End Date: </div>
            <div className="font-semibold">
              {isActiveLease && currentLease.endDate 
                ? (() => {
                    try {
                      return new Date(currentLease.endDate).toLocaleDateString();
                    } catch (error) {
                      console.error("Error formatting end date:", error);
                      return 'N/A';
                    }
                  })()
                : 'N/A'}
            </div>
          </div>
          <div className="border-[0.5px] border-primary-300 h-4 hidden sm:block" />
          <div className="xl:flex">
            <div className="text-gray-500 mr-2">Next Payment: </div>
            <div className="font-semibold">
              {isActiveLease && currentLease.endDate
                ? (() => {
                    try {
                      // Calculate next payment date (typically 1 month before end date)
                      const nextPaymentDate = new Date(currentLease.endDate);
                      nextPaymentDate.setMonth(nextPaymentDate.getMonth() - 1);
                      return nextPaymentDate.toLocaleDateString();
                    } catch (error) {
                      console.error("Error calculating next payment date:", error);
                      return 'N/A';
                    }
                  })()
                : 'N/A'}
            </div>
          </div>
        </div>
        <hr className="my-4" />
      </div>
      {/* Buttons */}
      <div className="flex justify-end gap-2 w-full">
        <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50">
          <User className="w-5 h-5 mr-2" />
          Manager
        </button>
        <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50">
          <Download className="w-5 h-5 mr-2" />
          Download Agreement
        </button>
      </div>
    </div>
  );
};

const BillingHistory = ({ payments }: { payments: Payment[] }) => {
  return (
    <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">Billing History</h2>
          <p className="text-sm text-gray-500">
            Download your previous plan receipts and usage details.
          </p>
        </div>
        <div>
          <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50">
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
              <TableHead>Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Billing Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} className="h-16">
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Invoice #{payment.id} -{" "}
                    {new Date(payment.paymentDate).toLocaleString("default", {
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                      payment.paymentStatus === "Paid"
                        ? "bg-green-100 text-green-800 border-green-300"
                        : "bg-yellow-100 text-yellow-800 border-yellow-300"
                    }`}
                  >
                    {payment.paymentStatus === "Paid" ? (
                      <Check className="w-4 h-4 inline-block mr-1" />
                    ) : null}
                    {payment.paymentStatus}
                  </span>
                </TableCell>
                <TableCell>
                  {new Date(payment.paymentDate).toLocaleDateString()}
                </TableCell>
                <TableCell>${payment.amountPaid.toFixed(2)}</TableCell>
                <TableCell>
                  <button className="border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center font-semibold hover:bg-primary-700 hover:text-primary-50">
                    <ArrowDownToLineIcon className="w-4 h-4 mr-1" />
                    Download
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

const Residence = () => {
  const { id } = useParams();
  const { data: authUser } = useGetAuthUserQuery();
  const {
    data: property,
    isLoading: propertyLoading,
    error: propertyError,
  } = useGetPropertyQuery(Number(id));

  const { data: leases, isLoading: leasesLoading } = useGetLeasesQuery(
    parseInt(authUser?.cognitoInfo?.userId || "0"),
    { skip: !authUser?.cognitoInfo?.userId }
  );

  // Find all leases for this property
  const propertyLeases = leases && Array.isArray(leases)
    ? leases.filter(lease => lease && lease.propertyId === Number(id))
    : [];

  // Find if current tenant has a lease for this property
  const matchingLease = propertyLeases.find(
    lease => lease.tenantCognitoId === authUser?.cognitoInfo?.userId
  );

  // Determine lease status
  let leaseStatus: 'your' | 'other' | 'available' = 'available';
  if (matchingLease) {
    leaseStatus = 'your';
  } else if (propertyLeases.length > 0) {
    leaseStatus = 'other';
  }

  // Get payments for the matching lease only
  const leaseIdForPayments = matchingLease?.id || 0;

  const { 
    data: payments, 
    isLoading: paymentsLoading,
    error: paymentsError
  } = useGetPaymentsQuery(
    leaseIdForPayments,
    { 
      skip: !authUser?.cognitoInfo?.userId || !matchingLease || leaseIdForPayments === 0
    }
  );

  // Track loading states
  const isLoadingPayments = paymentsLoading;

  // Handle the case where we have a payment error
  const hasPaymentsError = !!paymentsError;

  // Determine if we should show the empty state or not
  const showEmptyBillingState = (!isLoadingPayments && (!payments || payments.length === 0)) || hasPaymentsError;

  // Show loading state while fetching data
  if (propertyLoading || leasesLoading) return <Loading />;
  if (!property || propertyError) return <div>Error loading property</div>;

  return (
    <div className="dashboard-container">
      <div className="w-full mx-auto">
        <div className="md:flex gap-10">
          {property && (
            <ResidenceCard
              property={property}
              currentLease={matchingLease || {
                id: 0,
                rent: property.pricePerMonth || 0,
                startDate: null,
                endDate: null,
                propertyId: property.id,
                tenantId: 0
              }}
              leaseStatus={leaseStatus}
            />
          )}
          <PaymentMethod />
        </div>
        {/* Always show the billing history section */}
        {isLoadingPayments ? (
          <div className="mt-8">
            <Loading />
          </div>
        ) : !showEmptyBillingState ? (
          <BillingHistory payments={payments || []} />
        ) : (
          <div className="mt-8 bg-white rounded-xl shadow-md overflow-hidden p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold mb-1">Billing History</h2>
                <p className="text-sm text-gray-500">
                  Download your previous plan receipts and usage details.
                </p>
              </div>
              <div>
                <button className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-md flex items-center justify-center hover:bg-primary-700 hover:text-primary-50">
                  <Download className="w-5 h-5 mr-2" />
                  <span>Download All</span>
                </button>
              </div>
            </div>
            <hr className="mt-4 mb-6" />
            <div className="text-center py-8">
              {hasPaymentsError ? (
                <p className="text-amber-600">
                  Unable to load payment records. Please try again later.
                </p>
              ) : (
                <p className="text-gray-500">No payment records found for this property.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Residence;