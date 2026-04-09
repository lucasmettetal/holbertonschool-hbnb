from flask import render_template, request, jsonify
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import uuid
from app import create_app
from app.extensions import db
from app.services import facade

app = create_app()

# Configuration for file uploads
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Create uploads folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# Seed admin + place de test au démarrage
with app.app_context():
    # Create all tables first
    db.create_all()

    try:
        admin = facade.get_user_by_email("admin@test.com")
        if not admin:
            admin = facade.create_user({
                "first_name": "Admin",
                "last_name": "User",
                "email": "admin@test.com",
                "password": "123456",
                "is_admin": True
            })
            print("Admin créé : admin@test.com / 123456")
        else:
            print("Admin existant : admin@test.com")
    except Exception as e:
        print("Admin seed error:", e)
        admin = None

    # Seed common amenities (in-memory, recreated each restart)
    AMENITY_NAMES = [
        "Wifi", "Pool", "Parking", "Balcony",
        "Air conditioning", "Kitchen", "Pets allowed", "Workspace"
    ]
    seeded_amenity_ids = []
    for name in AMENITY_NAMES:
        try:
            a = facade.create_amenity({"name": name})
            seeded_amenity_ids.append(a.id)
        except Exception as e:
            print(f"Amenity seed error ({name}):", e)
    print(f"Amenities créées : {', '.join(AMENITY_NAMES)}")

    # Places are in-memory — recreated on every restart
    try:
        if admin:
            test_place = facade.create_place({
                "title": "Cozy Apartment in the City",
                "description": (
                    "A comfortable place to stay in the heart of the city."
                ),
                "price": 120.0,
                "latitude": 48.8566,
                "longitude": 2.3522,
                "owner_id": admin.id,
                "amenities": seeded_amenity_ids[:3]
            })
            print(f"Place de test — ID : {test_place.id}")
            print(
                "URL : http://127.0.0.1:5000"
                f"/place.html?id={test_place.id}"
            )
    except Exception as e:
        print("Place seed error:", e)


# ===== FRONT ROUTES =====

@app.before_request
def serve_root_directly():
    if request.path == "/" and request.method == "GET":
        return render_template("index.html")


@app.route("/")
def serve_index():
    return render_template("index.html")


@app.route("/index.html")
def serve_index_html():
    return render_template("index.html")


@app.route("/login.html")
def serve_login():
    return render_template("login.html")


@app.route("/place.html")
def serve_place():
    return render_template("place.html")


@app.route("/add_review.html")
def serve_add_review():
    return render_template("add_review.html")


@app.route("/register.html")
def serve_register():
    return render_template("register.html")


@app.route("/create_place.html")
def serve_create_place():
    return render_template("create_place.html")


# ===== FILE UPLOAD ROUTE =====

@app.route("/api/v1/upload", methods=["POST"])
@jwt_required()
def upload_image():
    """Upload an image for a place"""
    try:
        print(f"[UPLOAD] Request received, user: {get_jwt_identity()}")

        if 'file' not in request.files:
            print("[UPLOAD] No file in request.files")
            return {"error": "No file uploaded"}, 400

        file = request.files['file']
        print(f"[UPLOAD] File received: {file.filename}")

        if file.filename == '':
            print("[UPLOAD] File name is empty")
            return {"error": "No file selected"}, 400

        if not allowed_file(file.filename):
            print(f"[UPLOAD] File type not allowed: {file.filename}")
            return {"error": f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}, 400

        if file.content_length and file.content_length > MAX_FILE_SIZE:
            print(f"[UPLOAD] File too large: {file.content_length} bytes")
            return {"error": f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024}MB"}, 400

        # Generate unique filename
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        file.save(filepath)
        print(f"[UPLOAD] File saved: {filepath}")

        # Return the URL to access the image
        image_url = f"/static/uploads/{filename}"
        print(f"[UPLOAD] Returning URL: {image_url}")
        return {"image_url": image_url, "filename": filename}, 201

    except Exception as e:
        print(f"[UPLOAD] Error: {str(e)}")
        return {"error": str(e)}, 500


if __name__ == "__main__":
    print("Site:    http://127.0.0.1:5000/")
    print("Swagger: http://127.0.0.1:5000/api/v1/")
    app.run(host="0.0.0.0", port=5000, debug=True)
