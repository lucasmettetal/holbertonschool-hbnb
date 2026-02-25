from app.persistence.repository import InMemoryRepository
from app.models.user import User
from app.models.amenity import Amenity
from app.models.place import Place
from app.models.review import Review

class HBnBFacade:
    def __init__(self):
        self.user_repo = InMemoryRepository()
        self.place_repo = InMemoryRepository()
        self.review_repo = InMemoryRepository()
        self.amenity_repo = InMemoryRepository()

    def create_user(self, user_data):
        user = User(**user_data)
        self.user_repo.add(user)
        return user

    def get_user(self, user_id):
        return self.user_repo.get(user_id)

    def get_user_by_email(self, email):
        return self.user_repo.get_by_attribute('email', email)

    def get_all_users(self):
        return self.user_repo.get_all()

    def update_user(self, user_id, user_data):
        user = self.get_user(user_id)
        if not user:
            return None

        user_data.pop("id", None)
        user_data.pop("created_at", None)
        user_data.pop("updated_at", None)

        user.update(user_data)
        return user

    def create_amenity(self, amenity_data):
        amenity = Amenity(**amenity_data)
        self.amenity_repo.add(amenity)
        return amenity

    def get_amenity(self, amenity_id):
        return self.amenity_repo.get(amenity_id)

    def get_all_amenities(self):
        return self.amenity_repo.get_all()

    def update_amenity(self, amenity_id, amenity_data):
        amenity = self.get_amenity(amenity_id)
        if not amenity:
            return None

        amenity_data.pop("id", None)
        amenity_data.pop("created_at", None)
        amenity_data.pop("updated_at", None)

        amenity.update(amenity_data)
        return amenity

    def create_place(self, place_data):
        owner_id = place_data.get("owner_id")
        owner = self.get_user(owner_id)
        if not owner:
            raise ValueError("Owner not found")

        amenity_ids = place_data.get("amenities", [])
        amenities = []
        for aid in amenity_ids:
            amenity = self.get_amenity(aid)
            if not amenity:
                raise ValueError("Amenity not found")
            amenities.append(amenity)

        place = Place(
            title=place_data.get('title'),
            description=place_data.get("description"),
            price=place_data.get("price"),
            latitude=place_data.get("latitude"),
            longitude=place_data.get("longitude"),
            owner=owner
        )

        for a in amenities:
            place.add_amenity(a)

        self.place_repo.add(place)
        return place

    def get_place(self, place_id):
        return self.place_repo.get(place_id)

    def get_all_places(self):
        return self.place_repo.get_all()

    def update_place(self, place_id, place_data):
        place = self.get_place(place_id)
        if not place:
            return None

        place_data.pop("id", None)
        place_data.pop("created_at", None)
        place_data.pop("updated_at", None)

        if "owner_id" in place_data:
            owner = self.get_user(place_data["owner_id"])
            if not owner:
                raise ValueError("Owner not found")
            place.owner = owner
            place_data.pop("owner_id", None)

        if "amenities" in place_data:
            amenities = []
            for aid in place_data["amenities"]:
                amenity = self.get_amenity(aid)
                if not amenity:
                    raise ValueError("Amenity not found")
                amenities.append(amenity)

            place.amenities = amenities
            place.save()
            place_data.pop("amenities", None)

        allowed = {"title", "description", "price", "latitude", "longitude"}
        safe_data = {k: v for k, v in place_data.items() if isinstance(k, str) and k in allowed}
        place.update(safe_data)
        return place

    def create_review(self, review_data):
        user = self.get_user(review_data["user_id"])
        if not user:
            raise ValueError("User not found")

        place = self.get_place(review_data["place_id"])
        if not place:
            raise ValueError("Place not found")

        review = Review(
            text=review_data["text"],
            rating=review_data["rating"],
            place=place,
            user=user
        )

        self.review_repo.add(review)

        place.add_review(review)
        place.save()

        return review


    def get_review(self, review_id):
        return self.review_repo.get(review_id)


    def get_all_reviews(self):
        return self.review_repo.get_all()


    def get_reviews_by_place(self, place_id):
        place = self.get_place(place_id)
        if not place:
            return None
        return place.reviews


    def update_review(self, review_id, review_data):
        review = self.get_review(review_id)
        if not review:
            return None

        review_data.pop("id", None)
        review_data.pop("created_at", None)
        review_data.pop("updated_at", None)
        review_data.pop("user_id", None)
        review_data.pop("place_id", None)

        review.update(review_data)
        return review


    def delete_review(self, review_id):
        review = self.get_review(review_id)
        if not review:
            return False

        place = review.place
        if place and hasattr(place, "reviews"):
            place.reviews = [r for r in place.reviews if r.id != review_id]
            place.save()

        self.review_repo.delete(review_id)
        return True