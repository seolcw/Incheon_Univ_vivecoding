"""Delegate to be-a's repository without maintaining another store."""

from importlib import import_module

def list_open_meetups(room_id: str | None = None) -> list[dict]:
    package = __package__.rpartition(".")[0]
    repo_name = f"{package}.meetup_repo" if package else "meetup_repo"
    return import_module(repo_name).list_open(room_id=room_id)
