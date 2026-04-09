import uuid
from datetime import datetime
from app.extensions import db


class BaseModel(db.Model):
    __abstract__ = True

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    def __init__(self, **kwargs):
        # UUID généré immédiatement à l'instanciation Python
        # (le default SQLAlchemy ne s'exécute qu'au INSERT en base)
        self.id = kwargs.get('id') or str(uuid.uuid4())
        now = datetime.utcnow()
        self.created_at = kwargs.get('created_at', now)
        self.updated_at = kwargs.get('updated_at', now)

    def save(self):
        self.updated_at = datetime.utcnow()

    def update(self, data):
        for key, value in data.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.updated_at = datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "created_at": (
                self.created_at.isoformat() if self.created_at else None
            ),
            "updated_at": (
                self.updated_at.isoformat() if self.updated_at else None
            )
        }
