"""Acceptance checks for the initial seed and fixed-response routers."""

import json
import os
from pathlib import Path
import re
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend import db
from backend.core import routes_chat, routes_rooms, seed_loader


class InitialBackendTests(unittest.TestCase):
    def test_seed_layout_and_weekday_coverage(self):
        rooms = seed_loader.list_rooms()
        self.assertEqual(len(rooms), 36)
        self.assertEqual(len({room['id'] for room in rooms}), 36)
        buildings = {room['buildingId'] for room in rooms}
        self.assertEqual(len(buildings), 3)
        for building_id in buildings:
            self.assertEqual(seed_loader.get_building(building_id)['floors'], [1, 2, 3])
            building_rooms = [r for r in rooms if r['buildingId'] == building_id]
            for floor in (1, 2, 3):
                self.assertEqual(sum(r['floor'] == floor for r in building_rooms), 4)
            for day in range(1, 6):
                for minute in range(9 * 60, 18 * 60 + 1):
                    time = f'{minute // 60:02}:{minute % 60:02}'
                    occupied = sum(any(s['dayOfWeek'] == day and
                                       s['startTime'] <= time < s['endTime']
                                       for s in r['schedule']) for r in building_rooms)
                    self.assertTrue(0 < occupied < 12, (building_id, day, time))

    def test_friday_demo(self):
        friday = lambda room_id: [s for s in seed_loader.get_room(room_id)['schedule']
                                  if s['dayOfWeek'] == 5]
        self.assertEqual(friday('eng-301'), [
            {'dayOfWeek': 5, 'startTime': '13:00', 'endTime': '14:15', 'title': '자료구조'},
            {'dayOfWeek': 5, 'startTime': '17:00', 'endTime': '18:15', 'title': '알고리즘'},
        ])
        self.assertEqual(friday('eng-302'), [
            {'dayOfWeek': 5, 'startTime': '14:30', 'endTime': '15:50', 'title': '운영체제'},
        ])
        self.assertEqual(friday('eng-303'), [])
        self.assertTrue(all(s['endTime'] <= '15:10' for s in friday('eng-304')))
        for floor, expected in ((1, 2), (2, 2), (3, 3)):
            rooms = [r for r in seed_loader.list_rooms()
                     if r['buildingId'] == 'eng' and r['floor'] == floor]
            empty = sum(not any(s['startTime'] <= '15:10' < s['endTime']
                                for s in friday(r['id'])) for r in rooms)
            self.assertEqual(empty, expected)

    def test_contract_examples_over_http(self):
        app = FastAPI()
        app.include_router(routes_rooms.router)
        app.include_router(routes_chat.router)
        contract = (Path(__file__).resolve().parents[2] / 'contracts' / 'api.md').read_text(encoding='utf-8')
        with TestClient(app) as client:
            for heading, method, path in (
                ('GET /api/buildings', 'GET', '/api/buildings'),
                ('GET /api/rooms', 'GET', '/api/rooms?buildingId=eng&floor=3'),
                ('GET /api/rooms/{roomId}', 'GET', '/api/rooms/eng-301'),
                ('POST /api/chat (시간 나면)', 'POST', '/api/chat'),
            ):
                section = contract.split('### ' + heading + '\n', 1)[1].split('\n### ', 1)[0]
                expected = json.loads(re.search(r'```json\s*(.*?)\s*```',
                                     section.split('응답 200', 1)[1], re.S).group(1))
                response = client.request(method, path)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json(), expected)

    def test_memory_client_needs_no_credentials(self):
        with patch.dict(os.environ, {'STORAGE': 'memory'}, clear=True):
            self.assertIsNone(db.get_client())


if __name__ == '__main__':
    unittest.main()
