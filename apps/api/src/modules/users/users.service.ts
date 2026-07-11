import { Injectable } from "@nestjs/common";
import { prisma, Profile, UserAccountSummary } from "@rmsm/database";
import { NotFoundError } from "@rmsm/shared";
import type { UpdateProfileDto } from "./dto/update-profile.dto";

@Injectable()
export class UsersService {
  async getProfile(userId: string): Promise<Profile> {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundError("Profile", userId);
    return profile;
  }

  updateProfile(userId: string, dto: UpdateProfileDto): Promise<Profile> {
    return prisma.profile.update({ where: { userId }, data: dto });
  }

  async getById(userId: string): Promise<UserAccountSummary> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true, emailVerifiedAt: true, createdAt: true, profile: true },
    });
    if (!user) throw new NotFoundError("User", userId);
    return user;
  }
}
