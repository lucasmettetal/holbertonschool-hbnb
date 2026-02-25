from flask_restx import Namespace, Resource, fields
from app.services import facade

api = Namespace('reviews', description='Review operations')

review_model = api.model('Review', {
    'text': fields.String(required=True, description='Text of the review'),
    'rating': fields.Integer(required=True, description='Rating (1-5)'),
    'user_id': fields.String(required=True, description='ID of the user'),
    'place_id': fields.String(required=True, description='ID of the place')
})

review_update_model = api.model('ReviewUpdate', {
    'text': fields.String(required=False),
    'rating': fields.Integer(required=False)
})

@api.route('/')
class ReviewList(Resource):
    @api.expect(review_model, validate=True)
    @api.response(201, 'Review successfully created')
    @api.response(400, 'Invalid input data')
    def post(self):
        data = api.payload
        try:
            r = facade.create_review(data)
        except ValueError as e:
            return {'error': str(e)}, 400

        return {
            'id': r.id,
            'text': r.text,
            'rating': r.rating,
            'user_id': r.user.id,
            'place_id': r.place.id
        }, 201

    @api.response(200, 'List of reviews retrieved successfully')
    def get(self):
        reviews = facade.get_all_reviews()
        return [
            {'id': r.id, 'text': r.text, 'rating': r.rating}
            for r in reviews
        ], 200


@api.route('/<review_id>')
class ReviewResource(Resource):
    @api.response(200, 'Review details retrieved successfully')
    @api.response(404, 'Review not found')
    def get(self, review_id):
        r = facade.get_review(review_id)
        if not r:
            return {'error': 'Review not found'}, 404
        return {
            'id': r.id,
            'text': r.text,
            'rating': r.rating,
            'user_id': r.user.id,
            'place_id': r.place.id
        }, 200

    @api.expect(review_update_model, validate=True)
    @api.response(200, 'Review updated successfully')
    @api.response(404, 'Review not found')
    @api.response(400, 'Invalid input data')
    def put(self, review_id):
        data = api.payload
        try:
            r = facade.update_review(review_id, data)
        except ValueError as e:
            return {'error': str(e)}, 400

        if not r:
            return {'error': 'Review not found'}, 404

        return {
            'id': r.id,
            'text': r.text,
            'rating': r.rating,
            'user_id': r.user.id,
            'place_id': r.place.id
        }, 200

    @api.response(204, 'Review deleted successfully')
    @api.response(404, 'Review not found')
    def delete(self, review_id):
        ok = facade.delete_review(review_id)
        if not ok:
            return {'error': 'Review not found'}, 404
        return '', 204