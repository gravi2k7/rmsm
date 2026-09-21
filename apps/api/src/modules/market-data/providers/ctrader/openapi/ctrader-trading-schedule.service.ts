import { Injectable, Logger } from "@nestjs/common";
import { MarketDataProviderType } from "@rmsm/database";

import { InstrumentAliasRepository } from "../../../repositories/instrument-alias.repository";
import { MarketDataProviderConfigRepository } from "../../../repositories/market-data-provider-config.repository";
import { CTraderOpenApiClient } from "./ctrader-openapi.client";

const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_WEEK = SECONDS_PER_DAY * 7;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface CTraderTradingInterval {
  readonly startSecond: number;
  readonly endSecond: number;
}

export interface CTraderTradingSchedule {
  readonly symbolId: number;
  readonly timezone: string;
  readonly intervals: readonly CTraderTradingInterval[];
  readonly fetchedAt: Date;
}

@Injectable()
export class CTraderTradingScheduleService {
  private readonly logger = new Logger(
    CTraderTradingScheduleService.name,
  );

  private readonly cache = new Map<
    number,
    CTraderTradingSchedule
  >();

  private providerId: string | null = null;

  constructor(
    private readonly client: CTraderOpenApiClient,
    private readonly aliasRepository: InstrumentAliasRepository,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
  ) {}

  /**
   * Resolves the cTrader trading schedule for an RMSM instrument.
   *
   * The providerInstrumentId stored on the canonical InstrumentAlias
   * is the cTrader symbol ID used by Open API.
   */
  async getScheduleForInstrument(
    instrumentId: string,
  ): Promise<CTraderTradingSchedule | null> {
    const providerId = await this.resolveProviderId();

    if (!providerId) {
      this.logger.warn(
        "Active cTrader provider configuration is unavailable.",
      );
      return null;
    }

    const aliases =
      await this.aliasRepository.findByInstrument(instrumentId);

    const alias = aliases.find(
      (candidate) =>
        candidate.providerId === providerId &&
        candidate.providerInstrumentId,
    );

    if (!alias?.providerInstrumentId) {
      this.logger.warn(
        `cTrader provider instrument id is missing for RMSM instrument ${instrumentId}.`,
      );
      return null;
    }

    const symbolId = Number(alias.providerInstrumentId);

    if (!Number.isSafeInteger(symbolId) || symbolId <= 0) {
      this.logger.warn(
        `Invalid cTrader provider instrument id for RMSM instrument ${instrumentId}: ${alias.providerInstrumentId}`,
      );
      return null;
    }

    return this.getSchedule(
      this.client.accountId,
      symbolId,
    );
  }

  async getSchedule(
    accountId: number,
    symbolId: number,
  ): Promise<CTraderTradingSchedule | null> {
    const cached = this.cache.get(symbolId);

    if (
      cached &&
      Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS
    ) {
      return cached;
    }

    const response = await this.client.requestSymbolDetails({
      accountId,
      symbolIds: [symbolId],
    });

    const symbol = response.symbol?.find(
      (entry) => Number(entry.symbolId) === symbolId,
    );

    if (!symbol) {
      this.logger.warn(
        `cTrader symbol details unavailable for symbol ${symbolId}.`,
      );
      return null;
    }

    if (!symbol.scheduleTimeZone) {
      this.logger.warn(
        `cTrader symbol ${symbolId} has no schedule timezone.`,
      );
      return null;
    }

    const intervals = (symbol.schedule ?? [])
      .map((interval) => ({
        startSecond: Number(interval.startSecond),
        endSecond: Number(interval.endSecond),
      }))
      .filter(
        (interval) =>
          Number.isInteger(interval.startSecond) &&
          Number.isInteger(interval.endSecond) &&
          interval.startSecond >= 0 &&
          interval.endSecond <= SECONDS_PER_WEEK &&
          interval.endSecond > interval.startSecond,
      );

    if (intervals.length === 0) {
      this.logger.warn(
        `cTrader symbol ${symbolId} has no trading schedule intervals.`,
      );
      return null;
    }

    const schedule: CTraderTradingSchedule = {
      symbolId,
      timezone: symbol.scheduleTimeZone,
      intervals,
      fetchedAt: new Date(),
    };

    this.cache.set(symbolId, schedule);

    return schedule;
  }

  /**
   * Determines whether a UTC instant falls inside one of cTrader's
   * weekly trading intervals for an RMSM instrument.
   */
  async isTradingTimeForInstrument(
    instrumentId: string,
    timestamp: Date,
  ): Promise<boolean> {
    const schedule =
      await this.getScheduleForInstrument(instrumentId);

    if (!schedule) {
      return true;
    }

    return this.isTradingTime(timestamp, schedule);
  }

  /**
   * Determines whether a UTC instant falls inside one of cTrader's
   * weekly trading intervals.
   *
   * cTrader defines schedule seconds relative to Sunday 00:00
   * in the symbol's schedule timezone.
   */
  isTradingTime(
    timestamp: Date,
    schedule: CTraderTradingSchedule,
  ): boolean {
    const secondOfWeek = this.getSecondOfWeek(
      timestamp,
      schedule.timezone,
    );

    return schedule.intervals.some(
      ({ startSecond, endSecond }) =>
        secondOfWeek >= startSecond &&
        secondOfWeek < endSecond,
    );
  }

  /**
   * Converts a UTC instant into cTrader's weekly local coordinate:
   *
   * Sunday 00:00:00 = 0
   * Monday 00:00:00 = 86400
   * ...
   * Saturday 23:59:59 = 604799
   *
   * The timezone conversion is performed using Intl so DST is respected.
   */
  getSecondOfWeek(
    timestamp: Date,
    timezone: string,
  ): number {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = Object.fromEntries(
      formatter
        .formatToParts(timestamp)
        .map((part) => [part.type, part.value]),
    );

    const weekday = this.weekdayToSundayIndex(
      parts.weekday ?? "",
    );
    const hour = Number(
      parts.hour === "24" ? "0" : parts.hour,
    );
    const minute = Number(parts.minute);
    const second = Number(parts.second);

    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      !Number.isInteger(second)
    ) {
      throw new Error(
        `Unable to determine local time in timezone "${timezone}".`,
      );
    }

    return (
      weekday * SECONDS_PER_DAY +
      hour * 60 * 60 +
      minute * 60 +
      second
    );
  }

  clearCache(): void {
    this.cache.clear();
    this.providerId = null;
  }

  private async resolveProviderId(): Promise<string | null> {
    if (this.providerId) {
      return this.providerId;
    }

    const config =
      await this.providerConfigRepository.findByType(
        MarketDataProviderType.CTRADER,
      );

    if (!config?.id) {
      return null;
    }

    this.providerId = config.id;

    return this.providerId;
  }

  private weekdayToSundayIndex(weekday: string): number {
    switch (weekday) {
      case "Sun":
        return 0;
      case "Mon":
        return 1;
      case "Tue":
        return 2;
      case "Wed":
        return 3;
      case "Thu":
        return 4;
      case "Fri":
        return 5;
      case "Sat":
        return 6;
      default:
        throw new Error(
          `Unexpected Intl weekday "${weekday}".`,
        );
    }
  }
}
