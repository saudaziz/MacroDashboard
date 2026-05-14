import os
import pytest
from unittest.mock import patch
from backend.env_loader import get_env_variable

def test_get_env_variable_success():
    """Verify that an existing environment variable is retrieved correctly."""
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-key-123"}):
        assert get_env_variable("OPENROUTER_API_KEY") == "test-key-123"

def test_get_env_variable_missing():
    """Verify that an EnvironmentError is raised when the key is missing."""
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(EnvironmentError, match="Environment variable 'NON_EXISTENT_KEY' is not set."):
            get_env_variable("NON_EXISTENT_KEY")

def test_get_env_variable_default():
    """Verify that the default value is returned when the key is missing."""
    with patch.dict(os.environ, {}, clear=True):
        assert get_env_variable("OPTIONAL_KEY", default="default-val") == "default-val"
