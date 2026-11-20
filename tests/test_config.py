import pytest
from pydantic import ValidationError

from src.config import Settings


def test_environment_override(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    assert Settings(_env_file=None).app_env == "test"


def test_invalid_environment_rejected():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, app_env="invalid")
