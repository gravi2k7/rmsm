import json
import os
import threading
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

import MetaTrader5 as mt5


HOST = os.getenv("RMSM_MT5_WORKER_HOST", "0.0.0.0")
PORT = int(os.getenv("RMSM_MT5_WORKER_PORT", "18765"))
TOKEN = os.getenv("RMSM_MT5_WORKER_TOKEN", "")

MT5_PATH = os.getenv(
    "MT5_TERMINAL_PATH",
    r"C:\Program Files\Pepperstone MetaTrader 5\terminal64.exe",
)

TRADING_ENABLED = (
    os.getenv("MT5_TRADING_ENABLED", "false").lower()
    in ("1", "true", "yes", "on")
)

EXPECTED_LOGIN = os.getenv("MT5_EXPECTED_LOGIN", "")
EXPECTED_SERVER = os.getenv("MT5_EXPECTED_SERVER", "")

mt5_lock = threading.RLock()


def error_message():
    try:
        return str(mt5.last_error())
    except Exception:
        return "unknown MT5 error"


def as_dict(value):
    if value is None:
        return None

    if hasattr(value, "_asdict"):
        return {
            key: as_dict(item)
            for key, item in value._asdict().items()
        }

    if isinstance(value, (list, tuple)):
        return [as_dict(item) for item in value]

    if isinstance(value, dict):
        return {
            str(key): as_dict(item)
            for key, item in value.items()
        }

    return value


def require_initialized():
    terminal = mt5.terminal_info()

    if terminal is None or not terminal.connected:
        if not mt5.initialize(
            path=MT5_PATH,
            timeout=60000,
        ):
            raise RuntimeError(
                f"MT5 initialize failed: {error_message()}"
            )

    terminal = mt5.terminal_info()

    if terminal is None or not terminal.connected:
        raise RuntimeError("MT5 terminal is not connected")

    account = mt5.account_info()

    if account is None:
        raise RuntimeError(
            f"MT5 account_info failed: {error_message()}"
        )

    if EXPECTED_LOGIN and str(account.login) != EXPECTED_LOGIN:
        raise RuntimeError(
            f"Unexpected MT5 account: {account.login}"
        )

    if EXPECTED_SERVER and account.server != EXPECTED_SERVER:
        raise RuntimeError(
            f"Unexpected MT5 server: {account.server}"
        )

    return terminal, account


def account_response():
    _, account = require_initialized()

    return {
        "login": str(account.login),
        "name": account.name,
        "server": account.server,
        "company": account.company,
        "balance": account.balance,
        "equity": account.equity,
        "margin": account.margin,
        "freeMargin": account.margin_free,
        "marginLevel": account.margin_level,
        "currency": account.currency,
        "leverage": account.leverage,
        "tradeAllowed": bool(account.trade_allowed),
        "tradeExpert": bool(account.trade_expert),
    }


def positions_response():
    require_initialized()

    positions = mt5.positions_get()

    if positions is None:
        raise RuntimeError(
            f"positions_get failed: {error_message()}"
        )

    result = []

    for position in positions:
        side = (
            "BUY"
            if position.type == mt5.POSITION_TYPE_BUY
            else "SELL"
        )

        result.append(
            {
                "ticket": str(position.ticket),
                "symbol": position.symbol,
                "side": side,
                "volume": position.volume,
                "openPrice": position.price_open,
                "currentPrice": position.price_current,
                "profit": position.profit,
                "swap": position.swap,
                "commission": getattr(
                    position,
                    "commission",
                    0.0,
                ),
            }
        )

    return result


def ensure_symbol(symbol):
    info = mt5.symbol_info(symbol)

    if info is None:
        raise RuntimeError(
            f"MT5 symbol not found: {symbol}; "
            f"last_error={error_message()}"
        )

    if not info.visible:
        if not mt5.symbol_select(symbol, True):
            raise RuntimeError(
                f"Unable to select MT5 symbol: {symbol}; "
                f"last_error={error_message()}"
            )

        info = mt5.symbol_info(symbol)

        if info is None:
            raise RuntimeError(
                f"MT5 symbol unavailable after selection: {symbol}"
            )

    return info


def symbol_response(symbol):
    require_initialized()

    info = ensure_symbol(symbol)
    tick = mt5.symbol_info_tick(symbol)

    return {
        "symbol": info.name,
        "visible": bool(info.visible),
        "tradeMode": info.trade_mode,
        "digits": info.digits,
        "point": info.point,
        "volumeMin": info.volume_min,
        "volumeMax": info.volume_max,
        "volumeStep": info.volume_step,
        "tickSize": info.trade_tick_size,
        "tickValue": info.trade_tick_value,
        "currencyBase": info.currency_base,
        "currencyProfit": info.currency_profit,
        "currencyMargin": info.currency_margin,
        "bid": tick.bid if tick else None,
        "ask": tick.ask if tick else None,
        "last": tick.last if tick else None,
        "tickTime": tick.time if tick else None,
    }


def find_symbol_candidates(query):
    require_initialized()

    symbols = mt5.symbols_get()

    if symbols is None:
        raise RuntimeError(
            f"symbols_get failed: {error_message()}"
        )

    q = query.upper()

    exact = []
    contains = []

    for symbol in symbols:
        name = symbol.name

        if name.upper() == q:
            exact.append(name)
        elif q in name.upper():
            contains.append(name)

    return {
        "query": query,
        "exact": exact,
        "contains": contains[:100],
    }


def resolve_filling_mode(info):
    # Prefer the broker's declared filling mode where possible.
    filling = getattr(info, "filling_mode", 0)

    if filling & mt5.ORDER_FILLING_FOK:
        return mt5.ORDER_FILLING_FOK

    if filling & mt5.ORDER_FILLING_IOC:
        return mt5.ORDER_FILLING_IOC

    return mt5.ORDER_FILLING_RETURN


def place_order(request):
    if not TRADING_ENABLED:
        raise PermissionError(
            "MT5 trading is disabled on this worker"
        )

    require_initialized()

    symbol = request["symbol"]
    side = request["side"].upper()
    order_type = request.get("orderType", "MARKET").upper()
    volume = float(request["volume"])

    info = ensure_symbol(symbol)
    tick = mt5.symbol_info_tick(symbol)

    if tick is None:
        raise RuntimeError(
            f"No tick available for {symbol}: {error_message()}"
        )

    if side not in ("BUY", "SELL"):
        raise ValueError(f"Invalid side: {side}")

    if order_type not in (
        "MARKET",
        "LIMIT",
        "STOP",
        "STOP_LIMIT",
    ):
        raise ValueError(
            f"Unsupported order type: {order_type}"
        )

    if volume <= 0:
        raise ValueError("volume must be greater than zero")

    request_type = None
    action = mt5.TRADE_ACTION_DEAL

    if order_type == "MARKET":
        request_type = (
            mt5.ORDER_TYPE_BUY
            if side == "BUY"
            else mt5.ORDER_TYPE_SELL
        )

    elif order_type == "LIMIT":
        action = mt5.TRADE_ACTION_PENDING
        request_type = (
            mt5.ORDER_TYPE_BUY_LIMIT
            if side == "BUY"
            else mt5.ORDER_TYPE_SELL_LIMIT
        )

    elif order_type == "STOP":
        action = mt5.TRADE_ACTION_PENDING
        request_type = (
            mt5.ORDER_TYPE_BUY_STOP
            if side == "BUY"
            else mt5.ORDER_TYPE_SELL_STOP
        )

    elif order_type == "STOP_LIMIT":
        action = mt5.TRADE_ACTION_PENDING
        request_type = (
            mt5.ORDER_TYPE_BUY_STOP_LIMIT
            if side == "BUY"
            else mt5.ORDER_TYPE_SELL_STOP_LIMIT
        )

    price = request.get("price")

    if price is None and order_type == "MARKET":
        price = tick.ask if side == "BUY" else tick.bid

    trade_request = {
        "action": action,
        "symbol": symbol,
        "volume": volume,
        "type": request_type,
        "price": float(price) if price is not None else 0.0,
        "sl": float(request["stopLoss"])
        if request.get("stopLoss") is not None
        else 0.0,
        "tp": float(request["takeProfit"])
        if request.get("takeProfit") is not None
        else 0.0,
        "deviation": int(request.get("deviation", 20)),
        "magic": int(request.get("magic", 360001)),
        "comment": request.get(
            "comment",
            "RMSM",
        ),
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": resolve_filling_mode(info),
    }

    if order_type == "STOP_LIMIT":
        if request.get("stopLimit") is None:
            raise ValueError(
                "stopLimit is required for STOP_LIMIT"
            )

        trade_request["stoplimit"] = float(
            request["stopLimit"]
        )

    check = mt5.order_check(trade_request)

    if check is None:
        raise RuntimeError(
            f"order_check failed: {error_message()}"
        )

    check_dict = as_dict(check)

    if check.retcode != 0:
        raise RuntimeError(
            f"order_check rejected: "
            f"retcode={check.retcode}, "
            f"comment={check.comment}"
        )

    result = mt5.order_send(trade_request)

    if result is None:
        raise RuntimeError(
            f"order_send failed: {error_message()}"
        )

    result_dict = as_dict(result)

    accepted = result.retcode in (
        mt5.TRADE_RETCODE_DONE,
        mt5.TRADE_RETCODE_PLACED,
        mt5.TRADE_RETCODE_DONE_PARTIAL,
    )

    return {
        "accepted": accepted,
        "orderId": (
            str(result.order)
            if result.order
            else None
        ),
        "dealId": (
            str(result.deal)
            if result.deal
            else None
        ),
        "positionId": (
            str(result.order)
            if result.order
            else None
        ),
        "symbol": symbol,
        "side": side,
        "volume": result.volume,
        "price": result.price,
        "status": str(result.retcode),
        "message": result.comment,
        "retcode": result.retcode,
        "check": check_dict,
        "raw": result_dict,
    }


def close_position(ticket, volume=None):
    if not TRADING_ENABLED:
        raise PermissionError(
            "MT5 trading is disabled on this worker"
        )

    require_initialized()

    position = mt5.positions_get(
        ticket=int(ticket)
    )

    if not position:
        raise RuntimeError(
            f"Position not found: {ticket}"
        )

    position = position[0]

    close_volume = (
        float(volume)
        if volume is not None
        else float(position.volume)
    )

    symbol = position.symbol
    tick = mt5.symbol_info_tick(symbol)

    if tick is None:
        raise RuntimeError(
            f"No tick available for {symbol}: {error_message()}"
        )

    if position.type == mt5.POSITION_TYPE_BUY:
        order_type = mt5.ORDER_TYPE_SELL
        price = tick.bid
        side = "SELL"
    else:
        order_type = mt5.ORDER_TYPE_BUY
        price = tick.ask
        side = "BUY"

    info = ensure_symbol(symbol)

    trade_request = {
        "action": mt5.TRADE_ACTION_DEAL,
        "symbol": symbol,
        "volume": close_volume,
        "type": order_type,
        "position": int(position.ticket),
        "price": price,
        "deviation": 20,
        "magic": 360001,
        "comment": "RMSM close",
        "type_time": mt5.ORDER_TIME_GTC,
        "type_filling": resolve_filling_mode(info),
    }

    check = mt5.order_check(trade_request)

    if check is None:
        raise RuntimeError(
            f"close order_check failed: {error_message()}"
        )

    if check.retcode != 0:
        raise RuntimeError(
            f"close order_check rejected: "
            f"retcode={check.retcode}, "
            f"comment={check.comment}"
        )

    result = mt5.order_send(trade_request)

    if result is None:
        raise RuntimeError(
            f"close order_send failed: {error_message()}"
        )

    accepted = result.retcode in (
        mt5.TRADE_RETCODE_DONE,
        mt5.TRADE_RETCODE_PLACED,
        mt5.TRADE_RETCODE_DONE_PARTIAL,
    )

    return {
        "accepted": accepted,
        "orderId": (
            str(result.order)
            if result.order
            else None
        ),
        "dealId": (
            str(result.deal)
            if result.deal
            else None
        ),
        "positionId": str(position.ticket),
        "symbol": symbol,
        "side": side,
        "volume": result.volume,
        "price": result.price,
        "status": str(result.retcode),
        "message": result.comment,
        "retcode": result.retcode,
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "RMSM-MT5-Worker/0.1"

    def log_message(self, format, *args):
        # Never log request bodies because they can contain credentials.
        print(
            "%s - %s"
            % (
                self.address_string(),
                format % args,
            )
        )

    def send_json(self, status, payload):
        body = json.dumps(
            payload,
            separators=(",", ":"),
            default=str,
        ).encode("utf-8")

        self.send_response(status)
        self.send_header(
            "Content-Type",
            "application/json",
        )
        self.send_header(
            "Content-Length",
            str(len(body)),
        )
        self.send_header(
            "Cache-Control",
            "no-store",
        )
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        if not TOKEN:
            return False

        supplied = self.headers.get(
            "Authorization",
            "",
        )

        expected = f"Bearer {TOKEN}"

        return supplied == expected

    def read_json(self):
        length = int(
            self.headers.get(
                "Content-Length",
                "0",
            )
        )

        if length <= 0:
            return {}

        raw = self.rfile.read(length)

        return json.loads(
            raw.decode("utf-8")
        )

    def do_GET(self):
        try:
            if not self.authorized():
                self.send_json(
                    401,
                    {
                        "success": False,
                        "error": "Unauthorized",
                    },
                )
                return

            parsed = urlparse(self.path)
            path = parsed.path

            with mt5_lock:
                if path == "/health":
                    terminal = mt5.terminal_info()

                    self.send_json(
                        200,
                        {
                            "success": True,
                            "worker": "rmsm-mt5-worker",
                            "version": "0.1",
                            "mt5Connected": bool(
                                terminal
                                and terminal.connected
                            ),
                            "tradingEnabled": TRADING_ENABLED,
                            "terminalPath": (
                                terminal.path
                                if terminal
                                else MT5_PATH
                            ),
                        },
                    )
                    return

                if path == "/account":
                    self.send_json(
                        200,
                        {
                            "success": True,
                            "data": account_response(),
                        },
                    )
                    return

                if path == "/positions":
                    self.send_json(
                        200,
                        {
                            "success": True,
                            "data": positions_response(),
                        },
                    )
                    return

                if path.startswith("/symbols/"):
                    symbol = path[
                        len("/symbols/"):
                    ]

                    self.send_json(
                        200,
                        {
                            "success": True,
                            "data": symbol_response(
                                symbol
                            ),
                        },
                    )
                    return

                if path.startswith("/symbols-search/"):
                    query = path[
                        len("/symbols-search/"):
                    ]

                    self.send_json(
                        200,
                        {
                            "success": True,
                            "data": find_symbol_candidates(
                                query
                            ),
                        },
                    )
                    return

                self.send_json(
                    404,
                    {
                        "success": False,
                        "error": "Not found",
                    },
                )

        except PermissionError as exc:
            self.send_json(
                403,
                {
                    "success": False,
                    "error": str(exc),
                },
            )
        except Exception as exc:
            print(traceback.format_exc())
            self.send_json(
                500,
                {
                    "success": False,
                    "error": str(exc),
                },
            )

    def do_POST(self):
        try:
            if not self.authorized():
                self.send_json(
                    401,
                    {
                        "success": False,
                        "error": "Unauthorized",
                    },
                )
                return

            parsed = urlparse(self.path)
            path = parsed.path
            body = self.read_json()

            with mt5_lock:
                if path == "/connect":
                    # Current worker attaches to the MT5 terminal.
                    # Explicit login credentials are accepted by the
                    # contract but are intentionally not logged.
                    initialized = mt5.initialize(
                        path=MT5_PATH,
                        timeout=60000,
                    )

                    if not initialized:
                        raise RuntimeError(
                            f"MT5 initialize failed: "
                            f"{error_message()}"
                        )

                    if (
                        body.get("login") is not None
                        and body.get("server")
                    ):
                        login = int(body["login"])
                        server = body["server"]

                        password = body.get(
                            "password"
                        )

                        # Only attempt explicit login when credentials
                        # are supplied. The password is never logged.
                        if password:
                            authorized = mt5.login(
                                login,
                                password=password,
                                server=server,
                                timeout=60000,
                            )
                        else:
                            authorized = mt5.login(
                                login,
                                server=server,
                                timeout=60000,
                            )

                        if not authorized:
                            raise RuntimeError(
                                f"MT5 login failed: "
                                f"{error_message()}"
                            )

                    self.send_json(
                        200,
                        {
                            "success": True,
                            "data": account_response(),
                        },
                    )
                    return

                if path == "/disconnect":
                    mt5.shutdown()

                    self.send_json(
                        200,
                        {
                            "success": True,
                        },
                    )
                    return

                if path == "/orders":
                    result = place_order(body)

                    self.send_json(
                        200,
                        {
                            "success": True,
                            "data": result,
                        },
                    )
                    return

                if path.startswith("/positions/") and path.endswith(
                    "/close"
                ):
                    ticket = path[
                        len("/positions/") : -len("/close")
                    ].strip("/")

                    result = close_position(
                        ticket,
                        body.get("volume"),
                    )

                    self.send_json(
                        200,
                        {
                            "success": True,
                            "data": result,
                        },
                    )
                    return

                self.send_json(
                    404,
                    {
                        "success": False,
                        "error": "Not found",
                    },
                )

        except PermissionError as exc:
            self.send_json(
                403,
                {
                    "success": False,
                    "error": str(exc),
                },
            )
        except Exception as exc:
            print(traceback.format_exc())
            self.send_json(
                500,
                {
                    "success": False,
                    "error": str(exc),
                },
            )


def main():
    if not TOKEN:
        raise RuntimeError(
            "RMSM_MT5_WORKER_TOKEN must be configured"
        )

    print("=== RMSM MT5 WORKER ===")
    print("Host:", HOST)
    print("Port:", PORT)
    print("Terminal:", MT5_PATH)
    print("Trading enabled:", TRADING_ENABLED)

    server = ThreadingHTTPServer(
        (HOST, PORT),
        Handler,
    )

    print("Worker listening")

    try:
        server.serve_forever()
    finally:
        server.server_close()
        with mt5_lock:
            try:
                mt5.shutdown()
            except Exception:
                pass


if __name__ == "__main__":
    main()
