from app.extensions import db
from app.models.base import BaseModel
from typing import cast, Any

place_amenity = db.Table(
    "place_amenity",
    db.Column(
        "place_id", db.String(36),
        db.ForeignKey("place.id"), primary_key=True
    ),
    db.Column(
        "amenity_id", db.String(36),
        db.ForeignKey("amenity.id"), primary_key=True
    ),
)


class Place(BaseModel):
    __tablename__ = "place"

    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    price = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    image_url = db.Column(db.String(500), nullable=True)

    owner_id = db.Column(
        db.String(36),
        db.ForeignKey("users.id"),
        nullable=False
    )

    amenities = db.relationship(
        "Amenity",
        secondary=place_amenity,
        backref="places",
        lazy=True
    )

    def __init__(
        self,
        title,
        description,
        price,
        latitude,
        longitude,
        owner,
        image_url=None,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.title = title.strip()
        self.description = description if description is not None else ""
        self.price = float(price)
        self.latitude = float(latitude)
        self.longitude = float(longitude)
        self.image_url = image_url

        if hasattr(owner, "id"):
            self.owner = owner
            self.owner_id = owner.id
        else:
            self.owner_id = owner

    def add_review(self, review):
        if not hasattr(self, "reviews") or self.reviews is None:
            self.reviews = []
        self.reviews.append(review)

    def add_amenity(self, amenity):
        if not hasattr(self, "amenities") or self.amenities is None:
            self.amenities = []
        self.amenities.append(amenity)

    def to_dict(self):
        place_dict = super().to_dict()

        reviews = cast(list[Any], self.reviews or [])
        amenities = cast(list[Any], self.amenities or [])

        owner_obj = getattr(self, 'owner', None)
        if owner_obj and hasattr(owner_obj, 'first_name'):
            owner_name = (
                f"{owner_obj.first_name} {owner_obj.last_name}".strip()
            )
        else:
            owner_name = self.owner_id

        def _review_to_inline(r):
            user_obj = getattr(r, 'user', None)
            if user_obj and hasattr(user_obj, 'first_name'):
                username = (
                    f"{user_obj.first_name} {user_obj.last_name}".strip()
                )
            else:
                username = "Anonymous"
            return {
                "id": r.id,
                "text": r.text,
                "rating": r.rating,
                "username": username,
            }

        place_dict.update({
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "owner_id": self.owner_id,
            "owner": owner_name,
            "reviews": [_review_to_inline(r) for r in reviews],
            "amenities": [a.id for a in amenities],
            "image_url": self.image_url,
        })
        return place_dict
