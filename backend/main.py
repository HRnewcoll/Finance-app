"""Accessibility mini-apps backend – FastAPI."""

from __future__ import annotations

import base64
import io
import math
import re
from typing import List, Optional

from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel, Field

app = FastAPI(title="Accessibility Tools API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helpers – colour maths (WCAG 2.1)
# ---------------------------------------------------------------------------

def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Parse #RRGGBB or #RGB into (r, g, b) 0-255 tuple."""
    h = hex_color.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6 or not all(c in "0123456789abcdefABCDEF" for c in h):
        raise ValueError(f"Invalid hex colour: {hex_color!r}")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return r, g, b


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def _linearize(c: float) -> float:
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _relative_luminance(r: int, g: int, b: int) -> float:
    return 0.2126 * _linearize(r) + 0.7152 * _linearize(g) + 0.0722 * _linearize(b)


def _contrast_ratio(l1: float, l2: float) -> float:
    light, dark = max(l1, l2), min(l1, l2)
    return (light + 0.05) / (dark + 0.05)


def _wcag_level(ratio: float) -> str:
    if ratio >= 7.0:
        return "AAA"
    if ratio >= 4.5:
        return "AA"
    if ratio >= 3.0:
        return "AA Large"
    return "Fail"


def _adjust_lightness(r: int, g: int, b: int, target_ratio: float, bg_luminance: float) -> tuple[int, int, int]:
    """Darken or lighten (r,g,b) until contrast with bg_luminance meets target_ratio."""
    # Try darkening first (multiply each channel)
    best = (r, g, b)
    best_ratio = _contrast_ratio(_relative_luminance(r, g, b), bg_luminance)

    for step in range(1, 256):
        # Darken
        dr = max(0, r - step)
        dg = max(0, g - step)
        db = max(0, b - step)
        ratio_d = _contrast_ratio(_relative_luminance(dr, dg, db), bg_luminance)
        if ratio_d >= target_ratio:
            return dr, dg, db

        # Lighten
        lr = min(255, r + step)
        lg = min(255, g + step)
        lb = min(255, b + step)
        ratio_l = _contrast_ratio(_relative_luminance(lr, lg, lb), bg_luminance)
        if ratio_l >= target_ratio:
            return lr, lg, lb

    return best


# ---------------------------------------------------------------------------
# 1. Colour-contrast endpoints
# ---------------------------------------------------------------------------

class ContrastCheckRequest(BaseModel):
    foreground: str = Field(..., description="Foreground hex colour, e.g. #333333")
    background: str = Field(..., description="Background hex colour, e.g. #ffffff")


class ContrastCheckResponse(BaseModel):
    foreground: str
    background: str
    contrast_ratio: float
    wcag_level: str
    passes_aa: bool
    passes_aaa: bool


class ContrastFixRequest(BaseModel):
    foreground: str = Field(..., description="Foreground hex colour")
    background: str = Field(..., description="Background hex colour")
    target: str = Field("AA", description="Target WCAG level: 'AA' or 'AAA'")


class ContrastFixResponse(BaseModel):
    original_foreground: str
    suggested_foreground: str
    background: str
    contrast_ratio: float
    wcag_level: str


@app.post("/api/color-contrast/check", response_model=ContrastCheckResponse)
def check_contrast(req: ContrastCheckRequest) -> ContrastCheckResponse:
    try:
        fg_rgb = _hex_to_rgb(req.foreground)
        bg_rgb = _hex_to_rgb(req.background)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    fg_lum = _relative_luminance(*fg_rgb)
    bg_lum = _relative_luminance(*bg_rgb)
    ratio = _contrast_ratio(fg_lum, bg_lum)
    ratio = round(ratio, 2)

    return ContrastCheckResponse(
        foreground=req.foreground.lower(),
        background=req.background.lower(),
        contrast_ratio=ratio,
        wcag_level=_wcag_level(ratio),
        passes_aa=ratio >= 4.5,
        passes_aaa=ratio >= 7.0,
    )


@app.post("/api/color-contrast/fix", response_model=ContrastFixResponse)
def fix_contrast(req: ContrastFixRequest) -> ContrastFixResponse:
    try:
        fg_rgb = _hex_to_rgb(req.foreground)
        bg_rgb = _hex_to_rgb(req.background)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    target_level = req.target.upper()
    target_ratio = 7.0 if target_level == "AAA" else 4.5
    bg_lum = _relative_luminance(*bg_rgb)

    current_ratio = _contrast_ratio(_relative_luminance(*fg_rgb), bg_lum)
    if current_ratio >= target_ratio:
        suggested = _rgb_to_hex(*fg_rgb)
        ratio = round(current_ratio, 2)
    else:
        new_rgb = _adjust_lightness(*fg_rgb, target_ratio, bg_lum)
        suggested = _rgb_to_hex(*new_rgb)
        ratio = round(_contrast_ratio(_relative_luminance(*new_rgb), bg_lum), 2)

    return ContrastFixResponse(
        original_foreground=req.foreground.lower(),
        suggested_foreground=suggested,
        background=req.background.lower(),
        contrast_ratio=ratio,
        wcag_level=_wcag_level(ratio),
    )


# ---------------------------------------------------------------------------
# 2. ARIA-validation endpoint
# ---------------------------------------------------------------------------

class AriaValidateRequest(BaseModel):
    html: str = Field(..., description="HTML snippet to validate")


class AriaIssue(BaseModel):
    rule: str
    element: str
    message: str
    severity: str  # "error" | "warning"


class AriaValidateResponse(BaseModel):
    issues: List[AriaIssue]
    issue_count: int
    passed: bool


# Valid ARIA roles (subset – sufficient for common checks)
_VALID_ARIA_ROLES = {
    "alert", "alertdialog", "application", "article", "banner", "button",
    "cell", "checkbox", "columnheader", "combobox", "complementary",
    "contentinfo", "definition", "dialog", "directory", "document",
    "feed", "figure", "form", "grid", "gridcell", "group", "heading",
    "img", "link", "list", "listbox", "listitem", "log", "main",
    "marquee", "math", "menu", "menubar", "menuitem", "menuitemcheckbox",
    "menuitemradio", "navigation", "none", "note", "option", "presentation",
    "progressbar", "radio", "radiogroup", "region", "row", "rowgroup",
    "rowheader", "scrollbar", "search", "searchbox", "separator",
    "slider", "spinbutton", "status", "switch", "tab", "table",
    "tablist", "tabpanel", "term", "textbox", "timer", "toolbar",
    "tooltip", "tree", "treegrid", "treeitem",
}


def _tag_str(tag) -> str:
    attrs = " ".join(f'{k}="{v}"' for k, v in list(tag.attrs.items())[:3])
    return f"<{tag.name} {attrs}>".strip()


@app.post("/api/aria/validate", response_model=AriaValidateResponse)
def validate_aria(req: AriaValidateRequest) -> AriaValidateResponse:
    soup = BeautifulSoup(req.html, "html.parser")
    issues: list[AriaIssue] = []

    # Rule 1 – <img> must have alt attribute
    for img in soup.find_all("img"):
        if not img.has_attr("alt"):
            issues.append(AriaIssue(
                rule="img-alt",
                element=_tag_str(img),
                message="<img> is missing an 'alt' attribute.",
                severity="error",
            ))
        elif img["alt"].strip() == "" and not img.has_attr("role"):
            # Empty alt is OK for decorative images; warn if no role="presentation"
            issues.append(AriaIssue(
                rule="img-alt-empty",
                element=_tag_str(img),
                message="<img> has empty alt=''; add role='presentation' for decorative images.",
                severity="warning",
            ))

    # Rule 2 – <input> (non-hidden) must have an associated label or aria-label
    for inp in soup.find_all("input"):
        if inp.get("type", "text").lower() in ("hidden", "submit", "reset", "button", "image"):
            continue
        has_label = False
        if inp.has_attr("aria-label") or inp.has_attr("aria-labelledby") or inp.has_attr("title"):
            has_label = True
        elif inp.has_attr("id"):
            if soup.find("label", attrs={"for": inp["id"]}):
                has_label = True
        if not has_label:
            issues.append(AriaIssue(
                rule="input-label",
                element=_tag_str(inp),
                message="<input> has no accessible label (aria-label, aria-labelledby, or <label for=…>).",
                severity="error",
            ))

    # Rule 3 – <button> must have accessible name
    for btn in soup.find_all("button"):
        text = btn.get_text(strip=True)
        if not text and not btn.has_attr("aria-label") and not btn.has_attr("aria-labelledby") and not btn.has_attr("title"):
            issues.append(AriaIssue(
                rule="button-name",
                element=_tag_str(btn),
                message="<button> has no accessible name (text content, aria-label, or aria-labelledby).",
                severity="error",
            ))

    # Rule 4 – <a> must have text or aria-label
    for a in soup.find_all("a"):
        text = a.get_text(strip=True)
        if not text and not a.has_attr("aria-label") and not a.has_attr("aria-labelledby") and not a.has_attr("title"):
            issues.append(AriaIssue(
                rule="link-name",
                element=_tag_str(a),
                message="<a> link has no accessible name.",
                severity="error",
            ))

    # Rule 5 – invalid role values
    for el in soup.find_all(attrs={"role": True}):
        roles = [r.strip() for r in el["role"].split()]
        for role in roles:
            if role not in _VALID_ARIA_ROLES:
                issues.append(AriaIssue(
                    rule="aria-valid-role",
                    element=_tag_str(el),
                    message=f"Invalid ARIA role: '{role}'.",
                    severity="error",
                ))

    # Rule 6 – aria-required-children: listbox must contain option
    for listbox in soup.find_all(attrs={"role": "listbox"}):
        children_roles = {el.get("role") for el in listbox.find_all(attrs={"role": True})}
        if "option" not in children_roles:
            issues.append(AriaIssue(
                rule="aria-required-children",
                element=_tag_str(listbox),
                message="Element with role='listbox' must contain at least one role='option'.",
                severity="error",
            ))

    # Rule 7 – page landmarks (warn if no <main> or role="main")
    has_main = bool(soup.find("main") or soup.find(attrs={"role": "main"}))
    if not has_main and soup.find("body"):
        issues.append(AriaIssue(
            rule="landmark-main",
            element="<body>",
            message="Page has no <main> landmark.",
            severity="warning",
        ))

    return AriaValidateResponse(
        issues=issues,
        issue_count=len(issues),
        passed=len(issues) == 0,
    )


# ---------------------------------------------------------------------------
# 3. Image-describe endpoint
# ---------------------------------------------------------------------------

class ImageDescribeRequest(BaseModel):
    image_base64: str = Field(..., description="Base64-encoded image data (PNG/JPEG/GIF/WEBP)")
    filename: Optional[str] = Field(None, description="Optional original filename")


class ImageDescribeResponse(BaseModel):
    format: str
    width: int
    height: int
    mode: str
    has_transparency: bool
    estimated_alt_text: str
    suggestions: List[str]


@app.post("/api/image/describe", response_model=ImageDescribeResponse)
def describe_image(req: ImageDescribeRequest) -> ImageDescribeResponse:
    try:
        # Strip data-URI prefix if present
        b64 = re.sub(r"^data:[^;]+;base64,", "", req.image_base64)
        data = base64.b64decode(b64)
        img = Image.open(io.BytesIO(data))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not decode image: {exc}") from exc

    fmt = img.format or "unknown"
    width, height = img.size
    mode = img.mode
    has_transparency = mode in ("RGBA", "LA", "PA") or "transparency" in img.info

    suggestions: list[str] = []
    alt_parts: list[str] = []
    orientation: str = ""

    # Filename hint
    if req.filename:
        name_no_ext = re.sub(r"\.[^.]+$", "", req.filename)
        clean = re.sub(r"[_\-]+", " ", name_no_ext).strip()
        if clean:
            alt_parts.append(clean)

    # Dimension hint
    if width > 0 and height > 0:
        orientation = "landscape" if width > height else "portrait" if height > width else "square"
        alt_parts.append(f"{orientation} image")

    estimated_alt = ", ".join(alt_parts) if alt_parts else f"{fmt.lower()} image"

    # Suggestions
    if width > 1920 or height > 1920:
        suggestions.append("Image is very large; consider resizing for web use.")
    if fmt.upper() == "BMP":
        suggestions.append("BMP format is not web-optimised; convert to PNG or JPEG.")
    if not has_transparency and fmt.upper() == "PNG" and width * height > 100_000:
        suggestions.append("Opaque PNG – JPEG may give a smaller file size.")
    orientation_only = [f"{orientation} image"] if orientation else []
    if not alt_parts or alt_parts == orientation_only:
        suggestions.append(
            "No filename hint available. Provide a descriptive alt text such as "
            "'Screenshot of the monthly budget chart showing expenses by category'."
        )

    return ImageDescribeResponse(
        format=fmt,
        width=width,
        height=height,
        mode=mode,
        has_transparency=has_transparency,
        estimated_alt_text=estimated_alt,
        suggestions=suggestions,
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
