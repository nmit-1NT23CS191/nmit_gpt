"""Run Phase 1 database migrations using the Supabase CLI.
Requires the Supabase CLI to be installed and the user to be logged in.
"""
import subprocess
import os

def run_sql(file_path: str):
    cmd = ["supabase", "db", "execute", "-f", file_path]
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    base_dir = os.path.abspath(os.path.dirname(__file__))
    for sql_file in ["schema.sql", "policies.sql"]:
        path = os.path.join(base_dir, sql_file)
        print(f"Executing {sql_file} …")
        run_sql(path)
    print("✅ Phase 1 migrations applied.")
