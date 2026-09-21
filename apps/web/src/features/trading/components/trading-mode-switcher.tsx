"use client";

export type TradingMode =
  | "QUICK"
  | "ORDER"
  | "DOM";

interface TradingModeSwitcherProps {
  value: TradingMode;
  onChange: (mode: TradingMode) => void;
}

const modes: Array<{
  value: TradingMode;
  label: string;
}> = [
  {
    value: "ORDER",
    label: "Order",
  },
  {
    value: "DOM",
    label: "DOM",
  },
];

export function TradingModeSwitcher({
  value,
  onChange,
}: TradingModeSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Trading mode"
      className="flex w-full items-stretch"
    >
      {modes.map((mode) => {
        const active = value === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode.value)}
            className={[
              "flex-1 rounded-none px-3 py-2 text-xs font-medium transition-colors",
              active
                ? "bg-success text-success-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            ].join(" ")}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
