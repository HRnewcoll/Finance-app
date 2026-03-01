#!/usr/bin/env python3
"""
Finance-app Monorepo Management CLI
====================================
Scaffold and manage microservices in this monorepo.

Usage:
    python scripts/cli.py scaffold --name <service-name> [--lang go] [--type microservice]
    python scripts/cli.py list
    python scripts/cli.py validate <service-name>

Examples:
    python scripts/cli.py scaffold --name payment-processor --lang go --type microservice
    python scripts/cli.py scaffold --name user-auth --lang go --type grpc-service
    python scripts/cli.py list
    python scripts/cli.py validate payment-processor
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

# ── Constants ─────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.parent.resolve()
TEMPLATES_DIR = Path(__file__).parent / "templates"
SERVICES_DIR = REPO_ROOT / "services"

SUPPORTED_LANGS = ["go"]
SUPPORTED_TYPES = ["microservice", "grpc-service", "worker"]

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"


# ── Helpers ───────────────────────────────────────────────────────────────────


def info(msg: str) -> None:
    print(f"{BLUE}ℹ️  {msg}{RESET}")


def success(msg: str) -> None:
    print(f"{GREEN}✅ {msg}{RESET}")


def warn(msg: str) -> None:
    print(f"{YELLOW}⚠️  {msg}{RESET}", file=sys.stderr)


def error(msg: str) -> None:
    print(f"{RED}❌ {msg}{RESET}", file=sys.stderr)


def validate_service_name(name: str) -> bool:
    """Service names must be lowercase, alphanumeric + hyphens only."""
    return bool(re.match(r"^[a-z][a-z0-9-]*[a-z0-9]$", name))


def to_pascal_case(name: str) -> str:
    return "".join(word.capitalize() for word in name.replace("-", "_").split("_"))


def to_snake_case(name: str) -> str:
    return name.replace("-", "_")


def render_template(template_path: Path, dest_path: Path, context: dict) -> None:
    """Render a template file substituting {{KEY}} placeholders."""
    content = template_path.read_text()
    for key, value in context.items():
        content = content.replace(f"{{{{{key}}}}}", str(value))
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_text(content)


def copy_tree_with_render(src: Path, dst: Path, context: dict) -> list[Path]:
    """Recursively copy a template tree, rendering each file."""
    created: list[Path] = []
    for src_file in sorted(src.rglob("*")):
        if src_file.is_dir():
            continue
        rel = src_file.relative_to(src)
        # Allow filename templating (e.g. {{SERVICE_NAME}}.go)
        rel_str = str(rel)
        for key, value in context.items():
            rel_str = rel_str.replace(f"{{{{{key}}}}}", str(value))
        dst_file = dst / rel_str
        render_template(src_file, dst_file, context)
        created.append(dst_file)
    return created


# ── Scaffold Command ──────────────────────────────────────────────────────────


def scaffold_go_microservice(name: str, service_type: str, dest: Path) -> None:
    """Scaffold a Go microservice from the built-in template."""
    pascal = to_pascal_case(name)
    snake = to_snake_case(name)

    context = {
        "SERVICE_NAME": name,
        "SERVICE_NAME_PASCAL": pascal,
        "SERVICE_NAME_SNAKE": snake,
        "SERVICE_TYPE": service_type,
        "MODULE_PATH": f"github.com/HRnewcoll/Finance-app/services/{name}",
    }

    template_src = TEMPLATES_DIR / "go-microservice"
    if not template_src.exists():
        error(f"Template directory not found: {template_src}")
        sys.exit(1)

    if dest.exists():
        error(f"Service directory already exists: {dest}")
        sys.exit(1)

    info(f"Scaffolding Go {service_type} '{name}' into {dest} …")
    created = copy_tree_with_render(template_src, dest, context)

    for f in created:
        rel = f.relative_to(REPO_ROOT)
        print(f"  {GREEN}+{RESET} {rel}")

    success(f"Service '{name}' scaffolded successfully!")
    print()
    print(f"{BOLD}Next steps:{RESET}")
    print(f"  1. cd {dest.relative_to(REPO_ROOT)}")
    print(f"  2. go mod tidy")
    print(f"  3. make proto          # generate protobuf stubs")
    print(f"  4. make run            # run the service locally")
    print(f"  5. make docker-build   # build Docker image")


def cmd_scaffold(args: argparse.Namespace) -> None:
    name = args.name
    lang = args.lang
    service_type = args.type

    if not validate_service_name(name):
        error(
            f"Invalid service name '{name}'. "
            "Use lowercase letters, numbers, and hyphens only. "
            "Must start with a letter."
        )
        sys.exit(1)

    if lang not in SUPPORTED_LANGS:
        error(f"Unsupported language '{lang}'. Supported: {', '.join(SUPPORTED_LANGS)}")
        sys.exit(1)

    if service_type not in SUPPORTED_TYPES:
        error(
            f"Unsupported service type '{service_type}'. "
            f"Supported: {', '.join(SUPPORTED_TYPES)}"
        )
        sys.exit(1)

    SERVICES_DIR.mkdir(parents=True, exist_ok=True)
    dest = SERVICES_DIR / name

    if lang == "go":
        scaffold_go_microservice(name, service_type, dest)
    else:
        error(f"Scaffolding for language '{lang}' is not yet implemented.")
        sys.exit(1)


# ── List Command ──────────────────────────────────────────────────────────────


def cmd_list(args: argparse.Namespace) -> None:
    if not SERVICES_DIR.exists():
        info("No services directory found. Use 'scaffold' to create your first service.")
        return

    services = sorted(
        d for d in SERVICES_DIR.iterdir() if d.is_dir() and not d.name.startswith(".")
    )

    if not services:
        info("No services found yet. Use 'scaffold' to create one.")
        return

    print(f"{BOLD}Services in this monorepo:{RESET}")
    for svc in services:
        # Detect language
        lang = "unknown"
        if (svc / "go.mod").exists():
            lang = "go"
        elif (svc / "package.json").exists():
            lang = "node"
        elif (svc / "requirements.txt").exists() or list(svc.glob("*.py")):
            lang = "python"

        # Detect proto files
        protos = list(svc.rglob("*.proto"))
        proto_str = f" [{len(protos)} proto file(s)]" if protos else ""

        print(f"  {GREEN}•{RESET} {BOLD}{svc.name}{RESET}  ({lang}){proto_str}")

    print(f"\nTotal: {len(services)} service(s)")


# ── Validate Command ──────────────────────────────────────────────────────────


def cmd_validate(args: argparse.Namespace) -> None:
    name = args.name
    svc_dir = SERVICES_DIR / name

    if not svc_dir.exists():
        error(f"Service '{name}' not found in {SERVICES_DIR}")
        sys.exit(1)

    checks: list[tuple[str, bool, str]] = []

    # Check required files
    required = {
        "go": ["go.mod", "Makefile", "Dockerfile", "README.md"],
    }
    lang = "go" if (svc_dir / "go.mod").exists() else "unknown"

    for req_file in required.get(lang, []):
        exists = (svc_dir / req_file).exists()
        checks.append((f"Required file: {req_file}", exists, ""))

    # Check proto files exist if it's a gRPC service
    proto_files = list(svc_dir.rglob("*.proto"))
    checks.append(("Proto definition exists", bool(proto_files), "at least one .proto file required"))

    # Check for tests
    test_files = (
        list(svc_dir.rglob("*_test.go"))
        + list(svc_dir.rglob("test_*.py"))
        + list(svc_dir.rglob("*.test.js"))
    )
    checks.append(("Tests present", bool(test_files), "no test files found"))

    # Check for CI/CD config
    has_ci = (svc_dir / ".github").exists() or (REPO_ROOT / ".github/workflows").exists()
    checks.append(("CI/CD configured", has_ci, ""))

    print(f"{BOLD}Validating service '{name}':{RESET}")
    all_passed = True
    for check_name, passed, hint in checks:
        status = f"{GREEN}✅{RESET}" if passed else f"{YELLOW}⚠️ {RESET}"
        print(f"  {status} {check_name}", end="")
        if not passed and hint:
            print(f"  {YELLOW}({hint}){RESET}", end="")
        print()
        if not passed:
            all_passed = False

    print()
    if all_passed:
        success(f"Service '{name}' passes all validation checks!")
    else:
        warn(f"Service '{name}' has some issues to address.")


# ── Main ──────────────────────────────────────────────────────────────────────


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cli.py",
        description="Finance-app Monorepo Management CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """
            Examples:
              %(prog)s scaffold --name payment-processor --lang go --type microservice
              %(prog)s scaffold --name user-auth --lang go --type grpc-service
              %(prog)s list
              %(prog)s validate payment-processor
            """
        ),
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # scaffold
    scaffold_parser = subparsers.add_parser(
        "scaffold",
        help="Scaffold a new microservice from a template",
    )
    scaffold_parser.add_argument("--name", required=True, help="Service name (lowercase, hyphens OK)")
    scaffold_parser.add_argument("--lang", default="go", choices=SUPPORTED_LANGS, help="Programming language")
    scaffold_parser.add_argument("--type", default="microservice", choices=SUPPORTED_TYPES, help="Service type")
    scaffold_parser.set_defaults(func=cmd_scaffold)

    # list
    list_parser = subparsers.add_parser("list", help="List all services in the monorepo")
    list_parser.set_defaults(func=cmd_list)

    # validate
    validate_parser = subparsers.add_parser("validate", help="Validate a service against monorepo standards")
    validate_parser.add_argument("name", help="Service name to validate")
    validate_parser.set_defaults(func=cmd_validate)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
