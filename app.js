// 1. Адрес базы данных (СТРОГО С ССЫЛКОЙ HTTPS)
const DB_URL = 'https://kpkcxzphwgdjlaflurbd.supabase.co';

// 2. Публичный ключ (СТРОГО С КЛЮЧОМ, НАЧИНАЮЩИМСЯ НА sb_publishable)
const DB_KEY = 'sb_publishable_e1idgvxucPrCUbfxwKEoMw_QLWHFsIc';

// Создаем подключение
const myStoreBackend = supabase.createClient(DB_URL, DB_KEY);

// 1. Функция авторизации через всплывающее окно Google
async function loginWithGoogle() {
    const { error } = await myStoreBackend.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) alert('Ошибка входа через Google: ' + error.message);
}

// Функция выхода из системы
async function logout() {
    await myStoreBackend.auth.signOut();
    window.location.reload();
}

// 2. Проверка активной сессии пользователя при загрузке страницы
async function checkUser() {
    const { data: { session } } = await myStoreBackend.auth.getSession();
    
    if (session) {
        const userEmail = session.user.email.toLowerCase();
        
        // Меняем кнопку входа на имя администратора и кнопку выхода
        document.getElementById('authBlock').innerHTML = `
            <span style="margin-right: 15px; font-weight: bold; color: #475569;">Администратор: ${userEmail}</span>
            <button class="btn-danger" onclick="logout()">Выйти</button>
        `;
        
        // Сверяем вошедший аккаунт с вашей почтой
        if (userEmail === '240350@turan-edu.kz') {
            document.getElementById('adminPanel').style.display = 'block'; // Показываем форму добавления
            window.isAdmin = true; // Выставляем флаг для рендера кнопок удаления
        }
    }
    // Загружаем товары из БД
    loadProducts();
}

// 3. Загрузка товаров на витрину (с фильтрацией и поиском)
async function loadProducts() {
    const search = document.getElementById('searchInp').value;
    const category = document.getElementById('filterCat').value;

    let query = myStoreBackend.from('products').select('*').order('id', { ascending: true });

    if (search) query = query.ilike('name', `%${search}%`);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) return console.error('Ошибка получения данных:', error);

    const container = document.getElementById('productsDisplay');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b;">Товары не найдены</p>`;
        return;
    }

    data.forEach(p => {
        const deleteBtn = window.isAdmin 
            ? `<button class="btn-danger" onclick="deleteProduct(${p.id})" style="margin-top:12px; width:100%;">Удалить из магазина</button>` 
            : '';

        container.innerHTML += `
            <div class="product-card">
                <div>
                    <span class="product-cat">${p.category}</span>
                    <h3 class="product-title">${p.name}</h3>
                    <p class="product-stock">В наличии: <strong>${p.stock} шт.</strong></p>
                </div>
                <div>
                    <div class="price">${p.price.toLocaleString()} тг.</div>
                    <button class="btn-primary" onclick="alert('Демо-покупка: Товар добавлен в корзину!')" style="width:100%;">Купить</button>
                    ${deleteBtn}
                </div>
            </div>`;
    });
}

// 4. Добавление нового товара администратором
async function addProduct() {
    const name = document.getElementById('name').value;
    const category = document.getElementById('category').value;
    const price = parseFloat(document.getElementById('price').value);
    const stock = parseInt(document.getElementById('stock').value);

    if (!name || !price || !stock) return alert('Пожалуйста, заполните все поля карточки товара!');

    const { error } = await myStoreBackend.from('products').insert([{ name, category, price, stock }]);
    
    if (error) {
        alert('Supabase Ошибка: ' + error.message);
    } else {
        document.getElementById('name').value = '';
        document.getElementById('price').value = '';
        document.getElementById('stock').value = '';
        loadProducts(); // Перезапускаем витрину
    }
}

// 5. Удаление товара администратором
async function deleteProduct(id) {
    if (confirm('Вы действительно хотите навсегда удалить этот товар с витрины?')) {
        const { error } = await myStoreBackend.from('products').delete().eq('id', id);
        if (error) alert('Ошибка удаления: ' + error.message);
        loadProducts();
    }
}

// Запуск главной проверки при открытии сайта
checkUser();
