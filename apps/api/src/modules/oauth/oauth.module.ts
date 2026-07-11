import { Module } from "@nestjs/common";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";
import { OAuthProviderRegistry } from "./oauth-provider.registry";
import { GoogleOAuthProvider } from "./providers/google.provider";
import { GitHubOAuthProvider } from "./providers/github.provider";
import { MicrosoftOAuthProvider } from "./providers/microsoft.provider";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [OAuthController],
  providers: [
    OAuthService,
    OAuthProviderRegistry,
    GoogleOAuthProvider,
    GitHubOAuthProvider,
    MicrosoftOAuthProvider,
  ],
})
export class OAuthModule {}
