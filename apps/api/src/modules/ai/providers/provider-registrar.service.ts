import { Injectable, OnModuleInit } from "@nestjs/common";
import { AiProviderRegistryService } from "../registry/ai-provider-registry.service";
import { OpenAiProvider } from "./openai.provider";
import { OllamaProvider } from "./ollama.provider";

/**
 * Registers every provider this phase actually has (`OpenAiProvider`,
 * `OllamaProvider` — one real cloud adapter, one real local adapter,
 * proving the interface genuinely works for both) with the registry at
 * application startup — the exact same real, working
 * `OnModuleInit`-based registration AI-101's own `ProviderRegistrarService`
 * established. A future Anthropic/Gemini/Azure OpenAI/vLLM/NVIDIA
 * NIM/HuggingFace TGI adapter adds its own registration call here —
 * "implement `AiProvider`, register it, no other code changes," this
 * phase's own explicit "future providers should be pluggable" rule,
 * made concrete and testable.
 */
@Injectable()
export class AiProviderRegistrarService implements OnModuleInit {
  constructor(
    private readonly registry: AiProviderRegistryService,
    private readonly openAiProvider: OpenAiProvider,
    private readonly ollamaProvider: OllamaProvider,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.openAiProvider);
    this.registry.register(this.ollamaProvider);
  }
}
