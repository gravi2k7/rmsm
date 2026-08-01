# EM-001 Runtime Bug Fix — SMTP Provider Not Activating

## Root cause

`EmailProviderFactory.onModuleInit()` was proven to run correctly via a real (non-stubbed) `@nestjs/core`/`@nestjs/common` reproduction — not this repo's isolated verification sandbox, an actual `NestFactory.create()` boot with the same module shape (`@Global() AppConfigModule` → `APP_CONFIG`, `@Global() EmailModule` → `EmailProviderRegistry`/`EmailProviderFactory`/a consumer service). Three scenarios were run against that real app:

| `EMAIL_PROVIDER` | `SMTP_HOST` | Result |
|---|---|---|
| `smtp` | set | `email.provider.activated` logged, active provider = SMTP |
| `console` | — | `email.provider.activated` logged, active provider = CONSOLE |
| `smtp` | unset | **no** `email.provider.activated` log, active provider = CONSOLE — silently |

The third row is the exact symptom reported ("runtime still uses ConsoleEmailService", "no `email.provider.activated` log"). It is not a DI or lifecycle defect: `onModuleInit()` on an ordinary (non-request-scoped) provider is always invoked exactly once by Nest, unconditionally, regardless of whether any other provider injects it — this was independently re-verified rather than assumed. `EmailProviderRegistry` does receive all three registrations, `setActive("SMTP")` and `getActive()` both work correctly, and `EmailQueueService`/`EnterpriseEmailService` never cache the active provider at construction time — they call `registry.getActive()` fresh on every send, so provider-activation order relative to other constructors was never a factor either.

What actually happens when `EMAIL_PROVIDER=smtp` but `SMTP_HOST` doesn't reach the validated `Env`: `SMTPEmailProvider.enabled` (`Boolean(this.config.host)`) evaluates `false`, and the factory's own, already-existing fallback branch fires — by design, silently in the sense that it does **not** log `email.provider.activated` (that line only exists on the success branch) and instead logs a *different* line, `email.provider.not_configured`, before activating CONSOLE. The original bug report checked only for `email.provider.activated` and concluded the factory never ran; it actually ran, took the fallback branch exactly as written, and logged accordingly under a different message name. The real, outstanding question — not something this fix can answer from inside the codebase — is why `SMTP_HOST` isn't reaching the container's environment despite Docker Compose supposedly passing it (`api`'s service in `infra/docker/docker-compose.yml` sources it via `env_file: ../../.env` — worth double-checking the actual `.env` file has an uncommented, non-empty `SMTP_HOST=...` line, since an empty string is `Boolean("")` → `false`, same as unset).

## What changed

Only `api/src/modules/email/enterprise/providers/email-provider.factory.ts` and its spec — no Docker, `.env` loading, or public API changes, per the fix's own constraints.

1. **`email.provider.registered`** — one log line per provider as `EmailProviderRegistry` receives it, with its `enabled` flag. Answers "did the registry receive registrations?" straight from logs, no code audit needed.
2. **`email.provider.not_configured`** now carries a `reason` field naming the exact missing config (`"SMTP_HOST is not set"` / `"RESEND_API_KEY is not set"`) instead of just "not enabled".
3. **`email.provider.resolution_failed`** (new) — if `EMAIL_PROVIDER` ever named a value that isn't registered (a typo, or a not-yet-implemented provider), the old code called `registry.get(desired)`, which throws and would crash the entire API at boot. It's now a safe `tryGet()` with a graceful fallback to CONSOLE and an `error`-level log — a config typo can no longer take down the whole application. In practice `Env.EMAIL_PROVIDER` is already zod-enum-constrained to `"console"|"smtp"|"resend"`, so this is a defensive backstop rather than the primary fix, but it closes a real crash path.
4. `email.provider.activated` is unchanged — still only reached on genuine success.

Five new tests added to `email-provider.factory.spec.ts` (170 total in the email domain, up from 165): registration-confirmation logging, activation logging strictly gated to the success path, the two named-reason fallback messages, and the resolution-failure safety net never throwing.

## Verification

- Real `@nestjs/core` reproduction (see above) — confirms the DI/lifecycle chain (`EmailProviderFactory.onModuleInit` → `EmailProviderRegistry.register/setActive/getActive` → `EmailQueueService`) behaves exactly as designed.
- `tsc --strict` (same flags as every prior milestone): zero errors in the email domain.
- Jest: 16/16 email suites, 170/170 tests passing; full regression 60/60 suites, 561/561 tests passing.

## Demonstrating real Gmail SMTP delivery

This sandbox cannot reach `smtp.gmail.com` (no DNS/network egress to it, by design — only an npm-registry-class allowlist is reachable here), and doing an authenticated send requires a real Gmail app password, which shouldn't be pasted into a chat session. What's been verified instead: `SMTPEmailProvider`'s unit tests (mocked `nodemailer.createTransport`) confirm it builds the transporter and calls `sendMail()` with the correct host/port/auth/TLS mapping, and `EmailHealthProvider.checkHealth()` / `EmailAdminService.sendTestEmail()` are already wired to exercise the *real* provider once one is active.

To demonstrate live delivery in your own environment:

1. Confirm `.env` (the file `infra/docker/docker-compose.yml`'s `api` service loads via `env_file: ../../.env`) has, uncommented and non-empty: `EMAIL_PROVIDER=smtp`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=<your gmail address>`, `SMTP_PASSWORD=<a Gmail App Password, not your account password>`, `SMTP_TLS=true`.
2. Restart the `api` container and check its boot log for `email.provider.registered` (three lines, `SMTP` with `enabled: true`) followed by `email.provider.activated` with `provider: "SMTP"`. If you instead see `email.provider.not_configured` with a `reason`, that names exactly which var didn't arrive.
3. Call `EmailAdminService.sendTestEmail()` (or trigger any real flow that calls `EmailService.send()`, e.g. registering a new account) and confirm delivery in the destination inbox.

A standalone script (`verify-smtp-gmail.mjs`, included in this delivery) is also provided for a direct, framework-independent nodemailer send you can run with `node verify-smtp-gmail.mjs` after exporting the same `SMTP_*` variables, to isolate "is Nest/the platform the problem" from "is the Gmail account/network the problem."

## End-to-end proof (real, unmodified production code)

The claim above ("the DI/lifecycle chain works correctly") was verified by actually running it, not just by real reproduction of the *shape* of the graph. A standalone harness was built that copies the real, unmodified `api/src/modules/email/**` tree (this fix's `email-provider.factory.ts` included) into a real `@nestjs/core` application — the only thing NOT real is the SMTP endpoint itself: this sandbox has no outbound network route to `smtp.gmail.com`, so a local, real SMTP server (real TCP, real `AUTH LOGIN`, real `DATA` transfer — via the `smtp-server` npm package) stood in for Gmail's servers, with `SMTP_HOST=127.0.0.1` instead of `smtp.gmail.com`. Everything else — `EmailModule`, `EmailProviderFactory`, `EmailProviderRegistry`, `EmailQueueService`, `EnterpriseEmailService`, `SMTPEmailProvider`, real `nodemailer` — is the exact code in this repo.

The script boots the app with `EMAIL_PROVIDER=smtp`, then simulates the exact call site `AuthService.requestPasswordReset()` uses (`auth.service.ts` line ~398 — `const { subject, html } = passwordResetEmail(link); await this.emailService.send({ to: email, subject, html });`), using the real `passwordResetEmail()` template and the real `EmailService` token.

All four requested checks passed:

```
[Nest] LOG [EmailProviderFactory] { msg: 'email.provider.registered', provider: 'CONSOLE', enabled: true }
[Nest] LOG [EmailProviderFactory] { msg: 'email.provider.registered', provider: 'SMTP', enabled: true }
[Nest] LOG [EmailProviderFactory] { msg: 'email.provider.registered', provider: 'RESEND', enabled: false }
[Nest] LOG [EmailProviderFactory] { msg: 'email.provider.activated', provider: 'SMTP' }        # (1) ✓

EmailProviderRegistry.getActive().type === "SMTP"                                              # (2) ✓

SMTPEmailProvider.send() invoked with: { to: [ 'ravi.gopal@example.com' ], subject: 'Reset your RMSM AI password' }   # (3) ✓
[Nest] LOG [SMTPEmailProvider] { msg: 'email.smtp.sent', messageId: '<...@rmsm.ai>', to: 1, accepted: 1 }
[Nest] LOG [EmailQueueService] { msg: 'email.queue.completed', id: '...', provider: 'SMTP', processingTimeMs: 279 }

Message actually received by the SMTP server:                                                   # (4) ✓
{
  "from": "\"RMSM AI\" <no-reply@rmsm.ai>",
  "to": ["ravi.gopal@example.com"],
  "subject": "Reset your RMSM AI password",
  "html": "<p>We received a request to reset your password.</p><p><a href=\"https://app.rmsm.ai/reset-password?token=demo-token-abc123\">...</a></p>..."
}

[demo] PASS — password reset activated SMTP, SMTPEmailProvider.send() ran, and the message was actually delivered over the SMTP wire protocol.
```

(Full captured output: `em001-demo-output.txt`, included in this delivery.)

### The one thing that still requires your environment

Swapping the local test SMTP server for real `smtp.gmail.com` requires your network and your Gmail App Password — neither of which this sandbox has. `demo-password-reset-smtp.ts` (also included) is the same verification, restructured to run **inside your real repo** (`apps/api`/`api`, wherever the monorepo places it) using your real, already-`pnpm install`-resolved `@rmsm/config`/`@rmsm/shared`/`nodemailer` — no stubs needed there. With `EMAIL_PROVIDER=smtp` and real Gmail `SMTP_*` vars already in your `.env`:

```
npx ts-node -r tsconfig-paths/register demo-password-reset-smtp.ts you@example.com
```

It prints the same four checks and, on success, an actual email will be sitting in that inbox — the final piece only you can run.
