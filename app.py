import os
import requests
from flask import Flask, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime 
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask import request
from sqlalchemy import func
from functools import wraps
from flask import render_template
import datetime

load_dotenv() # Загрузка данных из файла .env

app = Flask(__name__)

app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')

app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  
app.config['SESSION_COOKIE_HTTPONLY'] = True

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL', 
    f'mysql+pymysql://{os.getenv("MYSQL_USER")}:{os.getenv("MYSQL_PASSWORD")}@{os.getenv("MYSQL_HOST")}/{os.getenv("MYSQL_DB")}'
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False 

CORS(app, 
     supports_credentials=True,
     origins=["http://localhost:5500", "http://127.0.0.1:5500"])

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@login_manager.unauthorized_handler
def unauthorized():
    if request.path.startswith('/api/'):
        return jsonify(message='Unauthorized: Authentication required to access this resource.'), 401
    return jsonify(message='Unauthorized: Please log in.'), 401

def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"error": "Unauthorized"}), 401
        if getattr(current_user, "role", "user") != "admin":
            return jsonify({"error": "Forbidden"}), 403
        return f(*args, **kwargs)
    return wrapper

db = SQLAlchemy(app)

@app.before_request
def ensure_tables_exist():
    # Создаёт отсутствующие таблицы (если их удалили руками),
    # не трогает существующие и не “пересоздаёт” данные.
    db.create_all()

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.BigInteger, unique=True, nullable=False)
    offer_id = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(512), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=True) 
    image_url = db.Column(db.String(1024), nullable=True)
    last_synced = db.Column(db.DateTime, nullable=False, default=datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))
    is_hidden = db.Column(db.Boolean, nullable=False, default=False)
    is_manual = db.Column(db.Boolean, nullable=False, default=False)
    source = db.Column(db.String(20), nullable=False, default='ozon')
    stock = db.Column(db.Integer, nullable=True)
    def __repr__(self):
        return f'<Product {self.offer_id} - {self.name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'product_id': str(self.product_id), 
            'offer_id': self.offer_id,
            'name': self.name,
            'price': float(self.price) if self.price else None, 
            'image_url': self.image_url,
            'stock': self.stock,
            'is_manual': self.is_manual,
            'last_synced': self.last_synced.isoformat() if self.last_synced else None,
            'source': self.source
        }
        
class SyncLog(db.Model):
    __tablename__ = 'sync_logs'

    id = db.Column(db.Integer, primary_key=True)
    started_at = db.Column(db.DateTime, default=datetime.datetime.now(datetime.timezone.utc), nullable=False)
    finished_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), nullable=False)  
    updated_count = db.Column(db.Integer, default=0)
    error_message = db.Column(db.Text, nullable=True)

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    def __repr__(self):
        return f'<SyncLog {self.id} status={self.status}>'

@app.route("/")
def index():
    return render_template("index.html")
        
@app.route('/api/products/<string:offer_id>', methods=['GET'])
@login_required
def get_product_detail(offer_id):
    product = Product.query.filter_by(offer_id=offer_id).first()

    if not product:
        return jsonify({"message": "Товар не найден"}), 404

    return jsonify(product.to_dict()), 200

class User(db.Model, UserMixin):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')
    created_at = db.Column(db.DateTime, default=datetime.datetime.now(datetime.timezone.utc))
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))
    sync_logs = db.relationship('SyncLog', backref='user', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'


# Получаем ключи из переменных окружения
OZON_CLIENT_ID = os.getenv('OZON_CLIENT_ID')
OZON_API_KEY = os.getenv('OZON_API_KEY')
OZON_API_URL = "https://api-seller.ozon.ru" 

# Проверяем, что ключи загружены. Если нет, печатаем ошибку и завершаем работу.
if not OZON_CLIENT_ID or not OZON_API_KEY:
    print("Ошибка: OZON_CLIENT_ID или OZON_API_KEY не загружены из .env файла.")
    print("Убедитесь, что .env файл существует в папке backend и содержит корректные данные.")
    exit(1)
    
with app.app_context():
    db.create_all()
    print("Database tables created (if they didn't exist).")
    
@app.route('/api/dashboard_stats')
def dashboard_stats():
    total = Product.query.count()
    hidden = Product.query.filter_by(is_hidden=True).count()
    manual = Product.query.filter_by(is_manual=True).count()
    out_of_stock = Product.query.filter(Product.stock == 0).count()

    avg_price = db.session.query(db.func.avg(Product.price)).scalar()
    avg_price = round(float(avg_price), 2) if avg_price else 0

    return jsonify({
        "total": total,
        "hidden": hidden,
        "manual": manual,
        "out_of_stock": out_of_stock,
        "avg_price": avg_price
    })

@app.route('/api/products', methods=['GET'])
@login_required
def get_ozon_products():
    headers = {
        "Client-Id": OZON_CLIENT_ID,
        "Api-Key": OZON_API_KEY,
        "Content-Type": "application/json"
    }

    products_to_frontend = []
    overwrite_manual = request.args.get('overwrite_manual', default=0, type=int) == 1
    overwrite_hidden = request.args.get('overwrite_hidden', default=0, type=int) == 1
    
    log = SyncLog(
        status='in_progress',
        user_id=current_user.id,
        started_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.session.add(log)
    db.session.flush()

    try:
        # Получаем список offer_id товаров с помощью v3/product/list
        list_products_url = f"{OZON_API_URL}/v3/product/list"
        list_products_payload = {
            "filter": {"visibility": "ALL"},
            "last_id": "",
            "limit": 50
        }

        response_list = requests.post(list_products_url, headers=headers, json=list_products_payload)
        response_list.raise_for_status()
        ozon_list_data = response_list.json()

        if not isinstance(ozon_list_data, dict):
            print(f"Ошибка: Неожиданный формат ответа от Ozon API (v3/product/list). Ожидался dict, получено: {type(ozon_list_data)}")
            raise ValueError("Неожиданный формат ответа от Ozon API (v3/product/list)")

        products_raw_from_ozon = ozon_list_data.get('result', {}).get('items', [])

        if not isinstance(products_raw_from_ozon, list):
            print(f"Ошибка: Неожиданный формат данных в 'result.items' от Ozon API (v3/product/list). Ожидался list, получено: {type(products_raw_from_ozon)}")
            products_raw_from_ozon = [] 

        if not products_raw_from_ozon:
            return jsonify({"products": []})

        offer_ids_from_ozon = []
        for item in products_raw_from_ozon:
            if isinstance(item, dict) and 'offer_id' in item:
                offer_ids_from_ozon.append(item['offer_id'])
            else:
                print(f"Предупреждение: Пропущен элемент в списке товаров Ozon (v3/product/list) из-за некорректного формата или отсутствия 'offer_id': {item}")

        if not offer_ids_from_ozon:
            return jsonify({"products": []})

        # Получение детальной информации о товарах по айдишникам с первого эндпоинта
        info_products_url = f"{OZON_API_URL}/v3/product/info/list"
        info_products_payload = {"offer_id": offer_ids_from_ozon}

        response_info = requests.post(info_products_url, headers=headers, json=info_products_payload)
        response_info.raise_for_status()
        ozon_info_data = response_info.json()

        if not isinstance(ozon_info_data, dict):
            print(f"Ошибка: Неожиданный формат ответа от Ozon API (v3/product/info/list). Ожидался dict, получено: {type(ozon_info_data)}")
            raise ValueError("Неожиданный формат ответа от Ozon API (v3/product/info/list)")

        detailed_products_map = {}
        ozon_items_info = ozon_info_data.get('items', [])

        if not isinstance(ozon_items_info, list):
            print(f"Ошибка: Неожиданный формат данных в 'items' от Ozon API (v3/product/info/list). Ожидался list, получено: {type(ozon_items_info)}")
            ozon_items_info = [] 

        for item in ozon_items_info:
            if isinstance(item, dict) and 'offer_id' in item:
                detailed_products_map[item['offer_id']] = item
            else:
                print(f"Предупреждение: Пропущен элемент в списке детальной информации Ozon (v3/product/info/list) из-за некорректного формата или отсутствия 'offer_id': {item}")


        # Сохранение/обновление данных в БД и подготовка для фронта
        for ozon_item in products_raw_from_ozon:
            if not isinstance(ozon_item, dict) or 'offer_id' not in ozon_item:
                print(f"Предупреждение: Пропускаем элемент из списка товаров Ozon (v3/product/list) из-за некорректного формата: {ozon_item}")
                continue

            current_offer_id = ozon_item['offer_id']
            detail = detailed_products_map.get(current_offer_id)

            product_name = 'Название не указано'
            product_price_value = None
            product_image_url = None
            product_stock = None

            if detail: 
                product_name = detail.get('name') if isinstance(detail.get('name'), str) else 'Название не указано'
                potential_price = detail.get('price')
                if isinstance(potential_price, str):
                    try:
                        product_price_value = float(potential_price)
                    except ValueError:
                        print(f"Предупреждение: Не удалось преобразовать цену '{potential_price}' в число для offer_id {current_offer_id}.")
                elif isinstance(potential_price, (int, float)): 
                    product_price_value = float(potential_price)
                else:
                    print(f"Предупреждение: Некорректный формат цены для offer_id {current_offer_id}. Получено: {potential_price} (тип: {type(potential_price)})")

                potential_image_url = detail.get('primary_image')
                if isinstance(potential_image_url, str) and potential_image_url:
                    product_image_url = potential_image_url
                else:
                    images_list = detail.get('images')
                    if isinstance(images_list, list) and images_list:
                        first_image_url_candidate = images_list[0]
                        if isinstance(first_image_url_candidate, str) and first_image_url_candidate:
                            product_image_url = first_image_url_candidate
                        else:
                            print(f"Предупреждение: Некорректный формат первого элемента в списке 'images' для offer_id {current_offer_id}. Получено: {first_image_url_candidate} (тип: {type(first_image_url_candidate)})")
                    else:
                        print(f"Предупреждение: Нет поля 'primary_image' и список 'images' пуст или некорректен для offer_id {current_offer_id}.")
                        
                stocks_block = detail.get('stocks')
                if isinstance(stocks_block, dict):
                    stocks_list = stocks_block.get('stocks')
                    if isinstance(stocks_list, list):
                        total = 0
                        has_any = False
                        for s in stocks_list:
                            if not isinstance(s, dict):
                                continue
                            present = s.get('present', 0)
                            reserved = s.get('reserved', 0)

                            try:
                                present = int(present)
                            except (TypeError, ValueError):
                                present = 0

                            try:
                                reserved = int(reserved)
                            except (TypeError, ValueError):
                                reserved = 0

                            total += max(present - reserved, 0)
                            has_any = True

                        product_stock = total if has_any else None

            else: 
                print(f"Предупреждение: Детальная информация не найдена для offer_id: {current_offer_id}. Попытка взять из БД.")
            

            # Поиск товара в БД
            existing_product = Product.query.filter_by(offer_id=current_offer_id).first()

            if existing_product:
                # 1) Скрытые товары: не трогаем, если пользователь не разрешил overwrite_hidden
                if existing_product.is_hidden and not overwrite_hidden:
                    continue

                # 2) Ручные правки: не трогаем, если пользователь не разрешил overwrite_manual
                if existing_product.is_manual and not overwrite_manual:
                    continue

                # Если overwrite_hidden включен — возвращаем товар из архива
                if existing_product.is_hidden and overwrite_hidden:
                    existing_product.is_hidden = False

                # Если overwrite_manual включен — сбрасываем ручной флаг
                if existing_product.is_manual and overwrite_manual:
                    existing_product.is_manual = False

                # Обновляем данные с Ozon
                existing_product.product_id = ozon_item.get('product_id')
                existing_product.name = product_name
                existing_product.price = product_price_value
                existing_product.image_url = product_image_url
                existing_product.last_synced = datetime.datetime.now(datetime.timezone.utc)
                existing_product.stock = product_stock

                print(f"Updated product: {current_offer_id}")
                products_to_frontend.append(existing_product.to_dict())
                    
            else:
                # Если еще в бд не существует, создаем
                new_product = Product(
                    product_id=ozon_item.get('product_id'),
                    offer_id=current_offer_id,
                    name=product_name,
                    price=product_price_value,
                    stock=product_stock,
                    image_url=product_image_url,
                    last_synced=datetime.datetime.now(datetime.timezone.utc),
                    is_hidden=False,
                    is_manual=False,
                    source='ozon'
                )
                db.session.add(new_product)
                print(f"Added new product: {current_offer_id}")
                products_to_frontend.append(new_product.to_dict())

        db.session.commit()
        
        log.status = 'success'
        log.updated_count = len(products_to_frontend)
        log.finished_at = datetime.datetime.now(datetime.timezone.utc)
        db.session.commit()

    except requests.exceptions.RequestException as e:
        print(f"Ошибка при запросе к Ozon API: {e}")
        
        log.status = 'error'
        log.error_message = str(e)
        log.updated_count = len(products_to_frontend)
        log.finished_at = datetime.datetime.now(datetime.timezone.utc)
        db.session.commit()
        
        print("Произошла ошибка с Ozon API, попытка загрузить товары из базы данных.")
        try:
            products_from_db = Product.query.order_by(Product.last_synced.desc()).limit(50).all()
            if products_from_db:
                products_to_frontend = [p.to_dict() for p in products_from_db]
                return jsonify({"products": products_to_frontend})
            else:
                return jsonify({"error": f"Ошибка с подключением к Ozon API: {str(e)}. В базе данных нет данных.", "products": []}), 500
        except Exception as db_e:
            print(f"Ошибка при попытке получить данные из БД после сбоя Ozon: {db_e}")
            return jsonify({"error": f"Ошибка подключения к Ozon API: {str(e)}. Также не удалось получить данные из БД.", "products": []}), 500

    except Exception as e:
        print(f"Неизвестная ошибка на сервере: {e}")
        log.status = 'error'
        log.error_message = str(e)
        log.updated_count = len(products_to_frontend)
        log.finished_at = datetime.datetime.now(datetime.timezone.utc)
        db.session.commit()
        # Пробуем вернуть из БД
        print("Произошла внутренняя ошибка, попытка загрузить товары из базы данных.")
        try:
            products_from_db = Product.query.order_by(Product.last_synced.desc()).limit(50).all()
            if products_from_db:
                products_to_frontend = [p.to_dict() for p in products_from_db]
                return jsonify({"products": products_to_frontend})
            else:
                return jsonify({"error": f"Произошла внутренняя ошибка сервера: {str(e)}. В базе данных нет данных.", "products": []}), 500
        except Exception as db_e:
            print(f"Ошибка при попытке получить данные из БД после внутренней ошибки: {db_e}")
            return jsonify({"error": f"Внутренняя ошибка сервера: {str(e)}. Также не удалось получить данные из БД.", "products": []}), 500

    return jsonify({"products": products_to_frontend})

@app.route('/api/products_local', methods=['GET'])
@login_required
def get_products_local():
    # Параметры фильтрации
    search = request.args.get('q', type=str, default=None)
    min_price = request.args.get('min_price', type=float, default=None)
    max_price = request.args.get('max_price', type=float, default=None)

    # Параметры пагинации
    page = request.args.get('page', type=int, default=1)
    per_page = request.args.get('per_page', type=int, default=10) # сколько товаров на странице
    
    sort_by = request.args.get('sort_by', type=str, default='last_synced')
    sort_dir = request.args.get('sort_dir', type=str, default='desc')

    include_hidden = request.args.get('include_hidden', type=int, default=0)  # 0=обычные, 1=архив

    query = Product.query.filter_by(is_hidden=(include_hidden == 1))

    if search:
        query = query.filter(Product.name.ilike(f'%{search}%'))

    if min_price is not None:
        query = query.filter(Product.price >= min_price)

    if max_price is not None:
        query = query.filter(Product.price <= max_price)
        
    sort_column_map = {
        'price': Product.price,
        'name': Product.name,
        'last_synced': Product.last_synced
    }
    sort_col = sort_column_map.get(sort_by, Product.last_synced)

    # Направление сортировки
    if sort_dir == 'asc':
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    products = [p.to_dict() for p in pagination.items]

    products = [p.to_dict() for p in pagination.items]

    return jsonify({
        "products": products,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total_pages": pagination.pages,
        "total_items": pagination.total
    }), 200

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify(message='Username and password are required.'), 400

    if User.query.filter_by(username=username).first():
        return jsonify(message='Username already taken.'), 409

    user = User(username=username, role='user')
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify(message='User registered successfully.'), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify(message='Username and password are required.'), 400

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        login_user(user) # Flask-Login устанавливает сессию
        return jsonify(message='Logged in successfully.'), 200
    else:
        return jsonify(message='Invalid username or password.'), 401

@app.route('/api/logout')
@login_required # Только авторизованные пользователи могут выйти
def logout():
    logout_user() # Flask-Login очищает сессию
    return jsonify(message='Logged out successfully.'), 200

@app.route('/api/products_local', methods=['POST']) #добавление продукта
@login_required
@admin_required
def create_product_local():
    data = request.get_json() or {}

    name = data.get('name')
    offer_id = data.get('offer_id')
    product_id = data.get('product_id')  
    price = data.get('price')
    stock = data.get('stock')
    image_url = data.get('image_url')
    
    print("DEBUG stock raw:", repr(stock),
          type(stock))

    if not name:
        return jsonify({"message": "Название товара (name) обязательно."}), 400

    if not offer_id:
        # Локальные товары (добавленные пользователем) помечаем префиксом, которого не бывает у озона
        offer_id = f"LOCAL-{int(datetime.datetime.now().timestamp() * 1000)}"

    # Проверим уникальность offer_id
    if Product.query.filter_by(offer_id=offer_id).first():
        return jsonify({"message": "Товар c таким offer_id уже существует."}), 409

    # product_id: если не передали, сгенерируем уникальное число
    if not product_id:
        product_id = int(datetime.datetime.now().timestamp() * 1000)

    # Проверим уникальность product_id
    if Product.query.filter_by(product_id=product_id).first():
        return jsonify({"message": "Товар c таким product_id уже существует."}), 409

    try:
        price_value = float(price) if price is not None else None
    except (TypeError, ValueError):
        return jsonify({"message": "Некорректное значение цены."}), 400
    
    if stock is None:
        stock_value = None
    else:
    # если пришла строка - уберём пробелы
        if isinstance(stock, str):
            stock = stock.strip()
            if stock == "":
                stock_value = None
            else:
                try:
                    stock_value = int(stock)
                except ValueError:
                    return jsonify({"message": "Некорректное значение остатка."}), 400
        else:
        # если пришло число (int/float)
            try:
                stock_value = int(stock)
            except (TypeError, ValueError):
                return jsonify({"message": "Некорректное значение остатка."}), 400

    new_product = Product(
        product_id=product_id,
        offer_id=offer_id,
        name=name,
        price=price_value,
        stock=stock_value,
        image_url=image_url,
        last_synced=datetime.datetime.now(datetime.timezone.utc),
        source='local'
    )

    db.session.add(new_product)
    db.session.commit()

    return jsonify(new_product.to_dict()), 201

@app.route('/api/products_local/<string:offer_id>', methods=['PUT']) # редактирование товара
@login_required
@admin_required
def update_product_local(offer_id):
    product = Product.query.filter_by(offer_id=offer_id).first()

    if not product:
        return jsonify({"message": "Товар не найден."}), 404

    data = request.get_json() or {}
    name = data.get('name')
    price = data.get('price')
    if 'stock' in data:
        product.stock = data.get('stock')
    image_url = data.get('image_url')

    if name is not None:
        product.name = name

    if price is not None:
        try:
            product.price = float(price)
        except (TypeError, ValueError):
            return jsonify({"message": "Некорректное значение цены."}), 400

    if image_url is not None:
        product.image_url = image_url

    product.last_synced = datetime.datetime.now(datetime.timezone.utc)
    product.is_manual = True

    db.session.commit()

    return jsonify(product.to_dict()), 200

@app.route('/api/products_local/<string:offer_id>', methods=['DELETE']) # удаление (скрытие) товара
@login_required
@admin_required
def delete_product_local(offer_id):
    product = Product.query.filter_by(offer_id=offer_id).first()

    if not product:
        return jsonify({"message": "Товар не найден."}), 404

    product.is_hidden = True
    db.session.commit()

    return jsonify({"message": "Товар удалён."}), 200


@app.route('/api/sync_logs', methods=['GET']) #работа с логами синхронизаций под действующую учетную запись
@login_required
@admin_required
def get_sync_logs():
    limit = request.args.get('limit', type=int, default=10)

    logs_query = SyncLog.query.filter_by(user_id=current_user.id).order_by(
        SyncLog.started_at.desc()
    ).limit(limit)

    logs = []
    for log in logs_query.all():
        logs.append({
            "id": log.id,
            "started_at": log.started_at.isoformat() if log.started_at else None,
            "finished_at": log.finished_at.isoformat() if log.finished_at else None,
            "status": log.status,
            "updated_count": log.updated_count,
            "error_message": log.error_message,
        })

    return jsonify({"logs": logs}), 200

@app.route('/api/auth_status', methods=['GET'])
def auth_status():
    if current_user.is_authenticated:
        return jsonify({
            "is_authenticated": True,
            "username": current_user.username,
            "role": getattr(current_user, "role", "user")
        })
    return jsonify({"is_authenticated": False})

if __name__ == '__main__':
    app.run(debug=True, port=5000) # Запускаем Flask-сервер на порту 5000 с режимом отладки

