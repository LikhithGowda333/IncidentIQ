import uuid
import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from app.db.database import get_db
from app.auth.security import hash_password, verify_password, create_access_token, get_current_user
from app.schemas.schemas import UserRegister, UserLogin, UserResponse, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email = ?", (user_in.email.lower(),))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )
            
        user_id = str(uuid.uuid4())
        hashed = hash_password(user_in.password)
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        cursor.execute("""
        INSERT INTO users (id, email, password_hash, full_name, created_at, last_login)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, user_in.email.lower(), hashed, user_in.full_name, now, now))
        
        token = create_access_token({"sub": user_id, "email": user_in.email.lower()})
        return TokenResponse(
            access_token=token,
            token_type="Bearer",
            user=UserResponse(
                id=user_id,
                email=user_in.email.lower(),
                full_name=user_in.full_name,
                created_at=now,
                last_login=now
            )
        )

@router.post("/login", response_model=TokenResponse)
def login(creds: UserLogin):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, password_hash, full_name, created_at, last_login FROM users WHERE email = ?", (creds.email.lower(),))
        user = cursor.fetchone()
        
        if not user or not verify_password(creds.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password. Please verify your credentials."
            )
            
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        cursor.execute("UPDATE users SET last_login = ? WHERE id = ?", (now, user["id"]))
        
        token = create_access_token({"sub": user["id"], "email": user["email"]})
        return TokenResponse(
            access_token=token,
            token_type="Bearer",
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                full_name=user["full_name"],
                created_at=user["created_at"],
                last_login=now
            )
        )

@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    # Stateless JWT: client discards token
    return {"message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        full_name=current_user["full_name"],
        created_at=current_user["created_at"],
        last_login=current_user.get("last_login")
    )
