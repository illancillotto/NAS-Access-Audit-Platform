import asyncio
from pathlib import Path
import sys
from tempfile import TemporaryDirectory


WORKER_ROOT = Path(__file__).resolve().parents[1]

if str(WORKER_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKER_ROOT))

from visura_flow import ManualCaptchaDecision, execute_visura_flow


class FakeRequest:
    id = "req-1"


class FakeCaptchaSolver:
    def solve(self, _image_bytes: bytes) -> str | None:
        return None


class FakeBrowser:
    def __init__(self) -> None:
        self.submit_attempts: list[str] = []

    async def open_visura_form(self) -> None:
        return None

    async def fill_visura_form(self, _request) -> None:
        return None

    async def capture_captcha_image(self) -> bytes:
        return b"fake-captcha"

    async def submit_captcha(self, text: str) -> bool:
        self.submit_attempts.append(text)
        return text == "AB12"

    async def download_pdf(self, document_path: Path) -> int:
        document_path.parent.mkdir(parents=True, exist_ok=True)
        document_path.write_bytes(b"%PDF-1.4\n")
        return document_path.stat().st_size


def test_visura_flow_uses_external_fallback_before_manual() -> None:
    browser = FakeBrowser()
    operations: list[str] = []

    async def fake_external_solver(_image_bytes: bytes) -> str | None:
        return "AB12"

    async def fake_manual_solver(_image_path: Path) -> ManualCaptchaDecision:
        raise AssertionError("Manual CAPTCHA should not be requested")

    with TemporaryDirectory() as tmp_dir:
        result = asyncio.run(
            execute_visura_flow(
                browser=browser,
                request=FakeRequest(),
                document_path=Path(tmp_dir) / "visura.pdf",
                captcha_dir=Path(tmp_dir) / "captcha",
                captcha_solver=FakeCaptchaSolver(),
                max_ocr_attempts=1,
                get_manual_captcha_decision=fake_manual_solver,
                solve_external_captcha=fake_external_solver,
                update_operation=operations.append,
            )
        )

    assert result.status == "completed"
    assert result.captcha_method == "external"
    assert "Tentativo CAPTCHA servizio esterno" in operations
    assert browser.submit_attempts == ["AB12"]
