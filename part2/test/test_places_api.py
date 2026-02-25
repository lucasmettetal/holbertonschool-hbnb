import unittest
from app import create_app
from app.services import facade
from app.persistence.repository import InMemoryRepository

class TestPlaceAPI(unittest.TestCase):

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

        # create amenity
        amenity_res = self.client.post('/api/v1/amenities/', json={
            "name": "Wi-Fi"
        })
        self.amenity_id = amenity_res.get_json()["id"]

    def test_create_place_success(self):
        response = self.client.post('/api/v1/places/', json={
            "title": "Nice place",
            "description": "Test",
            "price": 100,
            "latitude": 10,
            "longitude": 10,
            "owner_id": self.user_id,
            "amenities": [self.amenity_id]
        })
        self.assertEqual(response.status_code, 201)

    def test_create_place_invalid_latitude(self):
        response = self.client.post('/api/v1/places/', json={
            "title": "Nice place",
            "price": 100,
            "latitude": 999,
            "longitude": 10,
            "owner_id": self.user_id,
            "amenities": []
        })
        self.assertEqual(response.status_code, 400)
