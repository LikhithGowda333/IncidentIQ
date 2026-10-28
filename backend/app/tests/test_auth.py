import pytest
from app.db.database import init_db, get_db
from app.api.auth import register, login, get_me
from app.schemas.schemas import UserRegister, UserLogin
from app.auth.security import hash_password, verify_password, create_access_token, decode_access_token
from fastapi import HTTPException

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_password_hashing_and_verification():
    raw = "SecureP@ssw0rd123"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_login_demo_user():
    res = login(UserLogin(email="demo@incidentiq.local", password="Demo1234!"))
    assert res.access_token is not None
    assert res.user.email == "demo@incidentiq.local"

def test_login_invalid_password():
    with pytest.raises(HTTPException) as exc_info:
        login(UserLogin(email="demo@incidentiq.local", password="WrongPassword!"))
    assert exc_info.value.status_code == 401

def test_register_new_user_and_prevent_duplicates():
    import uuid
    email = f"unique_sre_{uuid.uuid4().hex[:8]}@incidentiq.local"
    res = register(UserRegister(full_name="New SRE", email=email, password="MySecurePassword123!"))
    assert res.user.email == email
    assert res.access_token is not None
    
    # Duplicate attempt must fail with 400
    with pytest.raises(HTTPException) as exc_info:
        register(UserRegister(full_name="Duplicate SRE", email=email, password="AnotherPassword123!"))
    assert exc_info.value.status_code == 400

def test_jwt_token_creation_and_decoding():
    token = create_access_token({"sub": "user-1234", "email": "test@example.com"})
    payload = decode_access_token(token)
    assert payload["sub"] == "user-1234"
    assert payload["email"] == "test@example.com"
