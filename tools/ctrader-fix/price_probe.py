#!/usr/bin/env python3

import os
import socket
import ssl
import time
from datetime import datetime, timezone


SOH = "\x01"

HOST = os.environ.get(
    "CTRADER_FIX_HOST",
    "live-uk-eqx-01.p.c-trader.com",
)

PORT = int(
    os.environ.get(
        "CTRADER_FIX_PORT",
        "5211",
    )
)

SENDER_COMP_ID = os.environ.get(
    "CTRADER_FIX_SENDER_COMP_ID",
    "live.pepperstone.1027670",
)

TARGET_COMP_ID = os.environ.get(
    "CTRADER_FIX_TARGET_COMP_ID",
    "CSERVER",
)

TARGET_SUB_ID = os.environ.get(
    "CTRADER_FIX_TARGET_SUB_ID",
    "QUOTE",
)

SENDER_SUB_ID = os.environ.get(
    "CTRADER_FIX_SENDER_SUB_ID",
    "QUOTE",
)

USERNAME = os.environ.get(
    "CTRADER_FIX_USERNAME",
    "1027670",
)

PASSWORD = os.environ.get("CTRADER_FIX_PASSWORD")

SYMBOL_ID = os.environ.get(
    "CTRADER_FIX_SYMBOL_ID",
    "1",
)

HEARTBEAT = int(
    os.environ.get(
        "CTRADER_FIX_HEARTBEAT",
        "30",
    )
)


if not PASSWORD:
    raise SystemExit(
        "ERROR: CTRADER_FIX_PASSWORD is not set"
    )


def utc_timestamp():
    now = datetime.now(timezone.utc)
    return now.strftime("%Y%m%d-%H:%M:%S.%f")[:-3]


def checksum(message: str) -> str:
    value = sum(message.encode("ascii"))
    return f"{value % 256:03d}"


def build_message(msg_type: str, fields):
    body_fields = [
        ("35", msg_type),
        ("49", SENDER_COMP_ID),
        ("56", TARGET_COMP_ID),
        ("34", str(build_message.seq)),
        ("52", utc_timestamp()),
        ("57", TARGET_SUB_ID),
        ("50", SENDER_SUB_ID),
    ]

    body_fields.extend(fields)

    body = SOH.join(
        f"{tag}={value}"
        for tag, value in body_fields
    ) + SOH

    header = (
        "8=FIX.4.4"
        + SOH
        + f"9={len(body.encode('ascii'))}"
        + SOH
    )

    message_without_checksum = header + body

    return (
        message_without_checksum
        + f"10={checksum(message_without_checksum)}"
        + SOH
    )


build_message.seq = 1


def send_message(sock, msg_type, fields):
    message = build_message(msg_type, fields)

    safe_message = message.replace(
        f"554={PASSWORD}",
        "554=[REDACTED]",
    )

    print(
        f"[CTRADER-FIX] SEND {msg_type} "
        f"seq={build_message.seq}"
    )
    print(
        "[CTRADER-FIX] OUT:",
        safe_message.replace(SOH, "|"),
    )

    sock.sendall(message.encode("ascii"))

    build_message.seq += 1


def parse_message(raw):
    fields = {}

    for item in raw.split(SOH):
        if "=" not in item:
            continue

        tag, value = item.split("=", 1)
        fields.setdefault(tag, []).append(value)

    return fields


def read_message(sock, buffer):
    while True:
        header_end = buffer.find(b"8=FIX.4.4")

        if header_end > 0:
            buffer = buffer[header_end:]

        if b"\x01" not in buffer:
            data = sock.recv(8192)

            if not data:
                raise RuntimeError(
                    "cTrader closed the connection"
                )

            buffer += data
            continue

        parts = buffer.split(b"\x01")

        body_length = None

        for part in parts:
            if part.startswith(b"9="):
                body_length = int(part[2:])
                break

        if body_length is None:
            data = sock.recv(8192)

            if not data:
                raise RuntimeError(
                    "cTrader closed the connection"
                )

            buffer += data
            continue

        header_prefix = b"8=FIX.4.4\x01"
        body_length_prefix = f"9={body_length}\x01".encode()

        message_start_length = (
            len(header_prefix)
            + len(body_length_prefix)
        )

        total_length = (
            message_start_length
            + body_length
            + 7
        )

        if len(buffer) < total_length:
            data = sock.recv(8192)

            if not data:
                raise RuntimeError(
                    "cTrader closed the connection"
                )

            buffer += data
            continue

        message = buffer[:total_length]
        buffer = buffer[total_length:]

        return message, buffer


def dump_message(message):
    text = message.decode(
        "ascii",
        errors="replace",
    )

    return text.replace(SOH, "|")


def extract_prices(fields):
    bid = None
    ask = None

    entry_type = None

    for tag, values in fields.items():
        if tag == "269":
            for value in values:
                entry_type = value

        if tag == "270":
            for value in values:
                if entry_type == "0":
                    bid = value
                elif entry_type == "1":
                    ask = value

    return bid, ask


print("============================================================")
print("cTrader FIX PRICE CONNECTION PROBE")
print("============================================================")
print(f"Host:          {HOST}")
print(f"Port:          {PORT}")
print(f"SenderCompID:  {SENDER_COMP_ID}")
print(f"TargetCompID:  {TARGET_COMP_ID}")
print(f"TargetSubID:   {TARGET_SUB_ID}")
print(f"SenderSubID:   {SENDER_SUB_ID}")
print(f"Username:      {USERNAME}")
print(f"Symbol ID:     {SYMBOL_ID}")
print("Password:      [SET]")
print("============================================================")


raw_socket = socket.create_connection(
    (HOST, PORT),
    timeout=15,
)

context = ssl.create_default_context()

sock = context.wrap_socket(
    raw_socket,
    server_hostname=HOST,
)

sock.settimeout(5)

print("[CTRADER-FIX] TLS connected")
print(
    f"[CTRADER-FIX] TLS version: "
    f"{sock.version()}"
)


buffer = b""

# ------------------------------------------------------------
# FIX LOGON
# ------------------------------------------------------------

send_message(
    sock,
    "A",
    [
        ("98", "0"),
        ("108", str(HEARTBEAT)),
        ("141", "Y"),
        ("553", USERNAME),
        ("554", PASSWORD),
    ],
)


logon_ok = False

deadline = time.time() + 15

while time.time() < deadline:
    try:
        message, buffer = read_message(
            sock,
            buffer,
        )
    except socket.timeout:
        continue

    print(
        "[CTRADER-FIX] RECV",
        dump_message(message),
    )

    fields = parse_message(
        message.decode(
            "ascii",
            errors="replace",
        )
    )

    msg_type = fields.get("35", [""])[0]

    if msg_type == "A":
        logon_ok = True
        print(
            "[CTRADER-FIX] LOGON ACCEPTED"
        )
        break

    if msg_type == "5":
        text = fields.get(
            "58",
            ["unknown logout reason"],
        )[0]

        raise RuntimeError(
            f"cTrader rejected Logon: {text}"
        )


if not logon_ok:
    raise RuntimeError(
        "Timed out waiting for cTrader Logon response"
    )


# ------------------------------------------------------------
# MARKET DATA SUBSCRIPTION
# ------------------------------------------------------------

md_req_id = (
    f"RMSM-EURUSD-{int(time.time())}"
)

send_message(
    sock,
    "V",
    [
        ("262", md_req_id),
        ("263", "1"),
        ("264", "1"),
        ("265", "1"),
        ("146", "1"),
        ("55", SYMBOL_ID),
        ("267", "2"),
        ("269", "0"),
        ("269", "1"),
    ],
)

print(
    "[CTRADER-FIX] EURUSD subscription sent"
    f" — FIX Symbol ID {SYMBOL_ID}"
)


# ------------------------------------------------------------
# RECEIVE SNAPSHOT / LIVE UPDATES
# ------------------------------------------------------------

bid = None
ask = None

deadline = time.time() + 30

while time.time() < deadline:

    try:
        message, buffer = read_message(
            sock,
            buffer,
        )
    except socket.timeout:
        continue

    readable = dump_message(message)

    print(
        "[CTRADER-FIX] RECV",
        readable,
    )

    fields = parse_message(
        message.decode(
            "ascii",
            errors="replace",
        )
    )

    msg_type = fields.get("35", [""])[0]

    if msg_type == "W":

        entries = len(
            fields.get("269", [])
        )

        current_type = None

        for i in range(entries):

            entry_types = fields.get(
                "269",
                [],
            )

            prices = fields.get(
                "270",
                [],
            )

            if i >= len(prices):
                continue

            current_type = entry_types[i]

            price = prices[i]

            if current_type == "0":
                bid = price

            elif current_type == "1":
                ask = price

    elif msg_type == "X":

        entries = len(
            fields.get("269", [])
        )

        entry_types = fields.get(
            "269",
            [],
        )

        prices = fields.get(
            "270",
            [],
        )

        for i in range(min(entries, len(prices))):

            if entry_types[i] == "0":
                bid = prices[i]

            elif entry_types[i] == "1":
                ask = prices[i]

    elif msg_type == "Y":

        reason = fields.get(
            "58",
            ["unknown"],
        )[0]

        raise RuntimeError(
            f"Market Data Request rejected: {reason}"
        )

    if bid is not None or ask is not None:

        print()
        print("============================================================")
        print("LIVE EURUSD QUOTE RECEIVED")
        print("============================================================")
        print(f"BID: {bid}")
        print(f"ASK: {ask}")
        print("============================================================")
        print()

        # Continue briefly so we can prove updates are live.
        time.sleep(2)

        if bid is not None and ask is not None:
            print(
                "[CTRADER-FIX] REAL BID/ASK SUCCESS"
            )
            break


try:
    send_message(
        sock,
        "5",
        [],
    )
except Exception:
    pass

sock.close()

print(
    "[CTRADER-FIX] Connection closed cleanly"
)
