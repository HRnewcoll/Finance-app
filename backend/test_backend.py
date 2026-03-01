"""Backend tests for accessibility tools API."""

import base64
import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Colour-contrast / check
# ---------------------------------------------------------------------------

def test_contrast_check_black_on_white():
    resp = client.post(
        "/api/color-contrast/check",
        json={"foreground": "#000000", "background": "#ffffff"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["contrast_ratio"] == 21.0
    assert data["wcag_level"] == "AAA"
    assert data["passes_aa"] is True
    assert data["passes_aaa"] is True


def test_contrast_check_low_contrast():
    # Light grey on white – very low contrast
    resp = client.post(
        "/api/color-contrast/check",
        json={"foreground": "#cccccc", "background": "#ffffff"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["wcag_level"] == "Fail"
    assert data["passes_aa"] is False
    assert data["passes_aaa"] is False


def test_contrast_check_aa_pass():
    # Dark blue on white should pass AA
    resp = client.post(
        "/api/color-contrast/check",
        json={"foreground": "#005fcc", "background": "#ffffff"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["passes_aa"] is True


def test_contrast_check_shorthand_hex():
    resp = client.post(
        "/api/color-contrast/check",
        json={"foreground": "#000", "background": "#fff"},
    )
    assert resp.status_code == 200
    assert resp.json()["contrast_ratio"] == 21.0


def test_contrast_check_invalid_hex():
    resp = client.post(
        "/api/color-contrast/check",
        json={"foreground": "notacolour", "background": "#ffffff"},
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Colour-contrast / fix
# ---------------------------------------------------------------------------

def test_contrast_fix_already_passing():
    resp = client.post(
        "/api/color-contrast/fix",
        json={"foreground": "#000000", "background": "#ffffff", "target": "AA"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["suggested_foreground"] == "#000000"
    assert data["contrast_ratio"] >= 4.5


def test_contrast_fix_improves_contrast():
    # Very light grey on white – should be fixed
    resp = client.post(
        "/api/color-contrast/fix",
        json={"foreground": "#bbbbbb", "background": "#ffffff", "target": "AA"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["contrast_ratio"] >= 4.5


def test_contrast_fix_aaa_target():
    resp = client.post(
        "/api/color-contrast/fix",
        json={"foreground": "#777777", "background": "#ffffff", "target": "AAA"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["contrast_ratio"] >= 7.0


# ---------------------------------------------------------------------------
# ARIA validation
# ---------------------------------------------------------------------------

def test_aria_validate_clean_html():
    html = """
    <html><body>
      <main>
        <img src="logo.png" alt="Company logo" />
        <button>Click me</button>
        <label for="name">Name</label>
        <input id="name" type="text" />
        <a href="/">Home</a>
      </main>
    </body></html>
    """
    resp = client.post("/api/aria/validate", json={"html": html})
    assert resp.status_code == 200
    data = resp.json()
    assert data["passed"] is True
    assert data["issue_count"] == 0


def test_aria_validate_missing_alt():
    html = '<img src="photo.jpg" />'
    resp = client.post("/api/aria/validate", json={"html": html})
    assert resp.status_code == 200
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "img-alt" in rules


def test_aria_validate_empty_alt_warning():
    html = '<img src="deco.png" alt="" />'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "img-alt-empty" in rules


def test_aria_validate_missing_input_label():
    html = '<input type="text" />'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "input-label" in rules


def test_aria_validate_input_with_aria_label():
    html = '<input type="text" aria-label="Search" />'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "input-label" not in rules


def test_aria_validate_empty_button():
    html = "<button></button>"
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "button-name" in rules


def test_aria_validate_empty_link():
    html = '<a href="/about"></a>'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "link-name" in rules


def test_aria_validate_invalid_role():
    html = '<div role="fakeRole">content</div>'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "aria-valid-role" in rules


def test_aria_validate_valid_role():
    html = '<div role="navigation"><a href="/">Home</a></div>'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "aria-valid-role" not in rules


def test_aria_validate_listbox_missing_option():
    html = '<ul role="listbox"><li>Item</li></ul>'
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "aria-required-children" in rules


def test_aria_validate_no_main_landmark():
    html = "<html><body><p>Hello</p></body></html>"
    resp = client.post("/api/aria/validate", json={"html": html})
    issues = resp.json()["issues"]
    rules = [i["rule"] for i in issues]
    assert "landmark-main" in rules


# ---------------------------------------------------------------------------
# Image describe
# ---------------------------------------------------------------------------

def _make_b64_png(width: int = 100, height: int = 60) -> str:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def test_image_describe_basic():
    b64 = _make_b64_png(200, 100)
    resp = client.post(
        "/api/image/describe",
        json={"image_base64": b64, "filename": "budget_chart.png"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["width"] == 200
    assert data["height"] == 100
    assert data["format"] == "PNG"
    assert "budget chart" in data["estimated_alt_text"]


def test_image_describe_square():
    b64 = _make_b64_png(50, 50)
    resp = client.post("/api/image/describe", json={"image_base64": b64})
    assert resp.status_code == 200
    data = resp.json()
    assert data["width"] == 50
    assert data["height"] == 50


def test_image_describe_data_uri_prefix():
    b64 = _make_b64_png()
    uri = f"data:image/png;base64,{b64}"
    resp = client.post("/api/image/describe", json={"image_base64": uri})
    assert resp.status_code == 200
    assert resp.json()["format"] == "PNG"


def test_image_describe_invalid_data():
    resp = client.post("/api/image/describe", json={"image_base64": "notbase64!!"})
    assert resp.status_code == 422
