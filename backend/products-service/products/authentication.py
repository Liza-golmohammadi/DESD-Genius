from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
import uuid

class JWTUser:
    """Lightweight user object populated entirely from JWT claims."""
    is_anonymous = False
    is_authenticated = True

    def __init__(self, payload: dict):
        self.id = uuid.UUID(payload["user_id"])
        self.is_producer = payload.get("is_producer", False)
        self.store_name = payload.get("store_name", "")


class MicroserviceJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        try:
            return JWTUser(validated_token)
        except (KeyError, ValueError):
            raise InvalidToken("Token missing required claims.")