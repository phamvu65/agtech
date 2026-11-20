"""One-time first-admin provisioning through an explicit operator command."""

import argparse
import getpass
import sys

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from src.auth import passwords
from src.config import Settings
from src.database import User


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["create-admin"])
    parser.add_argument("--username", required=True)
    parser.add_argument("--password-stdin", action="store_true")
    args = parser.parse_args()
    username = args.username.strip().lower()
    if not username or len(username) > 80:
        parser.error("Username must contain 1–80 characters")
    password = sys.stdin.readline().rstrip("\r\n") if args.password_stdin else getpass.getpass("Password: ")
    if not 12 <= len(password) <= 128:
        parser.error("Password must contain 12–128 characters")
    engine = create_engine(Settings().database_url.get_secret_value())
    try:
        with Session(engine) as db:
            if db.scalar(select(User.id).where(User.role == "admin")) is not None:
                parser.error("An administrator already exists; use the authenticated admin API")
            db.add(User(username=username, password_hash=passwords.hash(password), role="admin", active=True))
            db.commit()
        print("Administrator created")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
