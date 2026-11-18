"""Abre Bloc en el navegador. En CMD: python run.py y Ctrl+C para detener."""

import base64
import copy
import hashlib
import html
import json
import os
import re
import secrets
import smtplib
import sys
import threading
import time
import webbrowser
from email.message import EmailMessage
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = int(os.environ.get("BLOC_PORT", "8754"))
ROOT = Path(__file__).resolve().parent
STORE = ROOT / "data" / "sync.json"
PAY_STORE = ROOT / "data" / "payments.json"
PROOFS = ROOT / "data" / "proofs"
LOCK = threading.Lock()
_pg = None
_pg_down = False
_users_snapshot = None
_payments_snapshot = None
USER_RE = re.compile(r"^[a-z0-9._-]{3,32}$")


def load_env():
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip().strip('"').strip("'")


def empty_store():
    return {"users": {}}


def database_url():
    load_env()
    if _pg_down:
        return ""
    return os.environ.get("DATABASE_URL", "").strip()


def pg_conn():
    global _pg, _pg_down
    import psycopg
    if _pg is None or _pg.closed:
        try:
            _pg = psycopg.connect(database_url(), connect_timeout=1)
        except Exception:
            _pg_down = True
            _pg = None
            raise
    return _pg


def init_db():
    conn = pg_conn()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS bloc_users (
            id TEXT PRIMARY KEY,
            doc JSONB NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS bloc_payments (
            id TEXT PRIMARY KEY,
            doc JSONB NOT NULL
        )
        """
    )
    conn.commit()


def doc_json(value):
    from psycopg.types.json import Json
    return Json(value)


def same_doc(left, right):
    return json.dumps(left, ensure_ascii=False, sort_keys=True) == json.dumps(right, ensure_ascii=False, sort_keys=True)


def read_users_pg():
    init_db()
    rows = pg_conn().execute("SELECT id, doc FROM bloc_users").fetchall()
    users = {}
    for uid, doc in rows:
        users[uid] = doc if isinstance(doc, dict) else {}
    if users or not STORE.exists():
        return users
    try:
        loaded = json.loads(STORE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return users
    if isinstance(loaded, dict) and isinstance(loaded.get("users"), dict):
        write_store({"users": loaded["users"]})
        return {uid: copy.deepcopy(user) for uid, user in loaded["users"].items()}
    return users


def read_payments_pg():
    global _payments_snapshot
    init_db()
    row = pg_conn().execute("SELECT doc FROM bloc_payments WHERE id = %s", ("main",)).fetchone()
    if row and isinstance(row[0], dict):
        return row[0]
    data = empty_payments()
    if PAY_STORE.exists():
        try:
            loaded = json.loads(PAY_STORE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            loaded = None
        if isinstance(loaded, dict):
            data.update(loaded)
    write_payments(data)
    return copy.deepcopy(data)


def load_store():
    load_env()
    if database_url():
        global _users_snapshot, _pg_down
        try:
            if _users_snapshot is None:
                _users_snapshot = {"users": read_users_pg()}
            data = copy.deepcopy(_users_snapshot)
            if not isinstance(data.get("users"), dict):
                data["users"] = {}
            apply_roles(data)
            if ensure_admin(data):
                write_store(data)
            return data
        except Exception as exc:
            print("PostgreSQL no respondió, se usan los archivos.")
            _pg_down = True
            _users_snapshot = None
    data = empty_store()
    if STORE.exists():
        try:
            loaded = json.loads(STORE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            loaded = None
        if isinstance(loaded, dict):
            data = loaded
    if "users" not in data and isinstance(data.get("accounts"), dict):
        users = {}
        for email, account in data["accounts"].items():
            uid = secrets.token_hex(8)
            token = account.get("token")
            users[uid] = {
                "id": uid,
                "username": "",
                "email": (account.get("email") or email or "").lower(),
                "provider": account.get("provider") or "email",
                "role": "user",
                "password": account.get("password") or "",
                "sessions": [{"id": token, "createdAt": 0}] if token else [],
                "updatedAt": account.get("updatedAt") or 0,
                "state": account.get("state"),
                "backups": account.get("backups") or [],
            }
        data = {"users": users}
        write_store(data)
    if not isinstance(data.get("users"), dict):
        data["users"] = {}
    apply_roles(data)
    if ensure_admin(data):
        write_store(data)
    return data


def empty_payments():
    return {
        "methods": [
            {"id": "nequi", "label": "Nequi", "account": "", "detail": "Transfiere y adjunta el pantallazo.", "active": True},
            {"id": "bancolombia", "label": "Bancolombia", "account": "", "detail": "Cuenta de ahorros.", "active": True},
            {"id": "breb", "label": "Bre-B", "account": "", "detail": "Llave Bre-B.", "active": True},
        ],
        "requests": [],
        "balances": {},
        "coupons": [],
        "playTokens": [],
    }


def load_payments():
    if database_url():
        global _payments_snapshot
        if _payments_snapshot is None:
            _payments_snapshot = read_payments_pg()
        data = copy.deepcopy(_payments_snapshot)
        if not isinstance(data.get("methods"), list) or not data["methods"]:
            data["methods"] = empty_payments()["methods"]
        if not isinstance(data.get("requests"), list):
            data["requests"] = []
        if not isinstance(data.get("balances"), dict):
            data["balances"] = {}
        if not isinstance(data.get("coupons"), list):
            data["coupons"] = []
        if not isinstance(data.get("playTokens"), list):
            data["playTokens"] = []
        return data
    data = empty_payments()
    if PAY_STORE.exists():
        try:
            loaded = json.loads(PAY_STORE.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            loaded = None
        if isinstance(loaded, dict):
            data.update(loaded)
    if not isinstance(data.get("methods"), list) or not data["methods"]:
        data["methods"] = empty_payments()["methods"]
    if not isinstance(data.get("requests"), list):
        data["requests"] = []
    if not isinstance(data.get("balances"), dict):
        data["balances"] = {}
    if not isinstance(data.get("coupons"), list):
        data["coupons"] = []
    if not isinstance(data.get("playTokens"), list):
        data["playTokens"] = []
    return data


def write_payments(data):
    if database_url():
        global _payments_snapshot
        init_db()
        pg_conn().execute(
            """
            INSERT INTO bloc_payments (id, doc) VALUES (%s, %s)
            ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc
            """,
            ("main", doc_json(data)),
        )
        pg_conn().commit()
        _payments_snapshot = copy.deepcopy(data)
        return
    PAY_STORE.parent.mkdir(parents=True, exist_ok=True)
    PAY_STORE.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def parse_amount(value):
    text = str(value or "").strip().replace(" ", "").replace("$", "")
    if not text:
        return None
    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif "," in text:
        text = text.replace(".", "").replace(",", ".")
    elif text.count(".") > 1:
        text = text.replace(".", "")
    elif "." in text:
        left, right = text.split(".", 1)
        if len(right) == 3 and right.isdigit():
            text = left + right
    try:
        amount = float(text)
    except ValueError:
        return None
    if amount <= 0 or amount > 100000000:
        return None
    return round(amount, 2)


def public_request(item):
    return {
        "id": item.get("id"),
        "userId": item.get("userId"),
        "username": item.get("username") or "",
        "methodLabel": item.get("methodLabel") or "",
        "account": item.get("account") or "",
        "amount": item.get("amount") or 0,
        "period": item.get("period") or "",
        "note": item.get("note") or "",
        "status": item.get("status") or "pending",
        "createdAt": item.get("createdAt") or 0,
        "hasProof": bool(item.get("proof")),
    }


def write_store(data):
    if database_url():
        global _users_snapshot
        init_db()
        users = data.get("users") if isinstance(data.get("users"), dict) else {}
        previous = (_users_snapshot or {}).get("users") or {}
        conn = pg_conn()
        for uid, user in users.items():
            if uid in previous and same_doc(previous[uid], user):
                continue
            conn.execute(
                """
                INSERT INTO bloc_users (id, doc) VALUES (%s, %s)
                ON CONFLICT (id) DO UPDATE SET doc = EXCLUDED.doc
                """,
                (uid, doc_json(user)),
            )
        gone = [uid for uid in previous if uid not in users]
        if gone:
            conn.execute("DELETE FROM bloc_users WHERE id = ANY(%s)", (gone,))
        conn.commit()
        _users_snapshot = copy.deepcopy({"users": users})
        return
    STORE.parent.mkdir(parents=True, exist_ok=True)
    STORE.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def apply_roles(store):
    admin_user = os.environ.get("ADMIN_USER", "").strip().lower()
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    for user in store["users"].values():
        name = (user.get("username") or "").lower()
        email = (user.get("email") or "").lower()
        if (admin_user and name == admin_user) or (admin_email and email == admin_email):
            user["role"] = "admin"
        elif user.get("role") == "admin":
            user["role"] = "user"


def ensure_admin(store):
    admin_user = os.environ.get("ADMIN_USER", "").strip().lower()
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if not admin_user and not admin_email:
        return False
    dirty = False
    user = find_user(store, admin_user) if admin_user else None
    if user is None and admin_email:
        user = find_user(store, admin_email)
    if user is None:
        if len(admin_password) < 6:
            return False
        uid = secrets.token_hex(8)
        store["users"][uid] = {
            "id": uid,
            "username": admin_user,
            "email": admin_email,
            "provider": "email",
            "role": "admin",
            "password": hash_password(admin_password),
            "sessions": [],
            "updatedAt": 0,
            "state": None,
            "backups": [],
        }
        return True
    if admin_user and user.get("username") != admin_user:
        user["username"] = admin_user
        dirty = True
    if admin_email and user.get("email") != admin_email:
        user["email"] = admin_email
        dirty = True
    if user.get("role") != "admin":
        user["role"] = "admin"
        dirty = True
    if len(admin_password) >= 6 and not password_ok(admin_password, user.get("password", "")):
        user["password"] = hash_password(admin_password)
        dirty = True
    return dirty


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000)
    return f"{salt}${digest.hex()}"


def password_ok(password, stored):
    try:
        salt = stored.split("$", 1)[0]
    except (AttributeError, IndexError):
        return False
    return hash_password(password, salt) == stored


def keep_backups(backups, incoming):
    by_key = {}
    for item in list(backups or []) + list(incoming or []):
        if not isinstance(item, dict) or not item.get("date") or not item.get("state"):
            continue
        key = item.get("id") if item.get("manual") and item.get("id") else item["date"]
        current = by_key.get(key)
        if not current or item.get("savedAt", 0) >= current.get("savedAt", 0):
            by_key[key] = {
                "id": item.get("id"),
                "date": item["date"],
                "savedAt": item.get("savedAt", 0),
                "manual": bool(item.get("manual")),
                "state": item.get("state"),
            }
    manuals = sorted((item for item in by_key.values() if item["manual"]), key=lambda item: item["savedAt"], reverse=True)[:10]
    daily = sorted((item for item in by_key.values() if not item["manual"]), key=lambda item: item["date"], reverse=True)[:10]
    return sorted(manuals + daily, key=lambda item: item["savedAt"], reverse=True)


def find_user(store, identifier):
    key = str(identifier or "").strip().lower()
    if not key:
        return None
    for user in store["users"].values():
        if (user.get("username") or "").lower() == key or (user.get("email") or "").lower() == key:
            return user
    return None


def merge_by_id(left, right):
    found = {}
    for item in list(left or []) + list(right or []):
        if not isinstance(item, dict) or not item.get("id"):
            continue
        previous = found.get(item["id"])
        if not previous or int(item.get("updatedAt") or 0) >= int(previous.get("updatedAt") or 0):
            found[item["id"]] = item
    return list(found.values())


def merge_template(old, new):
    if not isinstance(old, dict):
        return new
    if not isinstance(new, dict):
        return old
    merged = {**old, **{key: value for key, value in new.items() if value is not None}}
    if old.get("deletedAt") and not new.get("deletedAt"):
        merged["deletedAt"] = old["deletedAt"]
    if new.get("deletedAt") and not old.get("deletedAt"):
        merged["deletedAt"] = new["deletedAt"]
    if old.get("purged") or new.get("purged"):
        merged["purged"] = True
    return merged


def merge_states(base, incoming, incoming_newer):
    base = base if isinstance(base, dict) else {}
    incoming = incoming if isinstance(incoming, dict) else {}
    shell = dict(incoming if incoming_newer else base)
    templates = dict(base.get("templates") or {})
    for key, value in (incoming.get("templates") or {}).items():
        templates[key] = merge_template(templates.get(key), value)
    shell["files"] = merge_by_id(base.get("files"), incoming.get("files"))
    shell["alarms"] = merge_by_id(base.get("alarms"), incoming.get("alarms"))
    shell["templates"] = templates
    return shell


def public_user(user, token=None):
    payload = {
        "id": user["id"],
        "username": user.get("username") or "",
        "email": user.get("email") or "",
        "provider": user.get("provider") or "email",
        "role": user.get("role") or "user",
        "updatedAt": user.get("updatedAt") or 0,
        "state": user.get("state"),
        "backups": user.get("backups") or [],
        "masterHash": user.get("masterHash") or "",
    }
    if token:
        payload["token"] = token
    return payload


def smtp_settings():
    host = os.environ.get("SMTP_HOST", "").strip()
    user = os.environ.get("SMTP_USER", "").strip()
    sender = os.environ.get("SMTP_FROM", "").strip() or user
    if not host or not sender:
        return None
    return {
        "host": host,
        "port": int(os.environ.get("SMTP_PORT") or 587),
        "user": user,
        "password": os.environ.get("SMTP_PASSWORD", "").replace(" ", ""),
        "from": sender,
        "tls": os.environ.get("SMTP_TLS", "1") != "0",
    }


def send_mail(to, subject, body, html=None):
    cfg = smtp_settings()
    if not cfg:
        print("SMTP no configurado en .env.")
        return False
    try:
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = cfg["from"]
        message["To"] = to
        message.set_content(body)
        if html:
            message.add_alternative(html, subtype="html")
        if cfg["port"] == 465:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=20)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=20)
        with server as smtp:
            if cfg["port"] != 465 and cfg["tls"]:
                smtp.starttls()
            if cfg["user"]:
                smtp.login(cfg["user"], cfg["password"])
            smtp.send_message(message)
        return True
    except Exception as exc:
        print("No se pudo enviar el correo:", exc)
        return False


def send_reset(to, link):
    safe = html.escape(link, quote=True)
    page = f"""<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#f6f1e8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f1e8;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:460px;background:#fffdf8;border:2px solid #1a1814;border-radius:22px;">
        <tr><td style="background:#1a1814;border-radius:20px 20px 0 0;padding:22px 24px;text-align:center;">
          <p style="margin:0;font-family:Georgia,serif;font-size:28px;color:#f6efe4;">notas tupremiumm</p>
        </td></tr>
        <tr><td style="padding:28px 28px 8px;font-family:Georgia,serif;font-size:26px;color:#1a1814;text-align:center;">
          Recupera tu contraseña
        </td></tr>
        <tr><td style="padding:8px 28px 22px;font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#3d3832;text-align:center;">
          Alguien pidió una contraseña nueva para tu cuenta. El enlace vale 1 hora. Si no fuiste tú, ignora este correo.
        </td></tr>
        <tr><td align="center" style="padding:0 28px 28px;">
          <a href="{safe}" style="display:inline-block;background:#1a1814;color:#f7f1e6;text-decoration:none;font-family:Arial,sans-serif;font-size:16px;padding:14px 28px;border-radius:999px;">Elegir contraseña nueva</a>
        </td></tr>
        <tr><td style="padding:0 28px 28px;font-family:Arial,sans-serif;font-size:13px;line-height:1.4;color:#6d645b;text-align:center;">
          Si el botón no abre, copia este enlace:<br>
          <a href="{safe}" style="color:#c4562a;word-break:break-all;">{safe}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    return send_mail(
        to,
        "Recupera tu contraseña de notas tupremiumm",
        "Para elegir una contraseña nueva abre este enlace. Vale durante 1 hora.\n\n" + link + "\n\nSi no pediste el cambio, ignora este correo.\n",
        page,
    )


def erase_later(user_id):
    def work():
        time.sleep(0.3)
        with LOCK:
            store = load_store()
            store["users"].pop(user_id, None)
            write_store(store)
        print(f"Cuenta {user_id} eliminada con sus notas, copias y sesiones.")

    threading.Thread(target=work, daemon=True).start()


def coupon_code(value):
    return re.sub(r"[^A-Za-z0-9]", "", str(value or "")).upper()[:16]


def coupon_uses_of(item):
    if item.get("uses") in (None, ""):
        return 1
    try:
        return max(1, int(item.get("uses")))
    except (TypeError, ValueError):
        return 1


def coupon_used_of(item):
    if "usedCount" in item:
        try:
            return max(0, int(item.get("usedCount") or 0))
        except (TypeError, ValueError):
            return 0
    return 1 if item.get("usedBy") else 0


def coupon_days_of(item):
    try:
        return max(0, int(item.get("days") or 0))
    except (TypeError, ValueError):
        return 0


def coupon_expired(item, now=None):
    days = coupon_days_of(item)
    created = int(item.get("createdAt") or 0)
    if not days or not created:
        return False
    now = int(time.time() * 1000) if now is None else now
    return now > created + days * 24 * 60 * 60 * 1000


def read_coupon_limits(data):
    raw_uses = str(data.get("uses") if data.get("uses") is not None else "").strip()
    if not raw_uses:
        return None, None, "Escribe el número de usos."
    try:
        uses = int(float(raw_uses))
    except ValueError:
        return None, None, "El número de usos debe ser un entero."
    if uses < 1:
        return None, None, "El número de usos debe ser al menos 1."
    raw_days = str(data.get("days") or "").strip()
    days = 0
    if raw_days:
        try:
            days = int(float(raw_days))
        except ValueError:
            return None, None, "Los días deben ser un número."
        if days < 1:
            return None, None, "Los días deben ser al menos 1."
    return uses, days, ""


def coupon_public(item):
    uses = coupon_uses_of(item)
    used = coupon_used_of(item)
    days = coupon_days_of(item)
    return {
        "code": item.get("code") or "",
        "amount": item.get("amount") or 0,
        "uses": uses,
        "usedCount": used,
        "days": days,
        "active": item.get("active") is not False,
        "expired": coupon_expired(item),
        "used": used >= uses,
    }


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def blocked(self, path):
        name = path.rsplit("/", 1)[-1]
        return path.startswith("/data/") or name == ".env" or name.startswith(".env.")

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/lan":
            self.send_json(200, {"urls": lan_urls()})
            return
        if path == "/api/plan":
            self.plan_get()
            return
        if self.blocked(path):
            self.send_error(404)
            return
        if path == "/api/sync":
            self.sync_get()
            return
        if path == "/api/users":
            self.users_get()
            return
        if path == "/api/admin/export":
            self.admin_export()
            return
        if path == "/api/payments":
            self.payments_get()
            return
        if path.startswith("/api/payments/proof/"):
            self.payments_proof(path.rsplit("/", 1)[-1])
            return
        super().do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        routes = {
            "/api/register": self.register,
            "/api/verify": self.verify_email,
            "/api/login": self.login,
            "/api/sync": self.sync_post,
            "/api/recover": self.recover,
            "/api/reset": self.reset_password,
            "/api/logout": self.logout,
            "/api/password": self.change_password,
            "/api/users/create": self.users_create,
            "/api/users/update": self.users_update,
            "/api/users/membership": self.users_membership,
            "/api/users/credit": self.users_credit,
            "/api/users/delete": self.users_delete,
            "/api/admin/import": self.admin_import,
            "/api/account/close": self.close_account,
            "/api/master/code": self.master_code,
            "/api/master/reset": self.master_reset,
            "/api/payments": self.payments_post,
            "/api/payments/review": self.payments_review,
            "/api/payments/methods": self.payments_methods,
            "/api/subscription/activate": self.subscription_activate,
            "/api/subscription/play": self.subscription_play,
            "/api/coupons/redeem": self.coupon_redeem,
            "/api/coupons/create": self.coupon_create,
            "/api/coupons/update": self.coupon_update,
            "/api/coupons/delete": self.coupon_delete,
            "/api/prices/save": self.prices_save,
            "/api/prices/delete": self.prices_delete,
            "/api/partner/coupons": self.partner_coupon,
        }
        handler = routes.get(path)
        if not handler:
            self.send_error(404)
            return
        handler()

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b""
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))

    def send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def token(self):
        header = self.headers.get("Authorization") or ""
        return header[7:].strip() if header.startswith("Bearer ") else ""

    def user_by_token(self, store):
        token = self.token()
        if not token:
            return None
        for user in store["users"].values():
            for session in user.get("sessions") or []:
                sid = session.get("id") if isinstance(session, dict) else session
                if sid == token:
                    return user
        return None

    def add_session(self, user):
        token = secrets.token_hex(24)
        user.setdefault("sessions", [])
        user["sessions"].append({"id": token, "createdAt": int(time.time())})
        return token

    def register(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer la cuenta."})
            return
        username = str(data.get("username") or "").strip().lower()
        email = str(data.get("email") or "").strip().lower()
        password = str(data.get("password") or "")
        if not username or not USER_RE.match(username):
            self.send_json(400, {"error": "El usuario usa de 3 a 32 letras, números, punto, guion o guion bajo."})
            return
        if not email or "@" not in email or "." not in email.split("@")[-1]:
            self.send_json(400, {"error": "Escribe un correo válido."})
            return
        if len(password) < 6:
            self.send_json(400, {"error": "La contraseña necesita al menos 6 caracteres."})
            return
        if not smtp_settings():
            self.send_json(400, {"error": "Falta el SMTP en el archivo .env. El correo no se envió."})
            return
        with LOCK:
            store = load_store()
            if find_user(store, username):
                self.send_json(409, {"error": "Ese usuario ya existe."})
                return
            if find_user(store, email):
                self.send_json(409, {"error": "Ese correo ya existe."})
                return
            uid = secrets.token_hex(8)
            token = secrets.token_urlsafe(24)
            user = {
                "id": uid,
                "username": username,
                "email": email,
                "provider": "email",
                "role": "registro",
                "verified": False,
                "verify": {"token": token, "expires": time.time() + 86400},
                "password": hash_password(password),
                "sessions": [],
                "updatedAt": 0,
                "state": None,
                "backups": [],
            }
            store["users"][uid] = user
            apply_roles(store)
            write_store(store)
            host = self.headers.get("Host") or f"127.0.0.1:{PORT}"
            link = f"http://{host}/?verify={token}"
        if not send_mail(email, "Confirma tu cuenta de Bloc", "Abre este enlace para confirmar el correo. Vale durante 24 horas.\n\n" + link + "\n"):
            with LOCK:
                store = load_store()
                store["users"].pop(uid, None)
                write_store(store)
            self.send_json(400, {"error": "No se pudo enviar el correo de verificación."})
            return
        self.send_json(200, {"ok": True, "pending": True, "message": "Revisa el correo para confirmar la cuenta."})

    def login(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer la cuenta."})
            return
        identifier = str(data.get("identifier") or data.get("email") or data.get("username") or "").strip().lower()
        password = str(data.get("password") or "")
        with LOCK:
            store = load_store()
            user = find_user(store, identifier)
            if not user or not password_ok(password, user.get("password", "")):
                self.send_json(401, {"error": "Usuario, correo o contraseña incorrectos."})
                return
            if user.get("verified") is False:
                self.send_json(403, {"error": "Confirma el correo antes de entrar."})
                return
            if user.get("active") is False:
                self.send_json(403, {"error": "Esta cuenta está desactivada."})
                return
            token = self.add_session(user)
            write_store(store)
        self.send_json(200, {"ok": True, **public_user(user, token)})

    def recover(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer la solicitud."})
            return
        identifier = str(data.get("identifier") or "").strip().lower()
        if not smtp_settings():
            self.send_json(400, {"error": "Falta el SMTP en el archivo .env. El correo no se envió."})
            return
        with LOCK:
            store = load_store()
            user = find_user(store, identifier)
            email = (user or {}).get("email") or ""
            if not user or not email:
                self.send_json(400, {"error": "Esa cuenta no tiene un correo para enviar la recuperación."})
                return
            token = secrets.token_urlsafe(24)
            user["reset"] = {"token": token, "expires": time.time() + 3600}
            write_store(store)
            host = self.headers.get("Host") or f"127.0.0.1:{PORT}"
            link = f"http://{host}/?reset={token}"
        if not send_reset(email, link):
            self.send_json(400, {"error": "No se pudo enviar el correo. Revisa el SMTP."})
            return
        self.send_json(200, {"ok": True, "message": "Enviamos el enlace al correo de la cuenta."})

    def reset_password(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer la contraseña."})
            return
        token = str(data.get("token") or "")
        password = str(data.get("password") or "")
        if len(password) < 6:
            self.send_json(400, {"error": "La contraseña necesita al menos 6 caracteres."})
            return
        with LOCK:
            store = load_store()
            found = None
            for user in store["users"].values():
                reset = user.get("reset") or {}
                if reset.get("token") == token and reset.get("expires", 0) >= time.time():
                    found = user
                    break
            if not found:
                self.send_json(400, {"error": "El enlace ya no es válido."})
                return
            found["password"] = hash_password(password)
            found["reset"] = None
            found["sessions"] = []
            write_store(store)
        self.send_json(200, {"ok": True})

    def logout(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            data = {}
        scope = "all" if data.get("scope") == "all" else "device"
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "La sesión no es válida."})
                return
            if scope == "all":
                user["sessions"] = []
            else:
                current = self.token()
                kept = []
                for item in user.get("sessions") or []:
                    sid = item.get("id") if isinstance(item, dict) else item
                    if sid != current:
                        kept.append(item)
                user["sessions"] = kept
            write_store(store)
        self.send_json(200, {"ok": True, "scope": scope})

    def change_password(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer la contraseña."})
            return
        current = str(data.get("current") or "")
        password = str(data.get("password") or "")
        if len(password) < 6:
            self.send_json(400, {"error": "La contraseña nueva necesita al menos 6 caracteres."})
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "La sesión no es válida."})
                return
            if not password_ok(current, user.get("password", "")):
                self.send_json(401, {"error": "La contraseña actual no es correcta."})
                return
            user["password"] = hash_password(password)
            token = self.token()
            user["sessions"] = [item for item in user.get("sessions") or [] if item.get("id") == token]
            write_store(store)
        self.send_json(200, {"ok": True})

    def close_account(self):
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "La sesión no es válida."})
                return
            if user.get("role") == "admin":
                self.send_json(400, {"error": "La cuenta de administrador no se elimina."})
                return
            user_id = user["id"]
            email = user.get("email") or ""
            store["users"].pop(user_id, None)
            write_store(store)
        if email:
            send_mail(
                email,
                "Tu cuenta de Bloc se cerró",
                "Cerraste tu cuenta. Se eliminan las notas, las copias y las sesiones. "
                "Si tenías una suscripción, se pierden los pagos ya hechos y los días que quedaban.\n",
            )
        self.send_json(200, {"ok": True})

    def sync_get(self):
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            payload = public_user(user) if user else None
        if not payload:
            self.send_json(401, {"error": "La sesión no es válida."})
            return
        self.send_json(200, payload)

    def sync_post(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer la sincronización."})
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "La sesión no es válida."})
                return
            incoming_master = data.get("masterHash")
            if isinstance(incoming_master, str) and "$" in incoming_master:
                user["masterHash"] = incoming_master
            incoming_at = int(data.get("updatedAt") or 0)
            stored_at = int(user.get("updatedAt") or 0)
            if isinstance(data.get("state"), dict):
                if data.get("replace") is True:
                    user["state"] = data["state"]
                else:
                    user["state"] = merge_states(user.get("state") or {}, data["state"], incoming_at >= stored_at)
                user["updatedAt"] = max(incoming_at, stored_at)
            user["backups"] = keep_backups(user.get("backups"), data.get("backups"))
            write_store(store)
            payload = public_user(user)
        self.send_json(200, payload)

    def master_code(self):
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "La sesión no es válida."})
                return
            email = user.get("email") or ""
            if not email:
                self.send_json(400, {"error": "La cuenta no tiene correo para enviar el código."})
                return
            if not smtp_settings():
                self.send_json(400, {"error": "Falta el SMTP en el archivo .env."})
                return
            code = f"{secrets.randbelow(1000000):06d}"
            user["masterCode"] = {"hash": hash_password(code), "expires": time.time() + 900}
            write_store(store)
        sent = send_mail(
            email,
            "Código de Bloc",
            f"Tu código para recuperar la contraseña maestra es {code}. Vale 15 minutos.\n",
        )
        if not sent:
            self.send_json(400, {"error": "No se pudo enviar el código. Revisa el SMTP."})
            return
        self.send_json(200, {"ok": True})

    def master_reset(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el código."})
            return
        code = str(data.get("code") or "").strip()
        master_hash = str(data.get("masterHash") or "")
        if "$" not in master_hash:
            self.send_json(400, {"error": "La contraseña nueva no es válida."})
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "La sesión no es válida."})
                return
            saved = user.get("masterCode") or {}
            if saved.get("expires", 0) < time.time() or not password_ok(code, saved.get("hash", "")):
                self.send_json(400, {"error": "El código no es válido o ya venció."})
                return
            user["masterHash"] = master_hash
            user["masterCode"] = None
            write_store(store)
        self.send_json(200, {"ok": True})

    def verify_email(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer la confirmación."})
            return
        token = str(data.get("token") or "")
        with LOCK:
            store = load_store()
            user = None
            for item in store["users"].values():
                saved = item.get("verify") or {}
                if saved.get("token") == token and saved.get("expires", 0) >= time.time():
                    user = item
                    break
            if not user:
                self.send_json(400, {"error": "El enlace no es válido o ya venció."})
                return
            user["verified"] = True
            user["verify"] = None
            session = self.add_session(user)
            write_store(store)
        self.send_json(200, {"ok": True, **public_user(user, session)})

    def users_create(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el usuario."})
            return
        username = str(data.get("username") or "").strip().lower()
        email = str(data.get("email") or "").strip().lower()
        password = str(data.get("password") or "")
        if not username or not USER_RE.match(username):
            self.send_json(400, {"error": "El usuario usa de 3 a 32 letras, números, punto, guion o guion bajo."})
            return
        if not email or "@" not in email or "." not in email.split("@")[-1]:
            self.send_json(400, {"error": "Escribe un correo válido."})
            return
        if len(password) < 6:
            self.send_json(400, {"error": "La contraseña necesita al menos 6 caracteres."})
            return
        with LOCK:
            store = load_store()
            actor = self.require_manager(store)
            if not actor:
                return
            if find_user(store, username):
                self.send_json(409, {"error": "Ese usuario ya existe."})
                return
            if find_user(store, email):
                self.send_json(409, {"error": "Ese correo ya existe."})
                return
            uid = secrets.token_hex(8)
            role = "registro"
            kind = str(data.get("role") or "")
            if actor.get("role") == "super":
                if actor.get("canCreateRegistro") is not True:
                    self.send_json(403, {"error": "No puedes crear usuarios registro."})
                    return
                role = "registro"
            elif actor.get("role") == "admin" and kind in ("super", "google", "registro"):
                role = kind
            elif kind == "google":
                role = "google"
            parent = actor["id"] if actor.get("role") == "super" else None
            if role == "super":
                parent = None
            elif data.get("super") and actor.get("role") == "admin":
                role = "super"
                parent = None
            store["users"][uid] = {
                "id": uid,
                "username": username,
                "email": email,
                "provider": "email",
                "role": role,
                "parentId": parent,
                "verified": True,
                "password": hash_password(password),
                "sessions": [],
                "updatedAt": 0,
                "state": None,
                "backups": [],
            }
            apply_roles(store)
            write_store(store)
        self.send_json(200, {"ok": True})

    def users_get(self):
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "La sesión no es válida."})
                return
            if user.get("role") not in ("admin", "super"):
                self.send_json(403, {"error": "No puedes ver los usuarios."})
                return
            names = {item.get("id"): (item.get("username") or item.get("email") or "") for item in store["users"].values()}
            pay = load_payments()
            price_names = {row.get("id"): row.get("name") or "Precio" for row in ensure_price_lists(pay)[0]}
            people = []
            for item in store["users"].values():
                if user.get("role") == "super" and item.get("parentId") != user.get("id"):
                    continue
                people.append({
                    "id": item.get("id") or "",
                    "username": item.get("username") or "",
                    "email": item.get("email") or "",
                    "role": item.get("role") or "user",
                    "parent": names.get(item.get("parentId") or "", ""),
                    "active": item.get("active") is not False,
                    "balance": wallet_of(pay, item.get("id")),
                    "allowNegative": item.get("allowNegative") is True,
                    "permanent": item.get("permanent") is True,
                    "until": int(item.get("subscriptionUntil") or 0),
                    "periodId": (item.get("membership") or {}).get("periodId") or item.get("periodId") or "",
                    "listed": int((item.get("membership") or {}).get("listed") or 0),
                    "charged": int((item.get("membership") or {}).get("charged") or 0),
                    "canCreateRegistro": item.get("canCreateRegistro") is True,
                    "priceListId": (item.get("priceListId") or "principal") if item.get("role") == "super" else "",
                    "priceName": price_names.get(item.get("priceListId") or "principal", "Principal") if item.get("role") == "super" else "",
                })
        people.sort(key=lambda item: (item["role"] != "admin", item["username"] or item["email"]))
        can_create = user.get("role") == "admin" or (user.get("role") == "super" and user.get("canCreateRegistro") is True)
        self.send_json(200, {"users": people, "canCreate": can_create})

    def admin_export(self):
        with LOCK:
            store = load_store()
            if not self.require_admin(store):
                return
            users = copy.deepcopy(store.get("users") or {})
            for user in users.values():
                if isinstance(user, dict):
                    user["sessions"] = []
            pay = load_payments()
        self.send_json(200, {"kind": "bloc-full", "users": users, "payments": pay})

    def admin_import(self):
        data = self.read_json()
        users = data.get("users")
        if data.get("kind") != "bloc-full" or not isinstance(users, dict):
            self.send_json(400, {"error": "Esta copia no es de todo el sistema."})
            return
        clean = {}
        for uid, user in users.items():
            if not isinstance(user, dict):
                continue
            user["sessions"] = []
            user["id"] = user.get("id") or uid
            clean[user["id"]] = user
        if not clean:
            self.send_json(400, {"error": "La copia no trae usuarios."})
            return
        with LOCK:
            store = load_store()
            if not self.require_admin(store):
                return
            write_store({"users": clean})
            payments = data.get("payments") if isinstance(data.get("payments"), dict) else empty_payments()
            write_payments(payments)
        self.send_json(200, {"ok": True})

    def require_admin(self, store):
        user = self.user_by_token(store)
        if not user:
            self.send_json(401, {"error": "La sesión no es válida."})
            return None
        if user.get("role") != "admin":
            self.send_json(403, {"error": "Solo el administrador puede hacer eso."})
            return None
        return user

    def require_manager(self, store):
        user = self.user_by_token(store)
        if not user:
            self.send_json(401, {"error": "La sesión no es válida."})
            return None
        if user.get("role") not in ("admin", "super"):
            self.send_json(403, {"error": "No puedes crear usuarios."})
            return None
        return user

    def users_update(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el usuario."})
            return
        uid = str(data.get("id") or "")
        username = str(data.get("username") or "").strip().lower()
        email = str(data.get("email") or "").strip().lower()
        password = str(data.get("password") or "")
        if username and not USER_RE.match(username):
            self.send_json(400, {"error": "El usuario usa de 3 a 32 letras, números, punto, guion o guion bajo."})
            return
        if email and ("@" not in email or "." not in email.split("@")[-1]):
            self.send_json(400, {"error": "Escribe un correo válido."})
            return
        if not username and not email:
            self.send_json(400, {"error": "Deja un usuario o un correo."})
            return
        if password and len(password) < 6:
            self.send_json(400, {"error": "La contraseña necesita al menos 6 caracteres."})
            return
        active = data.get("active") if "active" in data else None
        with LOCK:
            store = load_store()
            if not self.require_admin(store):
                return
            target = store["users"].get(uid)
            if not target:
                self.send_json(404, {"error": "No está ese usuario."})
                return
            other_name = find_user(store, username) if username else None
            other_mail = find_user(store, email) if email else None
            if other_name and other_name.get("id") != uid:
                self.send_json(409, {"error": "Ese usuario ya existe."})
                return
            if other_mail and other_mail.get("id") != uid:
                self.send_json(409, {"error": "Ese correo ya existe."})
                return
            target["username"] = username
            target["email"] = email
            if password:
                target["password"] = hash_password(password)
                target["sessions"] = []
            if active is not None:
                target["active"] = bool(active)
            if target.get("role") != "admin":
                chosen = data.get("role")
                if chosen in ("registro", "super", "google"):
                    target["role"] = chosen
                elif "super" in data:
                    target["role"] = "super" if data.get("super") else "registro"
                if "allowNegative" in data:
                    target["allowNegative"] = bool(data.get("allowNegative"))
                if "permanent" in data:
                    target["permanent"] = bool(data.get("permanent"))
                if target.get("role") == "super" and "canCreateRegistro" in data:
                    target["canCreateRegistro"] = bool(data.get("canCreateRegistro"))
                elif target.get("role") != "super":
                    target["canCreateRegistro"] = False
            pay = load_payments()
            if target.get("role") == "super" and "priceListId" in data:
                chosen = str(data.get("priceListId") or "principal") or "principal"
                lists, _ = ensure_price_lists(pay)
                if not any(row.get("id") == chosen for row in lists):
                    self.send_json(400, {"error": "Ese precio no existe."})
                    return
                target["priceListId"] = chosen
            elif target.get("role") != "super":
                target.pop("priceListId", None)
            added = data.get("balanceAdd")
            if added not in (None, ""):
                delta = parse_amount(added)
                if delta is None:
                    self.send_json(400, {"error": "El saldo no es un número."})
                    return
                set_wallet(pay, uid, wallet_of(pay, uid) + delta)
                write_payments(pay)
            period_id = str(data.get("membership") or "")
            if period_id:
                payer = store["users"].get(target.get("parentId") or "") if target.get("parentId") else None
                charged = None
                if payer and payer.get("role") == "super":
                    charged = list_price(pay, payer, plan_period(period_id, pay))
                ok, result = activate_period(target, pay, period_id, charged=charged)
                if not ok:
                    self.send_json(400, {"error": result})
                    return
                write_payments(pay)
            write_store(store)
        self.send_json(200, {"ok": True})

    def users_membership(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer la membresía."})
            return
        uid = str(data.get("id") or "")
        period_id = str(data.get("period") or "")
        with LOCK:
            store = load_store()
            actor = self.require_manager(store)
            if not actor:
                return
            target = store["users"].get(uid)
            if not target:
                self.send_json(404, {"error": "No está ese usuario."})
                return
            if actor.get("role") == "super" and target.get("parentId") != actor.get("id"):
                self.send_json(403, {"error": "Solo puedes activar la membresía de tus usuarios."})
                return
            if target.get("permanent") is True or target.get("role") == "admin":
                self.send_json(400, {"error": "Este usuario no necesita membresía."})
                return
            payer = actor if actor.get("role") == "super" else None
            if payer is None and target.get("parentId"):
                payer = store["users"].get(target.get("parentId") or "")
            pay = load_payments()
            charged = None
            if payer and payer.get("role") == "super":
                charged = list_price(pay, payer, plan_period(period_id, pay))
            ok, result = activate_period(target, pay, period_id, charged=charged)
            if not ok:
                self.send_json(400, {"error": result})
                return
            write_payments(pay)
            write_store(store)
        self.send_json(200, {"ok": True, "until": int(target.get("subscriptionUntil") or 0)})

    def users_credit(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el saldo."})
            return
        delta = parse_amount(data.get("amount"))
        if delta is None:
            self.send_json(400, {"error": "Escribe el saldo a sumar."})
            return
        uid = str(data.get("id") or "")
        with LOCK:
            store = load_store()
            actor = self.require_manager(store)
            if not actor:
                return
            target = store["users"].get(uid)
            if not target:
                self.send_json(404, {"error": "No está ese usuario."})
                return
            if actor.get("role") == "super" and target.get("parentId") != actor.get("id"):
                self.send_json(403, {"error": "Solo puedes recargar a tus clientes."})
                return
            pay = load_payments()
            set_wallet(pay, uid, wallet_of(pay, uid) + delta)
            write_payments(pay)
        self.send_json(200, {"ok": True, "balance": wallet_of(pay, uid)})

    def users_delete(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el usuario."})
            return
        uid = str(data.get("id") or "")
        with LOCK:
            store = load_store()
            admin = self.require_admin(store)
            if not admin:
                return
            target = store["users"].get(uid)
            if not target:
                self.send_json(404, {"error": "No está ese usuario."})
                return
            if target.get("id") == admin.get("id"):
                self.send_json(400, {"error": "No puedes eliminarte desde el listado."})
                return
            target["sessions"] = []
            write_store(store)
        erase_later(uid)
        self.send_json(202, {"ok": True})

    def payments_view(self, store, pay, user, admin):
        methods = [item for item in pay["methods"] if admin or item.get("active")]
        mine = [public_request(item) for item in pay["requests"] if item.get("userId") == user.get("id")]
        return {
            "balance": wallet_of(pay, user.get("id")),
            "methods": pay["methods"] if admin else methods,
            "requests": mine,
            "review": [public_request(item) for item in pay["requests"]] if admin else [],
            "admin": admin,
            "username": user.get("username") or user.get("email") or "",
            **access_view(store, pay, user),
            "coupons": [coupon_public(item) for item in pay.get("coupons") or []] if admin else [],
            "priceLists": [
                {"id": row.get("id"), "name": row.get("name") or "Precio", "prices": row.get("prices") or {}}
                for row in ensure_price_lists(pay)[0]
            ] if admin else [],
        }

    def payments_get(self):
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "Entra en tu cuenta."})
                return
            pay = load_payments()
            _, changed = ensure_price_lists(pay)
            if changed:
                write_payments(pay)
            admin = user.get("role") == "admin"
            self.send_json(200, self.payments_view(store, pay, user, admin))

    def payments_post(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el pago."})
            return
        amount = parse_amount(data.get("amount"))
        if amount is None:
            self.send_json(400, {"error": "Escribe un monto válido."})
            return
        proof = str(data.get("proof") or "")
        if "," in proof:
            proof = proof.split(",", 1)[1]
        try:
            raw = base64.b64decode(proof) if proof else b""
        except Exception:
            raw = b""
        if not raw or len(raw) > 1500000:
            self.send_json(400, {"error": "Adjunta un pantallazo de la transferencia."})
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "Entra en tu cuenta."})
                return
            pay = load_payments()
            method = next((item for item in pay["methods"] if item.get("id") == data.get("methodId") and item.get("active")), None)
            if not method:
                self.send_json(400, {"error": "Elige un medio de pago."})
                return
            req_id = secrets.token_hex(8)
            PROOFS.mkdir(parents=True, exist_ok=True)
            (PROOFS / f"{req_id}.img").write_bytes(raw)
            pay["requests"].insert(0, {
                "id": req_id,
                "userId": user.get("id"),
                "username": user.get("username") or user.get("email") or "",
                "methodId": method.get("id"),
                "methodLabel": method.get("label") or "",
                "account": method.get("account") or "",
                "amount": amount,
                "period": str(data.get("period") or ""),
                "status": "pending",
                "createdAt": int(time.time() * 1000),
                "proof": f"{req_id}.img",
            })
            write_payments(pay)
            admin = user.get("role") == "admin"
            self.send_json(200, self.payments_view(store, pay, user, admin))

    def payments_review(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer la revisión."})
            return
        status = data.get("status")
        if status not in ("approved", "rejected"):
            self.send_json(400, {"error": "Elige aprobar o rechazar."})
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user or user.get("role") != "admin":
                self.send_json(403, {"error": "Solo el administrador revisa pagos."})
                return
            pay = load_payments()
            item = next((row for row in pay["requests"] if row.get("id") == data.get("id")), None)
            if not item:
                self.send_json(404, {"error": "No está esa solicitud."})
                return
            if item.get("status") == "pending" and status == "approved":
                key = item.get("userId") or ""
                set_wallet(pay, key, wallet_of(pay, key) + float(item.get("amount") or 0))
                buyer = store["users"].get(key)
                period = item.get("period") or ""
                if buyer and period:
                    ok, result = activate_period(buyer, pay, period)
                    item["activated"] = bool(ok)
                    item["note"] = "" if ok else result
                    if ok:
                        write_store(store)
            item["status"] = status
            write_payments(pay)
            self.send_json(200, self.payments_view(store, pay, user, True))

    def payments_methods(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudieron leer los medios."})
            return
        incoming = data.get("methods")
        if not isinstance(incoming, list):
            self.send_json(400, {"error": "Faltan los medios de pago."})
            return
        methods = []
        for item in incoming[:12]:
            if not isinstance(item, dict):
                continue
            label = str(item.get("label") or "").strip()[:40]
            if not label:
                continue
            methods.append({
                "id": str(item.get("id") or secrets.token_hex(4))[:24],
                "label": label,
                "account": str(item.get("account") or "").strip()[:80],
                "detail": str(item.get("detail") or "").strip()[:120],
                "active": item.get("active") is not False,
            })
        if not methods:
            self.send_json(400, {"error": "Deja al menos un medio de pago."})
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user or user.get("role") != "admin":
                self.send_json(403, {"error": "Solo el administrador edita los medios."})
                return
            pay = load_payments()
            pay["methods"] = methods
            write_payments(pay)
            self.send_json(200, self.payments_view(store, pay, user, True))

    def plan_get(self):
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "Entra en tu cuenta."})
                return
            pay = load_payments()
            self.send_json(200, access_view(store, pay, user))

    def subscription_activate(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el plan."})
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "Entra en tu cuenta."})
                return
            if user.get("role") == "admin" or user.get("permanent") is True:
                self.send_json(200, {"ok": True, "message": "Tu cuenta no tiene cobro."})
                return
            pay = load_payments()
            ok, result = activate_period(user, pay, str(data.get("period") or ""))
            if not ok:
                self.send_json(400, {"error": result})
                return
            write_store(store)
            write_payments(pay)
            self.send_json(200, self.payments_view(store, pay, user, user.get("role") == "admin"))

    def subscription_play(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer la compra."})
            return
        token = str(data.get("token") or "").strip()
        if len(token) < 8:
            self.send_json(400, {"error": "Falta la compra de Google Play."})
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "Entra en tu cuenta."})
                return
            pay = load_payments()
            if token in pay["playTokens"]:
                self.send_json(409, {"error": "Esa compra ya se usó."})
                return
            if user.get("role") not in ("admin", "super"):
                user["role"] = "google"
            ok, result = activate_period(user, pay, str(data.get("period") or ""), free=True)
            if not ok:
                self.send_json(400, {"error": result})
                return
            pay["playTokens"].append(token)
            write_store(store)
            write_payments(pay)
            self.send_json(200, self.payments_view(store, pay, user, user.get("role") == "admin"))

    def coupon_create(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el cupón."})
            return
        amount = parse_amount(data.get("amount"))
        if amount is None:
            self.send_json(400, {"error": "Escribe el saldo del cupón."})
            return
        code = coupon_code(data.get("code"))
        if not code:
            self.send_json(400, {"error": "Escribe el código del cupón."})
            return
        uses, days, limit_error = read_coupon_limits(data)
        if limit_error:
            self.send_json(400, {"error": limit_error})
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user or user.get("role") != "admin":
                self.send_json(403, {"error": "Solo el administrador crea cupones."})
                return
            pay = load_payments()
            if any(item.get("code") == code for item in pay["coupons"]):
                self.send_json(409, {"error": "Ese código ya existe."})
                return
            pay["coupons"].insert(0, {
                "code": code,
                "amount": amount,
                "uses": uses,
                "days": days,
                "usedCount": 0,
                "active": True,
                "note": str(data.get("note") or "")[:80],
                "createdAt": int(time.time() * 1000),
                "usedBy": "",
            })
            write_payments(pay)
            self.send_json(200, {"ok": True, "code": code, "amount": amount})

    def coupon_redeem(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el cupón."})
            return
        code = coupon_code(data.get("code"))
        if not code:
            self.send_json(400, {"error": "Escribe el código."})
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_json(401, {"error": "Entra en tu cuenta."})
                return
            pay = load_payments()
            coupon = next((item for item in pay["coupons"] if item.get("code") == code), None)
            if not coupon or coupon.get("active") is False or coupon_expired(coupon) or coupon_used_of(coupon) >= coupon_uses_of(coupon):
                self.send_json(404, {"error": "Ese cupón no está disponible."})
                return
            coupon["usedCount"] = coupon_used_of(coupon) + 1
            coupon["usedBy"] = user.get("id")
            coupon["usedAt"] = int(time.time() * 1000)
            set_wallet(pay, user.get("id"), wallet_of(pay, user.get("id")) + float(coupon.get("amount") or 0))
            write_payments(pay)
            self.send_json(200, self.payments_view(store, pay, user, user.get("role") == "admin"))

    def coupon_update(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el cupón."})
            return
        code = coupon_code(data.get("code"))
        if not code:
            self.send_json(400, {"error": "Escribe el código del cupón."})
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user or user.get("role") != "admin":
                self.send_json(403, {"error": "Solo el administrador edita cupones."})
                return
            pay = load_payments()
            coupon = next((item for item in pay["coupons"] if item.get("code") == code), None)
            if not coupon:
                self.send_json(404, {"error": "Ese cupón no existe."})
                return
            if "active" in data and "amount" not in data:
                coupon["active"] = bool(data.get("active"))
                write_payments(pay)
                self.send_json(200, {"ok": True})
                return
            amount = parse_amount(data.get("amount"))
            if amount is None:
                self.send_json(400, {"error": "Escribe el saldo del cupón."})
                return
            uses, days, limit_error = read_coupon_limits(data)
            if limit_error:
                self.send_json(400, {"error": limit_error})
                return
            if uses < coupon_used_of(coupon):
                self.send_json(400, {"error": "Los usos no pueden ser menos de los que ya se canjearon."})
                return
            next_code = coupon_code(data.get("nextCode") or code)
            if not next_code:
                self.send_json(400, {"error": "Escribe el código del cupón."})
                return
            if next_code != code and any(item.get("code") == next_code for item in pay["coupons"]):
                self.send_json(409, {"error": "Ese código ya existe."})
                return
            coupon["code"] = next_code
            coupon["amount"] = amount
            coupon["uses"] = uses
            coupon["days"] = days
            write_payments(pay)
            self.send_json(200, {"ok": True})

    def coupon_delete(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el cupón."})
            return
        code = coupon_code(data.get("code"))
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user or user.get("role") != "admin":
                self.send_json(403, {"error": "Solo el administrador elimina cupones."})
                return
            pay = load_payments()
            before = len(pay["coupons"])
            pay["coupons"] = [item for item in pay["coupons"] if item.get("code") != code]
            if len(pay["coupons"]) == before:
                self.send_json(404, {"error": "Ese cupón no existe."})
                return
            write_payments(pay)
            self.send_json(200, {"ok": True})

    def prices_save(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el precio."})
            return
        amounts = read_amounts(data.get("prices"))
        if not amounts:
            self.send_json(400, {"error": "Escribe los cuatro precios."})
            return
        name = str(data.get("name") or "").strip()[:40]
        pid = str(data.get("id") or "")
        with LOCK:
            store = load_store()
            if not self.require_admin(store):
                return
            pay = load_payments()
            lists, _ = ensure_price_lists(pay)
            if pid == "principal":
                main = next((row for row in lists if row.get("id") == "principal"), None)
                if not main:
                    self.send_json(404, {"error": "Ese precio no existe."})
                    return
                main["prices"] = amounts
            elif pid:
                item = next((row for row in lists if row.get("id") == pid), None)
                if not item:
                    self.send_json(404, {"error": "Ese precio no existe."})
                    return
                if not name:
                    self.send_json(400, {"error": "Escribe el nombre del precio."})
                    return
                if any(row.get("name", "").lower() == name.lower() and row.get("id") != pid for row in lists):
                    self.send_json(409, {"error": "Ya hay un precio con ese nombre."})
                    return
                item["name"] = name
                item["prices"] = amounts
            else:
                if not name:
                    self.send_json(400, {"error": "Escribe el nombre del precio."})
                    return
                if any(row.get("name", "").lower() == name.lower() for row in lists):
                    self.send_json(409, {"error": "Ya hay un precio con ese nombre."})
                    return
                lists.append({"id": secrets.token_hex(4), "name": name, "prices": amounts})
            pay["priceLists"] = lists
            write_payments(pay)
            self.send_json(200, self.payments_view(store, pay, self.user_by_token(store), True))

    def prices_delete(self):
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el precio."})
            return
        pid = str(data.get("id") or "")
        if pid == "principal":
            self.send_json(400, {"error": "El precio principal no se elimina."})
            return
        with LOCK:
            store = load_store()
            if not self.require_admin(store):
                return
            pay = load_payments()
            lists, _ = ensure_price_lists(pay)
            if not any(row.get("id") == pid for row in lists):
                self.send_json(404, {"error": "Ese precio no existe."})
                return
            pay["priceLists"] = [row for row in lists if row.get("id") != pid]
            for person in store["users"].values():
                if person.get("priceListId") == pid:
                    person["priceListId"] = "principal"
            write_payments(pay)
            write_store(store)
            self.send_json(200, self.payments_view(store, pay, self.user_by_token(store), True))

    def partner_coupon(self):
        if self.headers.get("X-Bloc-Key", "") != partner_key() or not partner_key():
            self.send_json(403, {"error": "La clave interna no coincide."})
            return
        try:
            data = self.read_json()
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "No se pudo leer el cupón."})
            return
        amount = parse_amount(data.get("amount"))
        if amount is None:
            self.send_json(400, {"error": "Escribe el saldo del cupón."})
            return
        code = re.sub(r"[^A-Za-z0-9]", "", str(data.get("code") or "")).upper()[:16] or secrets.token_hex(4).upper()
        with LOCK:
            pay = load_payments()
            if any(item.get("code") == code for item in pay["coupons"]):
                self.send_json(409, {"error": "Ese código ya existe."})
                return
            pay["coupons"].insert(0, {
                "code": code,
                "amount": amount,
                "note": str(data.get("note") or "imap")[:80],
                "createdAt": int(time.time() * 1000),
                "usedBy": "",
                "source": "imap",
            })
            write_payments(pay)
        self.send_json(200, {"ok": True, "code": code, "amount": amount})

    def payments_proof(self, req_id):
        if not re.fullmatch(r"[a-f0-9]{16}", req_id or ""):
            self.send_error(404)
            return
        with LOCK:
            store = load_store()
            user = self.user_by_token(store)
            if not user:
                self.send_error(401)
                return
            pay = load_payments()
            item = next((row for row in pay["requests"] if row.get("id") == req_id), None)
            if not item or (user.get("role") != "admin" and item.get("userId") != user.get("id")):
                self.send_error(404)
                return
            path = PROOFS / f"{req_id}.img"
        if not path.exists():
            self.send_error(404)
            return
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def lan_urls():
    import socket
    found = []
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        probe.connect(("8.8.8.8", 80))
        found.append(probe.getsockname()[0])
        probe.close()
    except OSError:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None):
            ip = info[4][0]
            if ":" in ip or ip.startswith("127."):
                continue
            if ip not in found:
                found.append(ip)
    except OSError:
        pass
    return [f"http://{ip}:{PORT}" for ip in found]


PERIOD_SPECS = [
    {"id": "month", "label": "1 mes", "months": 1, "discount": 0},
    {"id": "quarter", "label": "3 meses", "months": 3, "discount": 10},
    {"id": "half", "label": "6 meses", "months": 6, "discount": 20},
    {"id": "year", "label": "1 año", "months": 12, "discount": 30},
]
DEFAULT_AMOUNTS = {"month": 15000, "quarter": 40500, "half": 72000, "year": 126000}


def read_amounts(raw):
    clean = {}
    source = raw if isinstance(raw, dict) else {}
    for key in DEFAULT_AMOUNTS:
        amount = parse_amount(source.get(key))
        if amount is None:
            return None
        clean[key] = int(amount)
    return clean


def ensure_price_lists(pay):
    raw = pay.get("priceLists")
    lists = [item for item in raw if isinstance(item, dict)] if isinstance(raw, list) else []
    changed = not isinstance(raw, list) or len(lists) != len(raw)
    main = next((item for item in lists if item.get("id") == "principal"), None)
    if not main:
        main = {"id": "principal", "name": "Principal", "prices": dict(DEFAULT_AMOUNTS)}
        lists.insert(0, main)
        changed = True
    else:
        prices = main.get("prices") if isinstance(main.get("prices"), dict) else {}
        fixed = {key: int(prices.get(key) or DEFAULT_AMOUNTS[key]) for key in DEFAULT_AMOUNTS}
        if main.get("name") != "Principal" or main.get("prices") != fixed:
            main["name"] = "Principal"
            main["prices"] = fixed
            changed = True
    clean = []
    for item in lists:
        if not isinstance(item, dict) or not item.get("id"):
            changed = True
            continue
        if item.get("id") == "principal":
            clean.append(main)
            continue
        prices = read_amounts(item.get("prices")) or dict(DEFAULT_AMOUNTS)
        name = str(item.get("name") or "Precio").strip()[:40] or "Precio"
        row = {"id": str(item.get("id")), "name": name, "prices": prices}
        if item.get("name") != name or item.get("prices") != prices:
            changed = True
        clean.append(row)
    pay["priceLists"] = clean
    return clean, changed


def plan_from(pay):
    lists, _ = ensure_price_lists(pay) if pay else ([], False)
    main = next((item for item in lists if item.get("id") == "principal"), None)
    amounts = (main or {}).get("prices") or DEFAULT_AMOUNTS
    periods = []
    for spec in PERIOD_SPECS:
        periods.append({**spec, "price": int(amounts.get(spec["id"]) or DEFAULT_AMOUNTS[spec["id"]])})
    return {**PLAN, "periods": periods}


def plan_period(period_id, pay=None):
    for item in plan_from(pay)["periods"]:
        if item["id"] == period_id:
            return item
    return None


def list_price(pay, actor, period):
    lists, _ = ensure_price_lists(pay)
    chosen = str((actor or {}).get("priceListId") or "principal")
    item = next((row for row in lists if row.get("id") == chosen), None) or (lists[0] if lists else None)
    raw = ((item or {}).get("prices") or {}).get((period or {}).get("id"))
    try:
        value = int(round(float(raw)))
    except (TypeError, ValueError):
        value = 0
    return value if value > 0 else int((period or {}).get("price") or 0)


PLAN = {
    "id": "bloc",
    "name": "Bloc",
    "description": "Notas con avisos, gastos por categoría, cuentas y plantillas, copias y contraseña maestra.",
    "periods": [
        {"id": "month", "label": "1 mes", "months": 1, "price": 15000, "discount": 0},
        {"id": "quarter", "label": "3 meses", "months": 3, "price": 40500, "discount": 10},
        {"id": "half", "label": "6 meses", "months": 6, "price": 72000, "discount": 20},
        {"id": "year", "label": "1 año", "months": 12, "price": 126000, "discount": 30},
    ],
}
MONTH_MS = 30 * 24 * 60 * 60 * 1000


def wallet_of(pay, user_id):
    try:
        return round(float(pay["balances"].get(user_id) or 0), 2)
    except (TypeError, ValueError):
        return 0


def set_wallet(pay, user_id, amount):
    pay["balances"][user_id] = round(float(amount), 2)


def entitled(user):
    if not user:
        return False
    if user.get("role") == "admin" or user.get("permanent") is True:
        return True
    return int(user.get("subscriptionUntil") or 0) > int(time.time() * 1000)


def access_view(store, pay, user):
    admin = user.get("role") == "admin"
    until = int(user.get("subscriptionUntil") or 0)
    return {
        "plan": plan_from(pay),
        "balance": wallet_of(pay, user.get("id")),
        "until": until,
        "permanent": user.get("permanent") is True,
        "allowNegative": user.get("allowNegative") is True,
        "admin": admin,
        "needsPlan": not entitled(user),
        "playOnly": False,
        "listed": int((user.get("membership") or {}).get("listed") or 0),
    }


def special_price(actor, period):
    prices = (actor or {}).get("specialPrices") or {}
    raw = prices.get((period or {}).get("id"))
    try:
        value = round(float(raw))
    except (TypeError, ValueError):
        return (period or {}).get("price") or 0
    return value if value > 0 else (period or {}).get("price") or 0


def activate_period(user, pay, period_id, free=False, charged=None):
    period = plan_period(period_id, pay)
    if not period:
        return False, "Ese plazo no existe."
    listed = period["price"]
    price = 0 if free else (listed if charged is None else charged)
    balance = wallet_of(pay, user.get("id"))
    if not free and balance < price and user.get("allowNegative") is not True:
        return False, "No alcanza el saldo. Recarga o elige un plazo menor."
    if not free:
        set_wallet(pay, user.get("id"), balance - price)
    now = int(time.time() * 1000)
    base = max(now, int(user.get("subscriptionUntil") or 0))
    user["subscriptionUntil"] = base + period["months"] * MONTH_MS
    user["planId"] = PLAN["id"]
    user["periodId"] = period["id"]
    user["membership"] = {"periodId": period["id"], "listed": listed, "charged": price, "at": now}
    return True, period


def partner_key():
    load_env()
    return os.environ.get("BLOC_PARTNER_KEY", "").strip()


def main():
    load_env()
    load_store()
    load_payments()
    url = f"http://127.0.0.1:{PORT}"
    try:
        bind = os.environ.get("BLOC_BIND", "0.0.0.0")
        with ThreadingHTTPServer((bind, PORT), Handler) as httpd:
            httpd.allow_reuse_address = True
            httpd.daemon_threads = True
            print(f"Bloc está en {url}")
            phones = lan_urls()
            if phones:
                print("En el celular, misma cuenta, abre:")
                for item in phones:
                    print(f"  {item}")
                print("El computador y el celular tienen que estar en la misma red Wi-Fi.")
            print("Pulsa Ctrl+C para detener.")
            if os.environ.get("BLOC_OPEN_BROWSER", "1") != "0":
                webbrowser.open(url)
            try:
                httpd.serve_forever(poll_interval=0.5)
            except KeyboardInterrupt:
                print("\nDetenida.")
    except OSError:
        print(f"El puerto {PORT} ya está en uso. Cierra la otra ventana CMD y ejecuta: python run.py")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
