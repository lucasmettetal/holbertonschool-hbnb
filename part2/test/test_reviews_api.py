import unittest
from app import create_app
from app.services import facade
from app.persistence.repository import InMemoryRepository

class TestReviewAPI(unittest.TestCase):

    def setUp(self):
        self.app = create_app()
        self.app.testing = True
        self.client = self.app.test_client()

        facade.user_repo = InMemoryRepository()
        facade.place_repo = InMemoryRepository()
        facade.review_repo = InMemoryRepository()
        facade.amenity_repo = InMemoryRepository()

        # create user
        user_res = self.client.post('/api/v1/users/', json={
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com"
        })
        self.user_id = user_res.get_json()["id"]

        # create place
        place_res = self.client.post('/api/v1/places/', json={
            "title": "Nice place",
            "price": 100,
            "latitude": 10,
            "longitude": 10,
            "owner_id": self.user_id,
            "amenities": []
        })
        self.place_id = place_res.get_json()["id"]

    def test_create_review_success(self):
        response = self.client.post('/api/v1/reviews/', json={
            "text": "Great",
            "rating": 5,
            "user_id": self.user_id,
            "place_id": self.place_id
        })
        self.assertEqual(response.status_code, 201)

    def test_delete_review(self):
        review = self.client.post('/api/v1/reviews/', json={
            "text": "Great",
            "rating": 5,
            "user_id": self.user_id,
            "place_id": self.place_id
        })
        review_id = review.get_json()["id"]

        delete_res = self.client.delete(f'/api/v1/reviews/{review_id}')
        self.assertEqual(delete_res.status_code, 204)
