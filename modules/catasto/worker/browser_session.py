from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path

from playwright.async_api import Browser, BrowserContext, Download, Page, Playwright, TimeoutError, async_playwright


SISTER_LOGIN_URL = "https://iampe.agenziaentrate.gov.it/sam/UI/Login?realm=/agenziaentrate"
SISTER_TAB_SELECTOR = "a.nav-link[href='#tab-5']"
SISTER_USERNAME_SELECTOR = "#username-sister"
SISTER_PASSWORD_SELECTOR = "#password-sister"
SISTER_LOGIN_BUTTON = "#tab-5 form button[type='submit']"
SISTER_CONFIRM_BUTTON = "//input[@value='Conferma']"
SISTER_TERRITORIO_SELECTOR = "select[name='listacom']"
SISTER_CATASTO_SELECTOR = "select[name='tipoCatasto']"
SISTER_COMUNE_SELECTOR = "select[name='denomComune']"
SISTER_SEZIONE_SELECTOR = "input[name='sezione'], select[name='sezione']"
SISTER_FOGLIO_SELECTOR = "input[name='foglio']"
SISTER_PARTICELLA_SELECTOR = "input[name='particella1']"
SISTER_SUBALTERNO_SELECTOR = "input[name='subalterno1']"
SISTER_MOTIVO_SELECTOR = "select[name='motivoLista']"
SISTER_VISURA_BUTTON = "input[name='scelta'][value='Visura']"
SISTER_TIPO_VISURA_SELECTOR = "input[name='tipoVisura']"
SISTER_CAPTCHA_FIELD = "input[name='codSicurezza']"
SISTER_CAPTCHA_IMAGE = "img[src*='captcha' i]"
SISTER_INOLTRA_BUTTON = "input[name='inoltra'][value='Inoltra']"
SISTER_SAVE_BUTTON = "input[name='metodo'][value='Salva']"
SISTER_UFFICIO_VALUE = "ORISTANO Territorio-OR"
SISTER_MOTIVO_VALUE = "Altri fini istituzionali "


@dataclass(slots=True)
class BrowserSessionConfig:
    headless: bool = True
    session_timeout_sec: int = 1680
    debug_pause: bool = False


@dataclass(slots=True)
class BrowserConnectionProbeResult:
    reachable: bool
    authenticated: bool
    message: str


class BrowserSession:
    def __init__(self, config: BrowserSessionConfig) -> None:
        self.config = config
        self._playwright: Playwright | None = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._page: Page | None = None
        self._authenticated_until: datetime | None = None
        self._username: str | None = None

    @property
    def page(self) -> Page:
        if self._page is None:
            raise RuntimeError("Browser page not initialized")
        return self._page

    async def start(self) -> None:
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=self.config.headless)
        self._context = await self._browser.new_context(accept_downloads=True)
        self._page = await self._context.new_page()

    async def stop(self) -> None:
        if self._context is not None:
            await self._context.close()
        if self._browser is not None:
            await self._browser.close()
        if self._playwright is not None:
            await self._playwright.stop()

    async def ensure_authenticated(self, username: str, password: str) -> None:
        if (
            self._username == username
            and self._authenticated_until is not None
            and datetime.now(UTC) < self._authenticated_until
        ):
            return

        await self.login(username, password)

    async def test_connection(self, username: str, password: str) -> BrowserConnectionProbeResult:
        page = self.page
        reachable = False
        try:
            await page.goto(SISTER_LOGIN_URL, wait_until="domcontentloaded")
            reachable = True
            await page.click(SISTER_TAB_SELECTOR)
            await page.fill(SISTER_USERNAME_SELECTOR, username)
            await page.fill(SISTER_PASSWORD_SELECTOR, password)
            await page.click(SISTER_LOGIN_BUTTON)
            await self._maybe_click_xpath(SISTER_CONFIRM_BUTTON)
            await page.get_by_role("link", name="Consultazioni e Certificazioni").wait_for(timeout=12000)
            return BrowserConnectionProbeResult(
                reachable=True,
                authenticated=True,
                message="Autenticazione SISTER confermata dal worker.",
            )
        except TimeoutError:
            return BrowserConnectionProbeResult(
                reachable=reachable,
                authenticated=False,
                message="Portale raggiunto ma autenticazione SISTER non confermata.",
            )
        except Exception as exc:
            return BrowserConnectionProbeResult(
                reachable=reachable,
                authenticated=False,
                message=f"Errore probe SISTER: {exc}",
            )

    async def login(self, username: str, password: str) -> None:
        page = self.page
        await page.goto(SISTER_LOGIN_URL, wait_until="domcontentloaded")
        await page.click(SISTER_TAB_SELECTOR)
        await page.fill(SISTER_USERNAME_SELECTOR, username)
        await page.fill(SISTER_PASSWORD_SELECTOR, password)
        await page.click(SISTER_LOGIN_BUTTON)
        await self._maybe_click_xpath(SISTER_CONFIRM_BUTTON)
        await self._goto_visura_menu()
        self._username = username
        self._authenticated_until = datetime.now(UTC) + timedelta(seconds=self.config.session_timeout_sec)

        if self.config.debug_pause:
            await page.pause()

    async def open_visura_form(self) -> None:
        page = self.page
        await self._goto_visura_menu()
        if await page.locator(SISTER_TERRITORIO_SELECTOR).count() > 0:
            await page.select_option(SISTER_TERRITORIO_SELECTOR, value=SISTER_UFFICIO_VALUE)
            await page.get_by_role("button", name="Applica").click()
        await page.get_by_role("link", name="Immobile").click()
        await page.wait_for_selector(SISTER_CATASTO_SELECTOR)

    async def fill_visura_form(self, request) -> None:
        page = self.page
        await page.select_option(SISTER_CATASTO_SELECTOR, label=request.catasto)
        await page.select_option(SISTER_COMUNE_SELECTOR, value=request.comune_codice)

        if request.sezione:
            if await page.locator("select[name='sezione']").count() > 0:
                await page.select_option("select[name='sezione']", label=request.sezione)
            elif await page.locator("input[name='sezione']").count() > 0:
                await page.fill("input[name='sezione']", request.sezione)

        await page.fill(SISTER_FOGLIO_SELECTOR, request.foglio)
        await page.fill(SISTER_PARTICELLA_SELECTOR, request.particella)
        if request.subalterno:
            await page.fill(SISTER_SUBALTERNO_SELECTOR, request.subalterno)
        await page.select_option(SISTER_MOTIVO_SELECTOR, value=SISTER_MOTIVO_VALUE)
        await page.click(SISTER_VISURA_BUTTON)
        await page.wait_for_selector(SISTER_TIPO_VISURA_SELECTOR)
        await page.check(f"{SISTER_TIPO_VISURA_SELECTOR}[value='{self.tipo_visura_value(request.tipo_visura)}']")

    async def capture_captcha_image(self) -> bytes:
        await self.page.wait_for_selector(SISTER_CAPTCHA_IMAGE)
        return await self.page.locator(SISTER_CAPTCHA_IMAGE).screenshot(type="png")

    async def submit_captcha(self, text: str) -> bool:
        page = self.page
        await page.fill(SISTER_CAPTCHA_FIELD, text)
        await page.click(SISTER_INOLTRA_BUTTON)

        try:
            await page.wait_for_selector(SISTER_SAVE_BUTTON, timeout=12000)
            return True
        except TimeoutError:
            return await page.locator(SISTER_SAVE_BUTTON).count() > 0

    async def download_pdf(self, destination: Path) -> int:
        page = self.page
        destination.parent.mkdir(parents=True, exist_ok=True)
        async with page.expect_download(timeout=20000) as download_info:
            await page.click(SISTER_SAVE_BUTTON)
        download: Download = await download_info.value
        await download.save_as(str(destination))
        return destination.stat().st_size

    async def _goto_visura_menu(self) -> None:
        page = self.page
        await page.get_by_role("link", name="Consultazioni e Certificazioni").click()
        await page.get_by_role("link", name="Visure catastali").click()
        await self._maybe_click_text("Conferma Lettura")

    async def _maybe_click_xpath(self, xpath: str) -> None:
        locator = self.page.locator(f"xpath={xpath}")
        if await locator.count() > 0:
            await locator.first.click()

    async def _maybe_click_text(self, text: str) -> None:
        locator = self.page.get_by_role("button", name=text)
        if await locator.count() > 0:
            await locator.first.click()

    @staticmethod
    def tipo_visura_value(tipo_visura: str) -> str:
        return "3" if tipo_visura == "Sintetica" else "2"
