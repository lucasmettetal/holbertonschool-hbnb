from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import create_access_token
from app.services import facade

api = Namespace('auth', description='Authentication operations')

login_model = api.model('Login', {
    'email': fields.String(required=True, description='User email'),
    'password': fields.String(required=True, description='User password')
})

register_model = api.model('Register', {
    'first_name': fields.String(required=True, description='First name'),
    'last_name': fields.String(required=True, description='Last name'),
    'email': fields.String(required=True, description='Email address'),
    'password': fields.String(required=True, description='Password')
})


@api.route('/login')
class Login(Resource):

    @api.expect(login_model)
    def post(self):
        """Authenticate user and return JWT"""

        credentials = api.payload

        user = facade.get_user_by_email(credentials["email"])

        if not user or not user.verify_password(credentials["password"]):
            return {"error": "Invalid credentials"}, 401

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"is_admin": user.is_admin}
        )

        return {"access_token": access_token}, 200


@api.route('/register')
class Register(Resource):

    @api.expect(register_model, validate=True)
    def post(self):
        """Register a new user account (public)"""

        data = api.payload

        existing = facade.get_user_by_email(data['email'])
        if existing:
            return {"error": "Email already registered"}, 400

        try:
            user = facade.create_user({
                "first_name": data["first_name"],
                "last_name": data["last_name"],
                "email": data["email"],
                "password": data["password"],
                "is_admin": False
            })
        except ValueError as e:
            return {"error": str(e)}, 400

        # Auto-login: retourne un JWT directement après inscription
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={"is_admin": False}
        )

        return {
            "access_token": access_token,
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email
            }
        }, 201
