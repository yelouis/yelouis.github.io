"""Stamp every local CSS/JS URL in the site's HTML with a content hash.

GitHub Pages serves every file with `Cache-Control: max-age=600`, and the
pages load their CSS and JS from fixed URLs. A reload in the ten minutes
after a deploy re-checks the HTML but reuses the CSS and JS still cached
from the previous deploy, so the new markup renders with the old styles and
the old script. With a hash of each file's contents in its URL, a deploy's
HTML can only ever load the exact CSS and JS it was built with.

Usage: python3 .github/scripts/version_assets.py [site_root]
"""
import hashlib
import pathlib
import re
import sys

# href="…" / src="…" pointing at a relative .css or .js file (not a CDN URL)
LOCAL_ASSET = re.compile(
    r'(?P<lead>\b(?:href|src)=")(?P<path>(?!https?:|//|/)[^"?#]+\.(?:css|js))(?P<tail>")'
)


def main() -> None:
    root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    stamped = 0
    for page in sorted(root.rglob("*.html")):
        if any(part.startswith(".") for part in page.relative_to(root).parts):
            continue  # .git, .github, …
        html = page.read_text(encoding="utf-8")

        def stamp(match: re.Match) -> str:
            nonlocal stamped
            asset = page.parent / match["path"]
            # A reference to a missing file raises here and fails the deploy.
            digest = hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
            stamped += 1
            print(f"{page.relative_to(root)}: {match['path']}?v={digest}")
            return f"{match['lead']}{match['path']}?v={digest}{match['tail']}"

        new_html = LOCAL_ASSET.sub(stamp, html)
        if new_html != html:
            page.write_text(new_html, encoding="utf-8")
    if stamped == 0:
        sys.exit("version_assets: found no local CSS/JS references to stamp")


if __name__ == "__main__":
    main()
