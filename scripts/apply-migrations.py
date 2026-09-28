"""
Apply SQL migration files to the production Supabase project through the
Management API (needs SUPABASE_ACCESS_TOKEN — a personal access token — in
.env.local or the environment). Runs each file as one statement batch, stops
on the first error, prints the result of the verification query at the end.

  python scripts/apply-migrations.py --check                 # token + connectivity only
  python scripts/apply-migrations.py 0022 0023 0024 0025 0026 # apply in this order
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
    try:
        with open(os.path.join(ROOT, ".env.local"), encoding="utf-8") as f:
            for line in f:
                m = re.match(r"^SUPABASE_ACCESS_TOKEN=(.+)$", line.strip())
                if m:
                    return m.group(1).strip().strip('"')
    except FileNotFoundError:
        pass
    sys.exit("SUPABASE_ACCESS_TOKEN not found (.env.local or environment)")


def run_sql(token: str, sql: str):
    req = urllib.request.Request(
        API,
        data=json.dumps({"query": sql}).encode("utf-8"),
        method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            body = r.read().decode("utf-8")
            return r.status, (json.loads(body) if body else None)
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def main():
    token = load_token()
    args = sys.argv[1:]
    OK_STATUSES = (200, 201)  # the Management API answers 201 for a successful query
    status, out = run_sql(token, "select current_database() as db, current_user as usr, now() as at")
    print("check:", status, out if status in OK_STATUSES else str(out)[:400])
    if status not in OK_STATUSES:
        sys.exit(1)
    if "--check" in args or not args:
        return

    mig_dir = os.path.join(ROOT, "supabase", "migrations")
    files = sorted(os.listdir(mig_dir))
    for prefix in args:
        match = [f for f in files if f.startswith(prefix)]
        if len(match) != 1:
            sys.exit(f"migration {prefix}: expected exactly one file, got {match}")
        path = os.path.join(mig_dir, match[0])
        with open(path, encoding="utf-8") as f:
            sql = f.read()
        status, out = run_sql(token, sql)
        ok = status in (200, 201)
        print(f"{'OK ' if ok else 'ERR'} {match[0]} -> {status} {'' if ok else str(out)[:600]}")
        if not ok:
            sys.exit(1)

    verify = """
select 'try_consume_quota returns daily_limit' as check_name, count(*)::text as value from information_schema.parameters where specific_schema='entrium' and specific_name like 'try_consume_quota%' and parameter_name='daily_limit'
union all select 'get_usage_status exists', count(*)::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='entrium' and p.proname='get_usage_status'
union all select 'programs table', count(*)::text from information_schema.tables where table_schema='entrium' and table_name='programs'
union all select 'scholarships.status column', count(*)::text from information_schema.columns where table_schema='entrium' and table_name='scholarships' and column_name='status'
union all select 'plan_tasks table', count(*)::text from information_schema.tables where table_schema='entrium' and table_name='plan_tasks'
"""
    status, out = run_sql(token, verify)
    print("verify:", status)
    if status in (200, 201) and isinstance(out, list):
        for row in out:
            print(f"  {row.get('check_name')}: {row.get('value')}")
    else:
        print(str(out)[:600])


if __name__ == "__main__":
    main()
