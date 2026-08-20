"use client";

import {
  Check,
  ChevronDown,
} from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rmsm/ui";

export interface MarketTimeframeOption<T extends string = string> {
  value: T;
  label: string;
}

interface MarketTimeframeMenuProps<T extends string> {
  value: T;
  options: readonly MarketTimeframeOption<T>[];
  onChange: (value: T) => void;
}

export function MarketTimeframeMenu<T extends string>({
  value,
  options,
  onChange,
}: MarketTimeframeMenuProps<T>) {
  const selected = options.find(
    (option) => option.value === value,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label="Chart timeframe"
          className="min-w-[76px] justify-between gap-2"
        >
          <span>{selected?.label ?? "Timeframe"}</span>
          <ChevronDown
            className="h-3.5 w-3.5 opacity-70"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-[140px]"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value)}
            className="flex items-center justify-between gap-3"
          >
            <span>{option.label}</span>

            {option.value === value && (
              <Check
                className="h-4 w-4"
                aria-hidden="true"
              />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
