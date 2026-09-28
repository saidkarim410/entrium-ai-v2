"""
Run one read-only or data-fix SQL statement against production through the
Supabase Management API and print rows as JSON. Token from SUPABASE_ACCESS_TOKEN
(.env.local). Use for reports and small data fixes; schema changes go through
migrations + scripts/apply-migrations.py.

  python scripts/sql.py "select count(*) from entrium.scholarships"
  python scripts/sql.py -f query.sql
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

PROJECT_REF = "zcbbpqfdyqavdubzrgaf"
API = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_token() -> str:
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if token:
        return token
    with open(os.path.join(ROOT, ".env.local"), encoding="utf-8") as f:
        for line in f:
            m = re.match(r"^SUPABASE_ACCESS_TOKEN=(.+)$", line.strip())
            if m:
                return m.group(1).strip().strip('"')
    sys.exit("SUPABASE_ACCESS_TOKEN not found")


def main():
    # Windows consoles default to cp1251 — force UTF-8 so names with accents print
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    if args[0] == "-f":
        with open(args[1], encoding="utf-8") as f:
            sql = f.read()
    else:
        sql = " ".join(args)
    req = urllib.request.Request(
        API,
        data=json.dumps({"query": sql}).encode("utf-8"),
        method="POST",
        headers={"Authorization": f"Bearer {load_token()}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            body = r.read().decode("utf-8")
            print(json.dumps(json.loads(body) if body else None, ensure_ascii=False, indent=1))
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode("utf-8", "replace")[:800])
        sys.exit(1)


if __name__ == "__main__":
    main()
