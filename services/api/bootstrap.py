import os

from api.inventory.seed import seed_data
from api.profiles.service import create_profile, get_profile_by_user_id
from api.schemas import ProfileCreate, UserCreate
from api.users.service import create_user, get_user_by_email
from seed import main as seed_suppliers


def main() -> None:
    if os.environ.get("SEED_ON_START", "false").lower() == "true":
        seed_data()
        seed_suppliers()
    if os.environ.get("ENABLE_DEMO", "false").lower() == "true":
        if os.environ.get("APP_MODE", "development") != "development":
            raise RuntimeError("La cuenta demo solo se permite en desarrollo.")
        email = os.environ["DEMO_EMAIL"]
        password = os.environ["DEMO_PASSWORD"]
        user = get_user_by_email(email)
        if user is None:
            user = create_user(UserCreate(email=email, password=password))
        if get_profile_by_user_id(user["id"]) is None:
            create_profile(user["id"], ProfileCreate(name="Equipo demo Nexova"))
        print("Cuenta demo local preparada; no se imprimieron credenciales.")


if __name__ == "__main__":
    main()