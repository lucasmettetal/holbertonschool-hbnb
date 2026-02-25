from flask_restx import Namespace, Resource, fields
from app.services import facade

api = Namespace('places', description='Place operations')

# ---------- Nested models (response) ----------
amenity_model = api.model('PlaceAmenity', {
    'id': fields.String(description='Amenity ID'),
    'name': fields.String(description='Name of the amenity')
})

user_model = api.model('PlaceUser', {
    'id': fields.String(description='User ID'),
    'first_name': fields.String(description='First name of the owner'),
    'last_name': fields.String(description='Last name of the owner'),
    'email': fields.String(description='Email of the owner')
})

review_model = api.model('PlaceReview', {
    'id': fields.String(description='Review ID'),
    'text': fields.String(description='Text of the review'),
    'rating': fields.Integer(description='Rating (1-5)'),
    'user_id': fields.String(description='ID of the user')
})

# ---------- Input models ----------
place_create_model = api.model('PlaceCreate', {
    'title': fields.String(required=True, description='Title of the place'),
    'description': fields.String(description='Description of the place'),
    'price': fields.Float(required=True, description='Price per night'),
    'latitude': fields.Float(required=True, description='Latitude of the place'),
    'longitude': fields.Float(required=True, description='Longitude of the place'),
    'owner_id': fields.String(required=True, description='ID of the owner'),
    'amenities': fields.List(fields.String, required=True, description="List of amenity IDs")
})

place_update_model = api.model('PlaceUpdate', {
    'title': fields.String(description='Title of the place'),
    'description': fields.String(description='Description of the place'),
    'price': fields.Float(description='Price per night'),
    'latitude': fields.Float(description='Latitude of the place'),
    'longitude': fields.Float(description='Longitude of the place'),
    'owner_id': fields.String(description='ID of the owner'),
    'amenities': fields.List(fields.String, description="List of amenity IDs")
})

# ---------- Output models ----------
place_summary_model = api.model('PlaceSummary', {
    'id': fields.String(description='Place ID'),
    'title': fields.String(description='Title of the place'),
    'latitude': fields.Float(description='Latitude'),
    'longitude': fields.Float(description='Longitude')
})

place_write_response_model = api.model('PlaceWriteResponse', {
    'id': fields.String(description='Place ID'),
    'title': fields.String(description='Title of the place'),
    'description': fields.String(description='Description of the place'),
    'price': fields.Float(description='Price per night'),
    'latitude': fields.Float(description='Latitude'),
    'longitude': fields.Float(description='Longitude'),
    'owner_id': fields.String(description='Owner ID'),
    'amenities': fields.List(fields.String, description='Amenity IDs')
})

place_detail_model = api.model('PlaceDetail', {
    'id': fields.String(description='Place ID'),
    'title': fields.String(description='Title of the place'),
    'description': fields.String(description='Description of the place'),
    'price': fields.Float(description='Price per night'),
    'latitude': fields.Float(description='Latitude'),
    'longitude': fields.Float(description='Longitude'),
    'owner': fields.Nested(user_model, description='Owner'),
    'amenities': fields.List(fields.Nested(amenity_model), description='Amenities'),
    'reviews': fields.List(fields.Nested(review_model), description='Reviews')
})


@api.route('/')
class PlaceList(Resource):
    @api.expect(place_create_model, validate=True)
    @api.marshal_with(place_write_response_model, code=201)
    @api.response(201, 'Place successfully created')
    @api.response(400, 'Invalid input data')
    def post(self):
        """Register a new place"""
        data = api.payload
        try:
            place = facade.create_place(data)
        except ValueError as e:
            return {'error': str(e)}, 400

        return {
            'id': place.id,
            'title': place.title,
            'description': place.description,
            'price': place.price,
            'latitude': place.latitude,
            'longitude': place.longitude,
            'owner_id': place.owner.id,
            'amenities': [a.id for a in place.amenities],
        }, 201

    @api.marshal_list_with(place_summary_model, code=200)
    @api.response(200, 'List of places retrieved successfully')
    def get(self):
        """Retrieve a list of all places"""
        places = facade.get_all_places()
        return [
            {
                'id': p.id,
                'title': p.title,
                'latitude': p.latitude,
                'longitude': p.longitude
            }
            for p in places
        ], 200


@api.route('/<place_id>')
class PlaceResource(Resource):
    @api.marshal_with(place_detail_model, code=200)
    @api.response(200, 'Place details retrieved successfully')
    @api.response(404, 'Place not found')
    def get(self, place_id):
        """Get place details by ID"""
        place = facade.get_place(place_id)
        if not place:
            return {'error': 'Place not found'}, 404

        return {
            'id': place.id,
            'title': place.title,
            'description': place.description,
            'price': place.price,
            'latitude': place.latitude,
            'longitude': place.longitude,
            'owner': {
                'id': place.owner.id,
                'first_name': place.owner.first_name,
                'last_name': place.owner.last_name,
                'email': place.owner.email,
            },
            'amenities': [{'id': a.id, 'name': a.name} for a in place.amenities],
            'reviews': [
                {'id': r.id, 'text': r.text, 'rating': r.rating, 'user_id': r.user.id}
                for r in place.reviews
            ],
        }, 200

    @api.expect(place_update_model, validate=True)
    @api.marshal_with(place_write_response_model, code=200)
    @api.response(200, 'Place updated successfully')
    @api.response(404, 'Place not found')
    @api.response(400, 'Invalid input data')
    def put(self, place_id):
        """Update a place's information"""
        data = api.payload
        try:
            updated = facade.update_place(place_id, data)
        except ValueError as e:
            return {'error': str(e)}, 400

        if not updated:
            return {'error': 'Place not found'}, 404

        return {
            'id': updated.id,
            'title': updated.title,
            'description': updated.description,
            'price': updated.price,
            'latitude': updated.latitude,
            'longitude': updated.longitude,
            'owner_id': updated.owner.id,
            'amenities': [a.id for a in updated.amenities],
        }, 200


@api.route('/<place_id>/reviews')
class PlaceReviewList(Resource):
    @api.response(200, 'List of reviews for the place retrieved successfully')
    @api.response(404, 'Place not found')
    def get(self, place_id):
        """Get all reviews for a specific place"""
        reviews = facade.get_reviews_by_place(place_id)
        if reviews is None:
            return {'error': 'Place not found'}, 404

        return [
            {'id': r.id, 'text': r.text, 'rating': r.rating, 'user_id': r.user.id}
            for r in reviews
        ], 200
