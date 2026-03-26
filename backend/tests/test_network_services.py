from app.modules.network import services


class _FakeHostState(dict):
    def state(self) -> str:
        return self.get("status", "down")


class _FakePortScanner:
    scan_calls: list[tuple[str, str]] = []

    def __init__(self) -> None:
        self._scan_result: dict[str, dict] = {"scan": {}}
        self._hosts: list[str] = []

    def scan(self, hosts: str, arguments: str) -> None:
        self.scan_calls.append((hosts, arguments))
        if "-sn" in arguments:
            self._hosts = ["192.168.1.10", "192.168.1.20"]
            self._scan_result = {
                "scan": {
                    "192.168.1.10": {
                        "status": "up",
                        "addresses": {"mac": "AA-BB-CC-DD-EE-10"},
                        "hostnames": [{"name": "switch-core"}],
                        "vendor": {"AA:BB:CC:DD:EE:10": "Cisco"},
                    },
                    "192.168.1.20": {
                        "status": "up",
                        "addresses": {"mac": "AA-BB-CC-DD-EE-20"},
                        "hostnames": [{"name": "pc-amministrazione"}],
                        "vendor": {"AA:BB:CC:DD:EE:20": "Dell"},
                    },
                }
            }
            return

        self._hosts = ["192.168.1.10"]
        self._scan_result = {
            "scan": {
                "192.168.1.10": {
                    "tcp": {
                        22: {"state": "open"},
                        443: {"state": "open"},
                    }
                }
            }
        }

    def all_hosts(self) -> list[str]:
        return self._hosts

    def __getitem__(self, host: str) -> _FakeHostState:
        return _FakeHostState(self._scan_result["scan"][host])


def test_run_nmap_scan_keeps_hosts_without_open_ports(monkeypatch) -> None:
    _FakePortScanner.scan_calls = []
    monkeypatch.setattr(services, "nmap", type("FakeNmapModule", (), {"PortScanner": _FakePortScanner}))
    monkeypatch.setattr(services.shutil, "which", lambda value: "/usr/bin/nmap" if value == "nmap" else None)

    hosts = services._run_nmap_scan("192.168.1.0/24", "22,443")

    assert len(hosts) == 2
    assert hosts[0].ip_address == "192.168.1.10"
    assert hosts[0].hostname == "switch-core"
    assert hosts[0].open_ports == [22, 443]
    assert hosts[1].ip_address == "192.168.1.20"
    assert hosts[1].hostname == "pc-amministrazione"
    assert hosts[1].open_ports == []
    assert hosts[1].vendor == "Dell"
