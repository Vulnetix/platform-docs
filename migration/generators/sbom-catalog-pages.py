"""Copy the AIBOM and CBOM catalog pages from the CLI's Hugo site into platform-docs.

The CLI generates these pages from its embedded detection catalogs
(`just gen-aibom`, `just gen-cbom` in Vulnetix/cli). Until those generators
write here directly, rerun this after regenerating them:

    uv run migration/generators/sbom-catalog-pages.py /path/to/cli <cli-short-sha>

It rewrites front matter, links and table cells, and removes em dashes.
"""

import re
import sys
from pathlib import Path

CLI = Path(sys.argv[1] if len(sys.argv) > 1 else "../cli")
SHA = sys.argv[2] if len(sys.argv) > 2 else "unknown"
OUT = Path(__file__).resolve().parents[2] / "src/content/docs/sbom"
SRC = CLI / "website/content/docs"
UPDATED = "02 Nov 2026"

PAGES = [
    # (source, dest, title, nav, description, order, catalog file)
    ("aibom/supported-tools.md", "aibom/supported-tools.md", "Supported agents and providers", "Agents and providers",
     "Every AI coding agent, provider service and convention the AIBOM environment, filesystem and commit passes recognise.",
     2, "internal/aibom/catalog/tools.json"),
    ("aibom/libraries.md", "aibom/libraries.md", "AI SDKs and frameworks", "AI SDKs",
     "The AI SDKs the AIBOM source pass detects, and the parameter each one's model name is read from.",
     3, "internal/aibom/catalog/libraries.json"),
    ("aibom/infrastructure.md", "aibom/infrastructure.md", "AI infrastructure in IaC", "AI infrastructure",
     "AI serving runtimes, agent platforms, vector databases, training frameworks and managed AI services detected from Kubernetes, compose, Dockerfile and Terraform files.",
     4, "internal/aibom/catalog/infrastructure.json"),
    ("aibom/catalog-format.md", "aibom/catalog-format.md", "AIBOM catalog format", "Catalog format",
     "The JSON schema of the AIBOM detection catalog, and how --catalog extends or replaces the built-in one.",
     5, "internal/aibom/catalog/tools.json"),
    ("cbom/algorithms.md", "cbom/algorithms.md", "Algorithms", None,
     "Every cryptographic algorithm the CBOM detector recognises, with its primitive, post-quantum status, NIST quantum level and OID.",
     2, "internal/cbom/catalog/algorithms.json"),
    ("cbom/standards-matrix.md", "cbom/standards-matrix.md", "Standards matrix", None,
     "The approval status each standards body gives each algorithm in the CBOM catalog.",
     3, "internal/cbom/catalog/algorithms.json"),
    ("cbom/catalog-format.md", "cbom/catalog-format.md", "CBOM catalog format", "Catalog format",
     "The JSON schema of the CBOM detection catalog, and how --catalog extends or replaces the built-in one.",
     4, "internal/cbom/catalog/algorithms.json"),
]

LINKS = {
    "(../infrastructure/)": "(/sbom/aibom/infrastructure/)",
    "(../supported-tools/)": "(/sbom/aibom/supported-tools/)",
    "(../libraries/)": "(/sbom/aibom/libraries/)",
    "(../catalog-format/)": "(/sbom/aibom/catalog-format/)",
    "(../algorithms/)": "(/sbom/cbom/algorithms/)",
    "(../standards-matrix/)": "(/sbom/cbom/standards-matrix/)",
}


# Sentences the generic em-dash rewrite leaves awkward.
FIXUPS = {
    "the listed parameters: so": "the listed parameters, so",
    "`/hf_cache`: `/models` matches": "`/hf_cache`. `/models` matches",
    "drives the IaC pass: see": "drives the IaC pass (see",
    "for its rule tables; its": "for its rule tables). Its",
}


def escape_table_pipes(line: str) -> str:
    """Escape | inside backtick spans of a table row, so a regex cell stays one cell."""
    if not line.lstrip().startswith("|"):
        return line
    parts = re.split(r"(`[^`]*`)", line)
    return "".join(p.replace("|", "\\|") if p.startswith("`") and p.endswith("`") else p for p in parts)


def clean(body: str, dest: str) -> str:
    for old, new in LINKS.items():
        body = body.replace(old, new)
    if dest.startswith("cbom/"):
        body = body.replace("(/sbom/aibom/catalog-format/)", "(/sbom/cbom/catalog-format/)")
    # A generated-page note, rewritten to name the generator.
    body = re.sub(
        r"^> (?:\*\*)?Generated from the catalog\.?(?:\*\*)?.*$",
        lambda m: "> Generated from the CLI's embedded catalog. To change an entry, edit the catalog file named at the foot of this page in `Vulnetix/cli` and run `just gen-aibom` or `just gen-cbom`.",
        body,
        flags=re.M,
    )
    lines = []
    for line in body.splitlines():
        if line.lstrip().startswith("|"):
            line = re.sub(r"\|\s*—\s*(?=\|)", "| - ", line)
            line = escape_table_pipes(line)
        line = line.replace(" — ", ": ", 1).replace(" — ", ", ").replace("—", "-")
        lines.append(line)
    out = "\n".join(lines).strip() + "\n"
    for old, new in FIXUPS.items():
        out = out.replace(old, new)
    return out


def main() -> None:
    for src, dest, title, nav, desc, order, catalog in PAGES:
        text = (SRC / src).read_text()
        body = re.sub(r"\A---\n.*?\n---\n", "", text, flags=re.S)
        fm = ["---", f"title: {title}", f"description: {desc}", f"order: {order}"]
        if nav:
            fm.append(f"nav: {nav}")
        fm += [f"sources: [cli/{catalog}, cli/{'internal/aibom/aibomgen' if 'aibom' in src else 'internal/cbom/cbomgen'}]",
               f"checked: [cli@{SHA}]", f"updated: {UPDATED}", "---", ""]
        out = OUT / dest
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text("\n".join(fm) + clean(body, dest))
        print("wrote", out)


if __name__ == "__main__":
    main()
