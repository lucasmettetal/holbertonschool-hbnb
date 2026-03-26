from flask import render_template, request
from app import create_app
from app.services import facade

app = create_app()


# Seed admin temporaire
with app.app_context():
    try:
        if not facade.get_user_by_email("admin@test.com"):
            facade.create_user({
                "first_name": "Admin",
                "last_name": "User",
                "email": "admin@test.com",
                "password": "123456",
                "is_admin": True
            })
            print("Admin de test créé : admin@test.com / 123456")
    except Exception as e:
        print("Admin seed error:", e)


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


if __name__ == "__main__":
    print("Site:    http://127.0.0.1:5000/")
    print("Swagger: http://127.0.0.1:5000/api/v1/")
    app.run(host="0.0.0.0", port=5000, debug=True)
