"""Custom domain exception hierarchy.

All domain exceptions inherit from AppError.
A global exception handler in main.py converts them to JSON responses.
Router/dependency layer may still use HTTPException for HTTP-specific errors (401, 503).
"""


class AppError(Exception):
    """Base exception for all domain errors."""

    def __init__(self, detail: str, status_code: int = 400) -> None:
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class NotFoundError(AppError):
    """Resource not found (404)."""

    def __init__(self, detail: str = "Not found") -> None:
        super().__init__(detail, 404)


class ForbiddenError(AppError):
    """Action not allowed (403)."""

    def __init__(self, detail: str = "Forbidden") -> None:
        super().__init__(detail, 403)


class DuplicateError(AppError):
    """Duplicate resource (409)."""

    def __init__(self, detail: str = "Already exists") -> None:
        super().__init__(detail, 409)


class BusinessRuleError(AppError):
    """Business logic violation (400)."""

    def __init__(self, detail: str) -> None:
        super().__init__(detail, 400)
