#!/usr/bin/env python3
"""Structural validator for docker-compose.prod.yml.

Not a substitute for `docker compose -f docker-compose.prod.yml config`
(the authoritative check) -- this exists because no `docker` binary was
available in the sandbox this file was originally authored in. Run the
real `docker compose config` whenever Docker is available; run this
first for a fast, dependency-free sanity check (only needs PyYAML).
"""
import os
import re
import sys
import yaml

path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docker-compose.prod.yml")
errors = []

with open(path) as f:
    content = f.read()

try:
    data = yaml.safe_load(content)
except yaml.YAMLError as e:
    print(f"FATAL: not valid YAML: {e}")
    sys.exit(1)

for key in ["version", "networks", "volumes", "services"]:
    if key not in data:
        errors.append(f"missing top-level key: {key}")

expected_services = {"postgres", "redis", "api", "ai", "web", "admin"}
actual_services = set(data.get("services", {}).keys())
if actual_services != expected_services:
    errors.append(f"service set mismatch: expected {expected_services}, got {actual_services}")
for name, body in data.get("services", {}).items():
    if not isinstance(body, dict):
        errors.append(f"service '{name}' has non-dict body: {body!r}")

top_level_volumes = set(data.get("volumes", {}).keys())
if top_level_volumes != {"postgres_data", "redis_data"}:
    errors.append(f"top-level volumes mismatch: {top_level_volumes}")

referenced_volumes = set()
for name, body in data.get("services", {}).items():
    for v in body.get("volumes", []) or []:
        if isinstance(v, str) and ":" in v:
            referenced_volumes.add(v.split(":")[0])
undeclared = referenced_volumes - top_level_volumes
if undeclared:
    errors.append(f"services reference undeclared volumes: {undeclared}")

bad_interps = []
for m in re.finditer(r"\$\{", content):
    start = m.start()
    depth = 1
    i = start + 2
    while i < len(content) and depth > 0:
        if content[i] == "{":
            depth += 1
        elif content[i] == "}":
            depth -= 1
        i += 1
    if depth != 0:
        bad_interps.append(f"unbalanced brace starting at offset {start}")
        continue
    body = content[start + 2 : i - 1]
    name_part = re.split(r"[:]", body, maxsplit=1)[0]
    if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", name_part):
        bad_interps.append(f"invalid variable name in interpolation: '{body}'")
errors.extend(bad_interps)

interp_pattern = re.compile(r"\$\{([^}]*)\}")
for m in interp_pattern.finditer(content):
    body = m.group(1)
    if ":" in body:
        var_name = body.split(":")[0]
        if var_name in actual_services:
            errors.append(f"interpolation variable name collides with a service name: '${{{body}}}'")

for var in ["LOG_LEVEL", "LOG_FORMAT", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"]:
    for m in re.finditer(r"\$\{(" + var + r"[A-Za-z]?)[:}]", content):
        found = m.group(1)
        if found != var:
            errors.append(f"variable name looks corrupted: expected '{var}', found '{found}'")

lines = content.split("\n")
for i, line in enumerate(lines):
    stripped = line.rstrip()
    if re.match(r"^\s*volumes:\s*$", stripped):
        base_indent = len(line) - len(line.lstrip(" "))
        j = i + 1
        while j < len(lines) and lines[j].strip() != "" and (len(lines[j]) - len(lines[j].lstrip(" "))) > base_indent:
            item = lines[j]
            item_indent = len(item) - len(item.lstrip(" "))
            if item.strip().startswith("-") and item_indent <= base_indent:
                errors.append(f"line {j + 1}: volumes list item not indented deeper than 'volumes:' key")
            j += 1

print(f"Parsed OK. Services: {sorted(actual_services)}")
print(f"Top-level volumes: {sorted(top_level_volumes)}")

if errors:
    print(f"\n{len(errors)} ISSUE(S) FOUND:")
    for e in errors:
        print(f"  - {e}")
    sys.exit(1)
else:
    print("\nAll checks passed: valid YAML, correct services, correct volumes,")
    print("no malformed interpolation, no corrupted variable names, correct indentation.")
