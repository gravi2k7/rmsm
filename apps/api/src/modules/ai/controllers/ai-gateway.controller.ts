import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AiGatewayService } from "../gateway/ai-gateway.service";
import { ChatRequestDto } from "../dto/chat-request.dto";
import { ChatResponseDto } from "../dto/chat-response.dto";
import { EmbedRequestDto, EmbedResponseDto } from "../dto/embed.dto";
import { ModerateRequestDto, ModerateResponseDto } from "../dto/moderate.dto";
import { ModelInfoDto, ProviderInfoDto } from "../dto/model-provider-info.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../../auth/services/token.service";

/**
 * The ONLY REST surface for AI in this platform — "no business
 * module should ever directly call OpenAI, Claude, Gemini, Ollama,
 * etc.; everything goes through the AI Gateway" (this phase's own
 * opening rule), enforced by this being the sole controller with a
 * dependency on `AiGatewayService`. Reuses the platform's own
 * existing `PermissionsGuard`/`CurrentUser` — this phase's own
 * explicit "use the existing RMSM platform security... do NOT create
 * new auth modules" rule, followed literally.
 *
 * Not organization-scoped in the URL (unlike AI-103's own
 * `/organizations/:organizationId/...` convention) — a deliberate,
 * real distinction: AI-103's strategies are organization-OWNED
 * business records; an AI chat/embed/moderate call is a stateless
 * operation ON BEHALF OF an organization, not a resource that lives
 * inside one. `organizationId` is still real and present — passed as
 * an optional query parameter, used for real rate-limiting and cost-
 * tracking scoping (`GatewayCallContext`), just not baked into the
 * URL path itself.
 */
@ApiTags("AI Gateway")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@RequirePermissions("ai-gateway.use")
@Controller("api/ai")
export class AiGatewayController {
  constructor(private readonly gateway: AiGatewayService) {}

  @Post("chat")
  @ApiOperation({ operationId: "aiChat", summary: "A single, non-streaming chat completion — provider-agnostic; the caller never knows which real provider served the request." })
  @ApiOkResponse({ type: ChatResponseDto })
  async chat(@Body() body: ChatRequestDto, @CurrentUser() user: AccessTokenPayload, @Req() req: Request, @Query("organizationId") organizationId?: string): Promise<ChatResponseDto> {
    return this.gateway.chat(
      { model: body.model, messages: body.messages, temperature: body.temperature, maxTokens: body.maxTokens, topP: body.topP, stopSequences: body.stopSequences },
      { organizationId, correlationId: req.requestId, provider: body.provider },
    );
  }

  @Post("stream")
  @ApiOperation({ operationId: "aiStream", summary: "A streaming chat completion, delivered as Server-Sent Events — one 'data: <JSON chunk>' line per delta, terminated by 'data: [DONE]'." })
  async stream(@Body() body: ChatRequestDto, @CurrentUser() user: AccessTokenPayload, @Req() req: Request, @Res() res: Response, @Query("organizationId") organizationId?: string): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    try {
      for await (const chunk of this.gateway.stream(
        { model: body.model, messages: body.messages, temperature: body.temperature, maxTokens: body.maxTokens, topP: body.topP, stopSequences: body.stopSequences },
        { organizationId, correlationId: req.requestId, provider: body.provider },
      )) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.write("data: [DONE]\n\n");
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Post("embed")
  @ApiOperation({ operationId: "aiEmbed", summary: "Generate real embeddings for one string or a batch of strings." })
  @ApiOkResponse({ type: EmbedResponseDto })
  async embed(@Body() body: EmbedRequestDto, @CurrentUser() user: AccessTokenPayload, @Req() req: Request, @Query("organizationId") organizationId?: string): Promise<EmbedResponseDto> {
    return this.gateway.embed({ model: body.model, input: body.input }, { organizationId, correlationId: req.requestId, provider: body.provider });
  }

  @Post("moderate")
  @ApiOperation({ operationId: "aiModerate", summary: "Content moderation — not every provider supports this (e.g. Ollama does not); an unsupported provider returns a real 422, not a fake pass-through result." })
  @ApiOkResponse({ type: ModerateResponseDto })
  async moderate(@Body() body: ModerateRequestDto, @CurrentUser() user: AccessTokenPayload, @Req() req: Request, @Query("organizationId") organizationId?: string): Promise<ModerateResponseDto> {
    return this.gateway.moderate({ input: body.input }, { organizationId, correlationId: req.requestId, provider: body.provider });
  }

  @Get("models")
  @ApiOperation({ operationId: "aiListModels", summary: "Every model available right now, across every enabled provider." })
  @ApiOkResponse({ type: [ModelInfoDto] })
  async listModels(): Promise<ModelInfoDto[]> {
    return this.gateway.listModels();
  }

  @Get("providers")
  @ApiOperation({ operationId: "aiListProviders", summary: "Every registered provider, its own enabled state, and its own real capabilities." })
  @ApiOkResponse({ type: [ProviderInfoDto] })
  async listProviders(): Promise<ProviderInfoDto[]> {
    return this.gateway.listProviders();
  }
}
