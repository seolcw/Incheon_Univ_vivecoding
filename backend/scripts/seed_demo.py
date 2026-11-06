"""memory는 앱 안에서 시드. CLI 초기화는 명시적으로 선택한 대회용 Firestore만."""

import argparse

from meetup_repo import MeetupRecord, MeetupRepo, get_repo, storage_mode


def demo_meetup(campus_source: str = "demo") -> MeetupRecord:
    record: MeetupRecord = {
        "id": "demo-m1", "roomId": "eng-303", "title": "카공 모여라", "category": "study",
        "description": "조용히 각자 공부해요. 콘센트 자리 있음",
        "startAt": "2026-11-06T15:00:00+09:00", "endAt": "2026-11-06T17:00:00+09:00",
        "maxMembers": 4, "hostId": "u-demo-host", "hostNickname": "민지",
        "members": [{"userId": "u-demo-host", "nickname": "민지", "joinedAt": "2026-11-06T14:58:00+09:00"}],
        "status": "open", "createdAt": "2026-11-06T14:58:00+09:00",
    }
    if campus_source == "seed":
        record.update(roomId="eng-316", startAt="2026-11-10T14:00:00+09:00",
                      endAt="2026-11-10T16:00:00+09:00", createdAt="2026-11-10T13:58:00+09:00")
        record["members"][0]["joinedAt"] = "2026-11-10T13:58:00+09:00"
    return record


def seed_memory(repo: MeetupRepo, campus_source: str = "demo") -> None:
    if repo.get("demo-m1") is None:
        repo.save(demo_meetup(campus_source))


def main() -> None:
    parser = argparse.ArgumentParser(description="대회 전용 meetups 초기화(다른 모임 삭제)")
    parser.add_argument("--reset-contest-meetups", action="store_true", help="대회 전용 DB의 모임 삭제를 명시적으로 선택")
    args = parser.parse_args()
    if storage_mode() == "memory":
        parser.error("memory는 이 명령으로 실행 중 서버를 바꿀 수 없습니다. 서버를 재시작하세요.")
    if not args.reset_contest_meetups:
        parser.error("대회 전용 DB인지 확인한 뒤 --reset-contest-meetups를 지정하세요.")
    repo = get_repo()
    import os
    repo.save(demo_meetup(os.environ.get("CAMPUS_SOURCE", "seed")))
    for record in repo.list_all():
        if record["id"] != "demo-m1":
            repo.delete(record["id"])
    print("대회 전용 meetups를 demo-m1 하나로 초기화했습니다.")


if __name__ == "__main__":
    main()
