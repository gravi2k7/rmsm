import { ok, err, type Result } from "@rmsm/core";
import type { SymbolRepository } from "../repositories/symbol.repository";
import type { SymbolCode } from "../value-objects/symbol-code";
import type { MarketSymbol } from "../entities/symbol";
import type { Volume } from "../value-objects/volume";
import { UnknownSymbolError, InvalidVolumeError } from "../errors/market.errors";

/**
 * Domain service for symbol lookup/validation — depends on
 * `SymbolRepository` (an interface, injected via constructor), never on
 * any concrete persistence technology. Pure domain logic: no HTTP, no
 * database client, no infrastructure code, per this package's own design
 * rules.
 */
export class SymbolService {
  constructor(private readonly symbolRepository: SymbolRepository) {}

  async getByCode(code: SymbolCode): Promise<Result<MarketSymbol, UnknownSymbolError>> {
    const symbol = await this.symbolRepository.findByCode(code);
    if (!symbol) return err(new UnknownSymbolError(code.value));
    return ok(symbol);
  }

  /** Validates that `volume` is tradable for the given symbol — a
   * genuine domain rule (each symbol defines its own min/max), not
   * infrastructure validation. */
  async validateVolume(code: SymbolCode, volume: Volume): Promise<Result<true, UnknownSymbolError | InvalidVolumeError>> {
    const symbolResult = await this.getByCode(code);
    if (!symbolResult.ok) return symbolResult;

    const symbol = symbolResult.value;
    if (!symbol.isVolumeAllowed(volume)) {
      return err(
        new InvalidVolumeError(
          `${volume.units} is outside ${code.value}'s tradable range [${symbol.minVolume.units}, ${symbol.maxVolume.units}].`,
        ),
      );
    }
    return ok(true);
  }
}
