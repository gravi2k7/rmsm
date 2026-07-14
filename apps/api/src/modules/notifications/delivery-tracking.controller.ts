import { Controller, Get, Param, ParseUUIDPipe, Query, Redirect, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response as ExpressResponse } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ValidationError } from "@rmsm/shared";
import { TrackingService, DeliveryStats } from "./services/tracking.service";
import { Public } from "../auth/decorators/public.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../organizations/guards/organization-role.guard";
import { NOTIFICATION_READ_ROLES } from "./constants";

/** A 1x1 transparent GIF, base64-decoded once at module load — the standard email open-tracking mechanism, working for any email client regardless of whether the provider itself reports opens (Phase 2c's inbound webhook path only covers providers that report opens server-side; this works universally). */
const TRANSPARENT_PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7",
  "base64",
);

/**
 * Real, working delivery tracking — open pixel and click redirect, both
 * public (an email client fetching an embedded image, or a recipient
 * clicking a link, presents no RMSM JWT). Distinct from Phase 2c's inbound
 * WebhookController, which handles PROVIDER-reported events; this is the
 * universal fallback that works regardless of provider support.
 */
@ApiTags("Delivery Tracking")
@Controller("notifications/track")
export class DeliveryTrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Get("open/:deliveryId")
  @ApiOperation({ operationId: "trackOpen", summary: "Records an email open and returns a 1x1 transparent tracking pixel. Embedded as an <img> src in HTML emails." })
  async trackOpen(@Param("deliveryId", ParseUUIDPipe) deliveryId: string, @Res() res: ExpressResponse): Promise<void> {
    // Never fails the response even if the delivery id is stale/invalid —
    // a broken tracking pixel would be visibly wrong in the recipient's
    // email client, which matters more than surfacing a 404 nobody sees.
    try {
      await this.trackingService.recordOpen(deliveryId);
    } catch {
      // Intentionally swallowed — see comment above.
    }
    res.set({ "Content-Type": "image/gif", "Content-Length": String(TRANSPARENT_PIXEL_GIF.length), "Cache-Control": "no-store" });
    res.status(200).send(TRANSPARENT_PIXEL_GIF);
  }

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Get("click/:deliveryId")
  @Redirect()
  @ApiOperation({ operationId: "trackClick", summary: "Records a link click and redirects to the real destination URL. Links in an HTML email are rewritten to point here first." })
  async trackClick(
    @Param("deliveryId", ParseUUIDPipe) deliveryId: string,
    @Query("url") url: string,
  ): Promise<{ url: string; statusCode: number }> {
    if (!url) throw new ValidationError("Missing target url query parameter.");
    try {
      await this.trackingService.recordClick(deliveryId, url);
    } catch {
      // Same reasoning as trackOpen — always redirect, even if tracking
      // itself failed; a broken link is worse than a missed click event.
    }
    return { url, statusCode: 302 };
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @Get("organizations/:organizationId/notifications/:notificationId/stats")
  @RequirePermissions("notification.read")
  @RequireOrgRole(...NOTIFICATION_READ_ROLES)
  @ApiOperation({ operationId: "getDeliveryStats", summary: "Get sent/delivered/opened/clicked/bounced counts for a notification." })
  getStats(
    @Param("organizationId", ParseUUIDPipe) _organizationId: string,
    @Param("notificationId", ParseUUIDPipe) notificationId: string,
  ): Promise<DeliveryStats> {
    return this.trackingService.getDeliveryStats(notificationId);
  }
}
