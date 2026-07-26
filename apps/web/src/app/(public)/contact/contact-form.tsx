"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Send, RotateCcw } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@rmsm/ui";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Singapore",
  "Japan",
  "United Arab Emirates",
  "India",
  "Other",
];

const ORGANIZATION_SIZES = ["1–50 employees", "51–200 employees", "201–1,000 employees", "1,000+ employees"];

const SUBJECTS = [
  "Contact Sales",
  "Request a Product Demo",
  "Ask Technical Questions",
  "Discuss Enterprise Licensing",
  "Request Partnerships",
  "General Enquiry",
];

const schema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  company: z.string().min(1, "Company is required."),
  jobTitle: z.string().min(1, "Job title is required."),
  businessEmail: z.string().min(1, "Business email is required.").email("Enter a valid email address."),
  phone: z.string().optional(),
  country: z.string().min(1, "Please select a country."),
  organizationSize: z.string().min(1, "Please select an organization size."),
  subject: z.string().min(1, "Please select a subject."),
  message: z.string().min(20, "Please provide at least 20 characters."),
  consent: z.boolean().refine((v) => v === true, { message: "You must agree before submitting." }),
});

type ContactFormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: ContactFormValues = {
  firstName: "",
  lastName: "",
  company: "",
  jobTitle: "",
  businessEmail: "",
  phone: "",
  country: "",
  organizationSize: "",
  subject: "",
  message: "",
  consent: false,
};

/**
 * Contact Form (Section 3). Frontend-only per the spec — client-side
 * validation with `react-hook-form` + `zod` (the same pattern already
 * established by `CreateOrderDialog`), no API calls. On successful
 * validation this shows a local, client-only success message and resets
 * the form; nothing is transmitted anywhere, since there's no backend
 * endpoint for this milestone to call.
 */
export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  function onSubmit() {
    // No backend implementation in this milestone — validation succeeding
    // is the entire "submission," per the spec's "frontend only" / "no API
    // calls" constraints.
    setSubmitted(true);
    reset();
  }

  function handleReset() {
    reset();
    setSubmitted(false);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {submitted ? (
          <Alert variant="success" className="mb-6">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <AlertDescription>Thanks — your request has been received. Our team will be in touch.</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? "firstName-error" : undefined}
                {...register("firstName")}
              />
              {errors.firstName && (
                <p id="firstName-error" role="alert" className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? "lastName-error" : undefined}
                {...register("lastName")}
              />
              {errors.lastName && (
                <p id="lastName-error" role="alert" className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                aria-invalid={!!errors.company}
                aria-describedby={errors.company ? "company-error" : undefined}
                {...register("company")}
              />
              {errors.company && (
                <p id="company-error" role="alert" className="text-sm text-destructive">
                  {errors.company.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job title</Label>
              <Input
                id="jobTitle"
                aria-invalid={!!errors.jobTitle}
                aria-describedby={errors.jobTitle ? "jobTitle-error" : undefined}
                {...register("jobTitle")}
              />
              {errors.jobTitle && (
                <p id="jobTitle-error" role="alert" className="text-sm text-destructive">
                  {errors.jobTitle.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessEmail">Business email</Label>
              <Input
                id="businessEmail"
                type="email"
                aria-invalid={!!errors.businessEmail}
                aria-describedby={errors.businessEmail ? "businessEmail-error" : undefined}
                {...register("businessEmail")}
              />
              {errors.businessEmail && (
                <p id="businessEmail-error" role="alert" className="text-sm text-destructive">
                  {errors.businessEmail.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" type="tel" {...register("phone")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Controller
                control={control}
                name="country"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="country" aria-invalid={!!errors.country} aria-describedby={errors.country ? "country-error" : undefined}>
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.country && (
                <p id="country-error" role="alert" className="text-sm text-destructive">
                  {errors.country.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationSize">Organization size</Label>
              <Controller
                control={control}
                name="organizationSize"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="organizationSize"
                      aria-invalid={!!errors.organizationSize}
                      aria-describedby={errors.organizationSize ? "organizationSize-error" : undefined}
                    >
                      <SelectValue placeholder="Select an organization size" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORGANIZATION_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.organizationSize && (
                <p id="organizationSize-error" role="alert" className="text-sm text-destructive">
                  {errors.organizationSize.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Controller
              control={control}
              name="subject"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="subject" aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "subject-error" : undefined}>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.subject && (
              <p id="subject-error" role="alert" className="text-sm text-destructive">
                {errors.subject.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              rows={5}
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? "message-error" : undefined}
              {...register("message")}
            />
            {errors.message && (
              <p id="message-error" role="alert" className="text-sm text-destructive">
                {errors.message.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Controller
                control={control}
                name="consent"
                render={({ field }) => (
                  <Checkbox
                    id="consent"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-invalid={!!errors.consent}
                    aria-describedby={errors.consent ? "consent-error" : undefined}
                  />
                )}
              />
              <Label htmlFor="consent" className="text-sm font-normal leading-snug">
                I agree to be contacted by RMSM regarding my enquiry.
              </Label>
            </div>
            {errors.consent && (
              <p id="consent-error" role="alert" className="text-sm text-destructive">
                {errors.consent.message}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit">
              <Send className="mr-2 h-4 w-4" aria-hidden="true" />
              Submit Request
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
