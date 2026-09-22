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
          className="min-w-[76px] justify-between gap-2 border-slate-700 bg-[#0b1220] text-slate-100 hover:bg-[#111a2b] hover:text-white"
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
        side="bottom"
        sideOffset={8}
        collisionPadding={{ left: 8, right: 96, top: 8, bottom: 8 }}
        className="z-[1000] min-w-[128px] rounded-xl border border-slate-700 bg-[#0b1220] p-1 text-slate-100 shadow-2xl"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value)}
            className={`flex min-h-[40px] items-center justify-between gap-3 rounded-lg px-3 text-sm text-slate-100 focus:bg-cyan-500/15 focus:text-white data-[highlighted]:bg-cyan-500/15 data-[highlighted]:text-white ${
              option.value === value ? "bg-[#123d43] text-white" : ""
            }`}
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
