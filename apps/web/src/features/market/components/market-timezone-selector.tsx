"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rmsm/ui";

interface TimezoneOption {
  value: string;
  city: string;
}

const TIMEZONES: readonly TimezoneOption[] = [
  { value: "Etc/UTC", city: "London" },
  { value: "Etc/GMT+12", city: "Baker Island" },
  { value: "Pacific/Pago_Pago", city: "Pago Pago" },
  { value: "Pacific/Honolulu", city: "Honolulu" },
  { value: "America/Anchorage", city: "Anchorage" },
  { value: "America/Los_Angeles", city: "Los Angeles" },
  { value: "America/Denver", city: "Denver" },
  { value: "America/Chicago", city: "Chicago" },
  { value: "America/New_York", city: "New York" },
  { value: "America/Halifax", city: "Halifax" },
  { value: "America/Sao_Paulo", city: "São Paulo" },
  { value: "Atlantic/South_Georgia", city: "South Georgia" },
  { value: "Atlantic/Azores", city: "Azores" },
  { value: "Europe/London", city: "London" },
  { value: "Europe/Berlin", city: "Berlin" },
  { value: "Europe/Athens", city: "Athens" },
  { value: "Europe/Moscow", city: "Moscow" },
  { value: "Asia/Dubai", city: "Dubai" },
  { value: "Asia/Karachi", city: "Karachi" },
  { value: "Asia/Kolkata", city: "Kolkata" },
  { value: "Asia/Kathmandu", city: "Kathmandu" },
  { value: "Asia/Dhaka", city: "Dhaka" },
  { value: "Asia/Yangon", city: "Yangon" },
  { value: "Asia/Bangkok", city: "Bangkok" },
  { value: "Asia/Singapore", city: "Singapore" },
  { value: "Asia/Tokyo", city: "Tokyo" },
  { value: "Australia/Adelaide", city: "Adelaide" },
  { value: "Australia/Sydney", city: "Sydney" },
  { value: "Pacific/Guadalcanal", city: "Honiara" },
  { value: "Pacific/Auckland", city: "Auckland" },
  { value: "Pacific/Chatham", city: "Chatham Islands" },
  { value: "Pacific/Tongatapu", city: "Nukuʻalofa" },
  { value: "Pacific/Kiritimati", city: "Kiritimati" },
];

function getUtcOffset(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());

    const offset =
      parts.find((part) => part.type === "timeZoneName")?.value ??
      "GMT";

    if (offset === "GMT" || offset === "UTC") {
      return "UTC +0";
    }

    const normalized = offset.replace(/^GMT/, "");

    const match = /^([+-])(\d{2}):(\d{2})$/.exec(
      normalized,
    );

    if (!match) {
      return "UTC +0";
    }

    const sign = match[1];
    const hours = Number(match[2]);
    const minutes = Number(match[3]);

    if (minutes === 0) {
      return `UTC ${sign}${hours}`;
    }

    return `UTC ${sign}${hours}:${String(minutes).padStart(2, "0")}`;
  } catch {
    return "UTC +0";
  }
}

function formatTimezoneLabel(option: TimezoneOption): string {
  return `${getUtcOffset(option.value)} ${option.city}`;
}

export function MarketTimezoneSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (timezone: string) => void;
}) {
  const selected =
    TIMEZONES.find((timezone) => timezone.value === value) ??
    TIMEZONES.find((timezone) => timezone.value === "Etc/UTC")!;

  return (
    <div className="flex h-6 items-center">
      <Select value={selected.value} onValueChange={onChange}>
        <SelectTrigger
          className="h-6 w-[180px] border-0 bg-transparent px-1 text-[11px] font-medium text-muted-foreground shadow-none"
          aria-label="Chart timezone"
        >
          <SelectValue>
            {formatTimezoneLabel(selected)}
          </SelectValue>
        </SelectTrigger>

        <SelectContent className="max-h-[420px]">
          {TIMEZONES.map((timezone) => (
            <SelectItem
              key={timezone.value}
              value={timezone.value}
            >
              {formatTimezoneLabel(timezone)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
