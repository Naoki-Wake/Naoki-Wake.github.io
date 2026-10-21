"""Bundle paper texts and author notes into the Worker, and publish the FAQ index.

Writes:
  worker/src/corpus.js      (gitignored; full texts stay inside the Worker)
  ../papers/faq/index.json  (public list of papers that have an agent)
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
SITE = ROOT.parent


def clean(text):
    text = text.replace("\f", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def read_notes(arxiv):
    path = ROOT / "notes" / f"{arxiv}.md"
    if not path.exists():
        return ""
    # Template guidance lives in HTML comments; only what the author writes is used.
    text = re.sub(r"<!--.*?-->", "", path.read_text(), flags=re.S)
    lines = [l for l in text.splitlines() if l.strip() and not l.lstrip().startswith("#")]
    return text.strip() if lines else ""


def main():
    papers = json.loads((ROOT / "papers.json").read_text())
    corpus = {}
    for p in papers:
        src = ROOT / "corpus-src" / f"{p['arxiv']}.txt"
        if not src.exists():
            raise SystemExit(f"Missing {src}. Run scripts/fetch_papers.py first.")
        corpus[p["arxiv"]] = {**p, "text": clean(src.read_text()), "notes": read_notes(p["arxiv"])}

    out = ROOT / "worker" / "src" / "corpus.js"
    out.write_text("export const CORPUS = " + json.dumps(corpus, ensure_ascii=False) + ";\n")

    index = SITE / "papers" / "faq" / "index.json"
    index.write_text(json.dumps([p["arxiv"] for p in papers], indent=2) + "\n")

    for arxiv, p in corpus.items():
        notes = "with notes" if p["notes"] else "no notes"
        print(f"{arxiv}: {len(p['text'])} chars, {notes}")
    print(f"Wrote {out.relative_to(SITE)} ({out.stat().st_size // 1024} KB) and {index.relative_to(SITE)}")


if __name__ == "__main__":
    main()
