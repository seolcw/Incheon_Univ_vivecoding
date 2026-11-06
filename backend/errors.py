"""Shared API exception used by room and meetup routes."""


class ApiError(Exception):
    def __init__(self, code: str, status: int, message: str):
        self.code = code
        self.status = status
        self.message = message
        super().__init__(message)
