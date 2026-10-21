"""Download arXiv PDFs listed in papers.json and extract plain text.

The extracted text is the agent's corpus. It is gitignored and bundled into the
Worker at build time, so full texts are never served as public static files.
"""
import json
import pathlib
import subprocess
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "corpus-src"


def main():
    papers = json.loads((ROOT / "papers.json").read_text())
    SRC.mkdir(exist_ok=True)
    for p in papers:
        arxiv = p["arxiv"]
        pdf = SRC / f"{arxiv}.pdf"
        txt = SRC / f"{arxiv}.txt"
        if not pdf.exists():
            req = urllib.request.Request(
                f"https://arxiv.org/pdf/{arxiv}",
                headers={"User-Agent": "naokiwake.com paper-agent build"},
            )
            pdf.write_bytes(urllib.request.urlopen(req, timeout=60).read())
            time.sleep(3)
        subprocess.run(["pdftotext", "-q", str(pdf), str(txt)], check=True)
        print(f"{arxiv}: {txt.stat().st_size} bytes")


if __name__ == "__main__":
    main()
