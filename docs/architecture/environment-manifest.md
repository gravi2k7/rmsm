# RMSM Environment Manifest

Auto-generated.

| Variable | Type | Required | Default |
|----------|------|----------|---------|
| ACCOUNT_LOCKOUT_DURATION_MS | number | No | 900000 |
| ACCOUNT_LOCKOUT_MAX_ATTEMPTS | number | No | 5 |
| ADMIN_PORT | number | No | 3002 |
| AI_GATEWAY_CIRCUIT_COOLDOWN_MS | number | No | 30000 |
| AI_GATEWAY_CIRCUIT_FAILURE_THRESHOLD | number | No | 5 |
| AI_GATEWAY_DEFAULT_CHAT_MODEL | string | No | llama3 |
| AI_GATEWAY_DEFAULT_EMBED_MODEL | string | No | llama3 |
| AI_GATEWAY_DEFAULT_PROVIDER | string | No | ollama |
| AI_GATEWAY_FALLBACK_PROVIDER | string | No |  |
| AI_GATEWAY_MAX_RETRIES | number | No | 2 |
| AI_GATEWAY_RATE_LIMIT_PER_MINUTE | number | No | 60 |
| AI_GATEWAY_REQUEST_TIMEOUT_MS | number | No | 30000 |
| AI_GATEWAY_RETRY_BASE_DELAY_MS | number | No | 300 |
| AI_PORT | number | No | 8000 |
| AI_SERVICE_API_KEY | string | No |  |
| AI_SERVICE_URL | string | No | http://localhost:8000 |
| ALPHA_VANTAGE_API_KEY | string | No |  |
| ALPHA_VANTAGE_BASE_URL | string | No | https://www.alphavantage.co |
| ALPHA_VANTAGE_RATE_LIMIT | number | No | 5 |
| ALPHA_VANTAGE_TIMEOUT | number | No | 10000 |
| API_PORT | number | No | 3001 |
| APP_ENV | enum | No | local |
| COINGECKO_API_KEY | string | No |  |
| COINGECKO_BASE_URL | string | No | https://api.coingecko.com/api/v3 |
| COOKIE_SECRET | string | No | dev-cookie-secret-change-me!! |
| CORS_ALLOWED_ORIGINS | string | Yes |  |
| DATABASE_URL | ZodUnion | Yes |  |
| EMAIL_CACHE_TTL_MS | number | No | 300000 |
| EMAIL_FROM | string | No | RMSM AI <no-reply@rmsm.ai> |
| EMAIL_PROVIDER | enum | No | console |
| EMAIL_QUEUE_ENABLED | string | Yes |  |
| EMAIL_RETRY_COUNT | number | No | 5 |
| EMAIL_RETRY_DELAY_MS | number | No | 1000 |
| EMAIL_TIMEOUT | number | No | 10000 |
| EMAIL_VERIFICATION_TTL_MS | number | No | 86400000 |
| FEATURE_FLAGS | string | Yes |  |
| JWT_ACCESS_SECRET | string | Yes |  |
| JWT_ACCESS_TTL | string | No | 15m |
| JWT_REFRESH_SECRET | string | Yes |  |
| JWT_REFRESH_TTL | string | No | 7d |
| LOG_FORMAT | enum | No | json |
| LOG_LEVEL | enum | No | info |
| MARKET_DATA_CACHE_TTL_MS | number | No | 5000 |
| MARKET_DATA_MAX_CONCURRENT_REQUESTS | number | No | 10 |
| MARKET_DATA_REQUEST_TIMEOUT_MS | number | No | 10000 |
| MARKET_DATA_SYNC_INTERVAL_MS | number | No | 60000 |
| MOCK_WEBHOOK_SECRET | string | No | mock-webhook-secret-dev-only |
| MT5_ENABLED | string | Yes |  |
| MT5_GATEWAY_URL | string | No | http://localhost:8222 |
| MT5_HEARTBEAT | number | No | 30 |
| MT5_LOGIN | string | No |  |
| MT5_MAX_RETRY | number | No | 5 |
| MT5_PASSWORD | string | No |  |
| MT5_RECONNECT | string | Yes |  |
| MT5_SERVER | string | No |  |
| MT5_TERMINAL_PATH | string | No |  |
| MT5_TIMEOUT | number | No | 10000 |
| NODE_ENV | enum | No | development |
| NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY | string | No | 1111111111111111111111111111111111111111111111111111111111111111 |
| OAUTH_GITHUB_CALLBACK_URL | string | No |  |
| OAUTH_GITHUB_CLIENT_ID | string | No |  |
| OAUTH_GITHUB_CLIENT_SECRET | string | No |  |
| OAUTH_GOOGLE_CALLBACK_URL | string | No |  |
| OAUTH_GOOGLE_CLIENT_ID | string | No |  |
| OAUTH_GOOGLE_CLIENT_SECRET | string | No |  |
| OAUTH_MICROSOFT_CALLBACK_URL | string | No |  |
| OAUTH_MICROSOFT_CLIENT_ID | string | No |  |
| OAUTH_MICROSOFT_CLIENT_SECRET | string | No |  |
| OLLAMA_BASE_URL | string | No | http://localhost:11434 |
| OPENAI_API_KEY | string | No |  |
| OPENAI_BASE_URL | string | No | https://api.openai.com/v1 |
| OTEL_EXPORTER_OTLP_ENDPOINT | string | No |  |
| OTEL_SERVICE_NAME | string | No |  |
| PASSWORD_MIN_LENGTH | number | No | 12 |
| PASSWORD_RESET_TTL_MS | number | No | 3600000 |
| PAYPAL_API_BASE | string | No | https://api-m.sandbox.paypal.com |
| PAYPAL_CLIENT_ID | string | No |  |
| PAYPAL_CLIENT_SECRET | string | No |  |
| PAYPAL_WEBHOOK_ID | string | No |  |
| RATE_LIMIT_MAX | number | No | 100 |
| RATE_LIMIT_TTL_MS | number | No | 60000 |
| RAZORPAY_API_BASE | string | No | https://api.razorpay.com/v1 |
| RAZORPAY_KEY_ID | string | No |  |
| RAZORPAY_KEY_SECRET | string | No |  |
| RAZORPAY_WEBHOOK_SECRET | string | No |  |
| REDIS_URL | string | Yes |  |
| RESEND_API_KEY | string | No |  |
| SMTP_HOST | string | No |  |
| SMTP_MAX_CONNECTIONS | number | No | 5 |
| SMTP_PASSWORD | string | No |  |
| SMTP_POOL | string | Yes |  |
| SMTP_PORT | number | No |  |
| SMTP_TLS | string | Yes |  |
| SMTP_USER | string | No |  |
| STRATEGY_OUTBOX_BATCH_SIZE | number | No | 20 |
| STRATEGY_OUTBOX_MAX_RETRIES | number | No | 5 |
| STRATEGY_OUTBOX_POLL_INTERVAL_MS | number | No | 5000 |
| STRATEGY_OUTBOX_PUBLISHER_ENABLED | string | Yes |  |
| STRIPE_API_BASE | string | No | https://api.stripe.com/v1 |
| STRIPE_SECRET_KEY | string | No |  |
| STRIPE_WEBHOOK_SECRET | string | No |  |
| TWELVE_DATA_API_KEY | string | No |  |
| TWELVE_DATA_BASE_URL | string | No | https://api.twelvedata.com |
| TWELVE_DATA_RETRY_COUNT | number | No | 3 |
| TWELVE_DATA_RETRY_DELAY | number | No | 500 |
| TWELVE_DATA_TIMEOUT | number | No | 10000 |
| TWO_FACTOR_ENCRYPTION_KEY | string | No | 0000000000000000000000000000000000000000000000000000000000000000 |
| TWO_FACTOR_ISSUER | string | No | RMSM AI |
| WEB_APP_URL | string | No | http://localhost:3000 |
| WEB_PORT | number | No | 3000 |
| YAHOO_CACHE_TTL | number | No | 300 |
| YAHOO_ENABLED | string | Yes |  |
| YAHOO_RETRY_COUNT | number | No | 3 |
| YAHOO_TIMEOUT | number | No | 10000 |