import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Profile, UserAccountSummary } from "@rmsm/database";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Get the authenticated user's account + profile." })
  me(@CurrentUser() user: AccessTokenPayload): Promise<UserAccountSummary> {
    return this.usersService.getById(user.sub);
  }

  @Get("me/profile")
  @ApiOperation({ summary: "Get the authenticated user's profile." })
  getProfile(@CurrentUser() user: AccessTokenPayload): Promise<Profile> {
    return this.usersService.getProfile(user.sub);
  }

  @Patch("me/profile")
  @ApiOperation({ summary: "Update the authenticated user's profile." })
  updateProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<Profile> {
    return this.usersService.updateProfile(user.sub, dto);
  }
}
