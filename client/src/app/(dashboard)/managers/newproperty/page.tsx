"use client";

import { CustomFormField } from "@/components/FormField";
import Header from "@/components/Header";
import { Form } from "@/components/ui/form";
import { PropertyFormData, propertySchema } from "@/lib/schemas";
import { useCreatePropertyMutation, useGetAuthUserQuery } from "@/state/api";
import { AmenityEnum, HighlightEnum, PropertyTypeEnum } from "@/lib/constants";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import MapWithPin from "@/components/MapWithPin";
import MultiSelect from "@/components/MultiSelect";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const NewProperty = () => {
  const [createProperty] = useCreatePropertyMutation();
  const { data: authUser } = useGetAuthUserQuery();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationData, setLocationData] = useState({
    coordinates: [77.5946, 12.9716] as [number, number],
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
  });

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: "",
      description: "",
      pricePerMonth: 1000,
      securityDeposit: 500,
      applicationFee: 100,
      isPetsAllowed: true,
      isParkingIncluded: true,
      photoUrls: [],
      amenities: [],
      highlights: [],
      beds: 1,
      baths: 1,
      squareFeet: 1000,
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      coordinates: [77.5946, 12.9716],
    },
  });

  const resetForm = () => {
    form.reset({
      name: "",
      description: "",
      pricePerMonth: 1000,
      securityDeposit: 500,
      applicationFee: 100,
      isPetsAllowed: true,
      isParkingIncluded: true,
      photoUrls: [],
      amenities: [],
      highlights: [],
      beds: 1,
      baths: 1,
      squareFeet: 1000,
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      coordinates: [77.5946, 12.9716],
    });
    
    setLocationData({
      coordinates: [77.5946, 12.9716] as [number, number],
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    });
  };

  const handleManualReset = () => {
    const confirmed = window.confirm(
      "Are you sure you want to reset the form? All entered data will be lost."
    );
    if (confirmed) {
      resetForm();
      toast.info("Form has been reset.", {
        duration: 3000,
      });
    }
  };

  const onSubmit = async (data: PropertyFormData) => {
    if (!authUser?.cognitoInfo?.userId) {
      toast.error("No manager ID found");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Form data being submitted:", data);
      
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        console.log(`Processing field ${key}:`, value, typeof value);
        
        if (key === "photoUrls") {
          const files = value as File[];
          files.forEach((file: File) => {
            formData.append("photos", file);
          });
        } else if (key === "coordinates") {
          formData.append(key, JSON.stringify(value));
        } else if (key === "amenities" || key === "highlights") {
          // Ensure amenities and highlights are sent as comma-separated strings
          const stringValue = Array.isArray(value) ? value.join(",") : String(value);
          console.log(`Converting ${key} to string:`, stringValue);
          formData.append(key, stringValue);
        } else if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      });

      formData.append("managerCognitoId", authUser.cognitoInfo.userId);

      // Log the FormData contents
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const result = await createProperty(formData);
      console.log("Property created successfully:", result);
      
      // Show success notification
      toast.success("Property created successfully!", {
        description: "Your property has been added to the listings.",
        duration: 5000,
      });
      
      // Reset the form
      resetForm();
      
      // Ask user if they want to create another property or go to properties page
      const shouldRedirect = window.confirm(
        "Property created successfully! Would you like to go to the properties page to view all your listings?"
      );
      
      if (shouldRedirect) {
        router.push('/managers/properties');
      } else {
        // Show a toast that they can create another property
        toast.info("Form reset. You can create another property or navigate to the properties page.", {
          duration: 3000,
        });
      }
      
    } catch (error: any) {
      console.error("Error creating property:", error);
      
      // Handle different types of errors
      let errorMessage = "Failed to create property";
      
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.error) {
        errorMessage = error.error;
      }
      
      // Show error notification
      toast.error("Failed to create property", {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationChange = (newLocationData: any) => {
    setLocationData(newLocationData);
    
    // Update form fields with location data
    form.setValue("address", newLocationData.address);
    form.setValue("city", newLocationData.city);
    form.setValue("state", newLocationData.state);
    form.setValue("country", newLocationData.country);
    form.setValue("postalCode", newLocationData.postalCode);
    form.setValue("coordinates", newLocationData.coordinates);
  };

  return (
    <div className="dashboard-container">
      <Header
        title="Add New Property"
        subtitle="Create a new property listing with detailed information"
      />
      <div className="bg-white rounded-xl p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-4 space-y-10"
          >
            {/* Basic Information */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              <div className="space-y-4">
                <CustomFormField name="name" label="Property Name" />
                <CustomFormField
                  name="description"
                  label="Description"
                  type="textarea"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Fees */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Fees</h2>
              <CustomFormField
                name="pricePerMonth"
                label="Price per Month"
                type="number"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomFormField
                  name="securityDeposit"
                  label="Security Deposit"
                  type="number"
                />
                <CustomFormField
                  name="applicationFee"
                  label="Application Fee"
                  type="number"
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Property Details */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold mb-4">Property Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CustomFormField
                  name="beds"
                  label="Number of Beds"
                  type="number"
                />
                <CustomFormField
                  name="baths"
                  label="Number of Baths"
                  type="number"
                />
                <CustomFormField
                  name="squareFeet"
                  label="Square Feet"
                  type="number"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <CustomFormField
                  name="isPetsAllowed"
                  label="Pets Allowed"
                  type="switch"
                />
                <CustomFormField
                  name="isParkingIncluded"
                  label="Parking Included"
                  type="switch"
                />
              </div>
              <div className="mt-4">
                <CustomFormField
                  name="propertyType"
                  label="Property Type"
                  type="select"
                  options={Object.keys(PropertyTypeEnum).map((type) => ({
                    value: type,
                    label: type,
                  }))}
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Amenities and Highlights */}
            <div>
              <h2 className="text-lg font-semibold mb-4">
                Amenities and Highlights
              </h2>
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="amenities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amenities</FormLabel>
                      <MultiSelect
                        options={Object.keys(AmenityEnum).map((amenity) => ({
                          value: amenity,
                          label: amenity,
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select amenities..."
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="highlights"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Highlights</FormLabel>
                      <MultiSelect
                        options={Object.keys(HighlightEnum).map((highlight) => ({
                          value: highlight,
                          label: highlight,
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select highlights..."
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Photos */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Photos</h2>
              <CustomFormField
                name="photoUrls"
                label="Property Photos"
                type="file"
                accept="image/*"
              />
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Location - Map with Pin */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Property Location</h2>
              <p className="text-sm text-gray-600 mb-4">
                Pin the exact location of your property on the map. The address fields will be automatically filled, but you can edit them manually if needed.
              </p>
              <MapWithPin
                value={locationData}
                onChange={handleLocationChange}
              />
            </div>

            <div className="flex gap-4 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleManualReset}
                className="flex-1"
                disabled={isSubmitting}
              >
                Reset Form
              </Button>
              <Button
                type="submit"
                className="bg-primary-700 text-white flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Property"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default NewProperty;