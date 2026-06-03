const SUPABASE_URL = 'https://kpkcxzphwgdjlaflurbd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwa2N4enBod2dkamxhZmx1cmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNjI0OTksImV4cCI6MjA2NDkzODQ5OX0.eL1idgvxucPrCUBfxwKEoMw_QLWHFCaW4_V0S36BwA0';

// ИСПРАВЛЕНО: Для создания клиента используется глобальный объект библиотеки
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. Функция авторизации через всплывающее окно Google
async function loginWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // Возвращаем пользователя на ту же страницу, где он находился
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) alert('Ошибка входа через Google: ' + error.message);
}

// Функция выхода из системы
async function logout() {
    await supabaseClient.auth.signOut();
    window.location.reload();
}

// 2. Проверка активной сессии пользователя при загрузке страницы
async function checkUser() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        const userEmail = session.user.email;
        
        // Меняем кнопку входа на имя администратора и кнопку выхода
        document.getElementById('authBlock').innerHTML = `
            <span style="margin-right: 15px; font-weight: bold; color: #475569;">Администратор: ${userEmail}</span>
            <button class="btn-danger" onclick="logout()">Выйти</button>
        `;
        
        // Сверяем вошедший аккаунт с вашим e-mail
        if (userEmail === '240350@turan-edu.kz') {
            document.getElementById('adminPanel').style.display = 'block'; // Показываем форму добавления
            window.isAdmin = true; // Выставляем флаг для рендера кнопок удаления
        }
    }
    // Загружаем товары из БД (сработает и для гостей, и для admина)
    loadProducts();
}

// 3. Загрузка товаров на витрину (с фильтрацией и поиском)
async function loadProducts() {
    const search = document.getElementById('searchInp').value;
    const category = document.getElementById('filterCat').value;

    let query = supabaseClient.from('products').select('*').order('id', { ascending: true });

    // Применяем фильтры, если они заполнены пользователем
    if (search) query = query.ilike('name', `%${search}%`);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) return console.error('Ошибка получения данных:', error);

    const container = document.getElementById('productsDisplay');
    container.innerHTML = '';

    // Если база пуста
    if (data.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b;">Товары не найдены</p>`;
        return;
    }

    data.forEach(p => {
        // Кнопка удаления отображается только если вы авторизованы под своей почтой
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

    const { error } = await supabaseClient.from('products').insert([{ name, category, price, stock }]);
    
    if (error) {
        alert('Supabase RLS Ошибка: У вас нет прав на запись в базу! ' + error.message);
    } else {
        // Очищаем форму при успешном добавлении
        document.getElementById('name').value = '';
        document.getElementById('price').value = '';
        document.getElementById('stock').value = '';
        loadProducts(); // Перезапускаем витрину
    }
}

// 5. Удаление товара администратором
async function deleteProduct(id) {
    if (confirm('Вы действительно хотите навсегда удалить этот товар с витрины?')) {
        const { error } = await supabaseClient.from('products').delete().eq('id', id);
        if (error) alert('Ошибка удаления: ' + error.message);
        loadProducts();
    }
}

// Запуск главной проверки при открытии сайта
checkUser();
