# RMSM Managed MT5 Worker

The RMSM API owns the broker connection configuration:

- MT5 login
- MT5 password
- MT5 server

The worker is responsible for maintaining the actual MT5 runtime connection.

The worker must:

1. Start/manage the MT5 runtime.
2. Authenticate using login/password/server.
3. Maintain the connection.
4. Read account state.
5. Read positions.
6. Submit market/conditional orders.
7. Close positions.
8. Return broker execution identifiers.
9. Reconnect automatically.
10. Report health to RMSM.

The API must never require the customer to operate an MT5 terminal or gateway.

The first runtime implementation will use the official MetaTrader 5 Python integration on a managed Windows worker. The RMSM API communicates with the managed worker over an authenticated RMSM worker protocol.
