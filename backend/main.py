from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text, or_
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import models
import auth
import email_utils
from database import get_db, engine, Base, SessionLocal
import io
import os
import shutil
import uuid

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None
    ImageOps = None

try:
    from pillow_heif import register_heif_opener
except ImportError:
    register_heif_opener = None

if Image and register_heif_opener:
    register_heif_opener()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Familienkalender")

ALLOWED_AVATAR_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "heic", "heif"}
HEIC_CONTENT_TYPES = {
    "image/heic",
    "image/heif",
    "image/heic-sequence",
    "image/heif-sequence",
}

# Serve uploaded avatars as static files
AVATARS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "avatars")
os.makedirs(AVATARS_DIR, exist_ok=True)
app.mount("/avatars", StaticFiles(directory=AVATARS_DIR), name="avatars")

# Feste Familienliste – Reihenfolge bestimmt die Farbe
ALLOWED_NAMES = [
    "Marco", "Susanna", "Silvio", "Heiko", "Marinho",
    "Chiara", "Keven", "Sandra", "Jana", "Natalia", "Sophie",
]
NAME_COLORS = [
    "#EF4444", "#F97316", "#EAB308", "#22C55E", "#14B8A6",
    "#3B82F6", "#8B5CF6", "#EC4899", "#F43F5E", "#06B6D4", "#84CC16",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ──────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    is_admin: bool
    can_approve: bool = False
    color: str
    avatar_url: Optional[str] = None
    email: Optional[str] = None

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str
    full_name: str
    password: str
    is_admin: bool = False
    can_approve: bool = False
    color: str = "#3B82F6"
    email: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    can_approve: Optional[bool] = None
    color: Optional[str] = None
    email: Optional[str] = None


def parse_participants(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    return [n for n in raw.split(",") if n]


def serialize_participants(names: List[str]) -> str:
    return ",".join(names)


def prepare_avatar_upload(file: UploadFile):
    content_type = (file.content_type or "").lower()
    filename = file.filename or "file"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if not content_type.startswith("image/"):
        raise HTTPException(400, "Nur Bilddateien erlaubt")
    if ext not in ALLOWED_AVATAR_EXTENSIONS:
        raise HTTPException(400, "Nur JPG, PNG, WebP oder HEIC erlaubt")

    is_heic = ext in {"heic", "heif"} or content_type in HEIC_CONTENT_TYPES
    file.file.seek(0)

    if not is_heic:
        return file.file, ext

    if not Image or not ImageOps or not register_heif_opener:
        raise HTTPException(500, "HEIC/HEIF-Unterstuetzung ist auf dem Server noch nicht installiert")

    try:
        with Image.open(file.file) as image:
            image = ImageOps.exif_transpose(image)

            if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
                alpha_image = image.convert("RGBA")
                background = Image.new("RGB", alpha_image.size, (255, 255, 255))
                background.paste(alpha_image, mask=alpha_image.getchannel("A"))
                image = background
            else:
                image = image.convert("RGB")

            output = io.BytesIO()
            image.save(output, format="JPEG", quality=90)
            output.seek(0)
            return output, "jpg"
    except Exception as exc:
        raise HTTPException(400, "HEIC/HEIF-Bild konnte nicht verarbeitet werden") from exc


class EntryOut(BaseModel):
    id: int
    user_id: int
    location: str
    start_date: date
    end_date: date
    participants: List[str] = []
    note: Optional[str]
    status: str = "approved"
    user: UserOut

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_entry(cls, entry):
        data = {
            "id": entry.id,
            "user_id": entry.user_id,
            "location": entry.location,
            "start_date": entry.start_date,
            "end_date": entry.end_date,
            "participants": parse_participants(entry.participants),
            "note": entry.note,
            "status": entry.status or "approved",
            "user": entry.user,
        }
        return cls(**data)


class EntryCreate(BaseModel):
    location: str
    start_date: date
    end_date: date
    participants: List[str] = []
    note: Optional[str] = None


class EntryUpdate(BaseModel):
    location: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    participants: Optional[List[str]] = None
    note: Optional[str] = None


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ── Startup: default admin ────────────────────────────────────────────────────

@app.on_event("startup")
def startup():
    # Migrations for existing databases
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE entries ADD COLUMN participants TEXT DEFAULT ''",
            "ALTER TABLE entries ADD COLUMN status TEXT DEFAULT 'approved'",
            "ALTER TABLE users ADD COLUMN avatar_url TEXT",
            "ALTER TABLE users ADD COLUMN can_approve INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN email TEXT",
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # Column already exists

    db = SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            admin = models.User(
                username="admin",
                full_name="Administrator",
                password_hash=auth.hash_password("admin123"),
                is_admin=True,
                can_approve=True,
                color="#EF4444",
            )
            db.add(admin)
            db.commit()
            print("Standard-Admin erstellt: admin / admin123")
    finally:
        db.close()


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.get("/auth/available-names")
def available_names(db: Session = Depends(get_db)):
    """Names from the family list that haven't registered yet."""
    registered = {u.full_name for u in db.query(models.User).all()}
    return [n for n in ALLOWED_NAMES if n not in registered]


class RegisterData(BaseModel):
    name: str
    password: str


@app.post("/auth/register", response_model=Token)
def register(data: RegisterData, db: Session = Depends(get_db)):
    if data.name not in ALLOWED_NAMES:
        raise HTTPException(400, "Name nicht in der Familienliste")
    if db.query(models.User).filter(models.User.full_name == data.name).first():
        raise HTTPException(400, "Dieser Name ist bereits registriert")
    if len(data.password) < 6:
        raise HTTPException(400, "Passwort muss mindestens 6 Zeichen lang sein")
    color = NAME_COLORS[ALLOWED_NAMES.index(data.name)]
    user = models.User(
        username=data.name.lower(),
        full_name=data.name,
        password_hash=auth.hash_password(data.password),
        is_admin=False,
        color=color,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = auth.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Falscher Benutzername oder Passwort")
    token = auth.create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


@app.get("/auth/me", response_model=UserOut)
def me(current_user=Depends(auth.get_current_user)):
    return current_user


class MeUpdate(BaseModel):
    color: str


@app.put("/auth/me", response_model=UserOut)
def update_me(data: MeUpdate, db: Session = Depends(get_db), current_user=Depends(auth.get_current_user)):
    current_user.color = data.color
    db.commit()
    db.refresh(current_user)
    return current_user


@app.post("/auth/me/avatar", response_model=UserOut)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    source_file, ext = prepare_avatar_upload(file)

    # Remove old avatar file if present
    if current_user.avatar_url:
        old_path = os.path.join(AVATARS_DIR, os.path.basename(current_user.avatar_url))
        if os.path.exists(old_path):
            os.remove(old_path)

    filename = f"user_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    with open(os.path.join(AVATARS_DIR, filename), "wb") as f:
        shutil.copyfileobj(source_file, f)

    current_user.avatar_url = f"/avatars/{filename}"
    db.commit()
    db.refresh(current_user)
    return current_user


@app.delete("/auth/me/avatar", response_model=UserOut)
def delete_avatar(db: Session = Depends(get_db), current_user=Depends(auth.get_current_user)):
    if current_user.avatar_url:
        old_path = os.path.join(AVATARS_DIR, os.path.basename(current_user.avatar_url))
        if os.path.exists(old_path):
            os.remove(old_path)
        current_user.avatar_url = None
        db.commit()
        db.refresh(current_user)
    return current_user


# ── Users ─────────────────────────────────────────────────────────────────────

@app.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(auth.get_current_user)):
    return db.query(models.User).all()


@app.post("/users", response_model=UserOut)
def create_user(data: UserCreate, db: Session = Depends(get_db), _=Depends(auth.require_admin)):
    if db.query(models.User).filter(models.User.username == data.username).first():
        raise HTTPException(400, "Benutzername bereits vergeben")
    user = models.User(
        username=data.username,
        full_name=data.full_name,
        password_hash=auth.hash_password(data.password),
        is_admin=data.is_admin,
        can_approve=data.can_approve,
        color=data.color,
        email=data.email,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.put("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: Session = Depends(get_db), _=Depends(auth.require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Benutzer nicht gefunden")
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.password is not None:
        user.password_hash = auth.hash_password(data.password)
    if data.is_admin is not None:
        user.is_admin = data.is_admin
    if data.can_approve is not None:
        user.can_approve = data.can_approve
    if data.color is not None:
        user.color = data.color
    if data.email is not None:
        user.email = data.email or None
    db.commit()
    db.refresh(user)
    return user


@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), current_user=Depends(auth.require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "Benutzer nicht gefunden")
    if user.id == current_user.id:
        raise HTTPException(400, "Eigenen Account nicht löschbar")
    db.delete(user)
    db.commit()
    return {"ok": True}


# ── Entries ───────────────────────────────────────────────────────────────────

@app.get("/entries", response_model=List[EntryOut])
def list_entries(
    location: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    q = db.query(models.Entry)
    if location:
        q = q.filter(models.Entry.location == location)
    # Non-approvers only see approved entries + their own pending
    if not (current_user.can_approve or current_user.is_admin):
        q = q.filter(
            or_(
                models.Entry.status == "approved",
                models.Entry.user_id == current_user.id,
            )
        )
    return [EntryOut.from_orm_entry(e) for e in q.all()]


@app.post("/entries", response_model=EntryOut)
def create_entry(data: EntryCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user=Depends(auth.get_current_user)):
    if data.location not in ("rome", "mallorca"):
        raise HTTPException(400, "Ungültiger Ort")
    if data.end_date < data.start_date:
        raise HTTPException(400, "Enddatum vor Startdatum")

    existing_entries_in_period_and_location = db.query(models.Entry).filter(
        models.Entry.location == data.location,
        models.Entry.start_date <= data.end_date,
        models.Entry.end_date >= data.start_date,
    ).all()
    if existing_entries_in_period_and_location:
        raise HTTPException(400, "Es gibt bereits einen Eintrag in diesem Zeitraum und Ort")

    is_approver = current_user.can_approve or current_user.is_admin
    entry = models.Entry(
        user_id=current_user.id,
        location=data.location,
        start_date=data.start_date,
        end_date=data.end_date,
        participants=serialize_participants(data.participants),
        note=data.note,
        status="approved" if is_approver else "pending",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    if entry.status == "pending":
        approvers = db.query(models.User).filter(
            or_(models.User.can_approve == True, models.User.is_admin == True)
        ).all()
        approver_emails = [u.email for u in approvers if u.email]
        participants = parse_participants(entry.participants)
        background_tasks.add_task(
            email_utils.notify_pending_entry,
            entry, current_user.full_name, participants, approver_emails,
        )

    return EntryOut.from_orm_entry(entry)


@app.put("/entries/{entry_id}", response_model=EntryOut)
def update_entry(
    entry_id: int,
    data: EntryUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(auth.get_current_user),
):
    entry = db.query(models.Entry).filter(models.Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Eintrag nicht gefunden")
    if entry.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Keine Berechtigung")
    if data.location is not None:
        if data.location not in ("rome", "mallorca"):
            raise HTTPException(400, "Ungültiger Ort")
        entry.location = data.location
    if data.start_date is not None:
        entry.start_date = data.start_date
    if data.end_date is not None:
        entry.end_date = data.end_date
    if data.participants is not None:
        entry.participants = serialize_participants(data.participants)
    if data.note is not None:
        entry.note = data.note
    db.commit()
    db.refresh(entry)
    return EntryOut.from_orm_entry(entry)


@app.post("/entries/{entry_id}/approve", response_model=EntryOut)
def approve_entry(entry_id: int, db: Session = Depends(get_db), current_user=Depends(auth.get_current_user)):
    if not (current_user.can_approve or current_user.is_admin):
        raise HTTPException(403, "Keine Berechtigung")
    entry = db.query(models.Entry).filter(models.Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Eintrag nicht gefunden")
    entry.status = "approved"
    db.commit()
    db.refresh(entry)
    return EntryOut.from_orm_entry(entry)


@app.delete("/entries/{entry_id}/reject")
def reject_entry(entry_id: int, db: Session = Depends(get_db), current_user=Depends(auth.get_current_user)):
    if not (current_user.can_approve or current_user.is_admin):
        raise HTTPException(403, "Keine Berechtigung")
    entry = db.query(models.Entry).filter(models.Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Eintrag nicht gefunden")
    db.delete(entry)
    db.commit()
    return {"ok": True}


@app.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db), current_user=Depends(auth.get_current_user)):
    entry = db.query(models.Entry).filter(models.Entry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Eintrag nicht gefunden")
    if entry.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Keine Berechtigung")
    db.delete(entry)
    db.commit()
    return {"ok": True}
