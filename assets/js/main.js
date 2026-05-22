/* ============================================================
   НАЗВАНИЕ ВАШЕГО МАГАЗИНА — основной JS
   Поиск, корзина (localStorage), форма заказа, мобильное меню
   ============================================================ */

(function () {
    "use strict";

    const STORAGE_KEY = "shop_cart_v1";

    /* ------------------ Утилиты ------------------ */
    const formatPrice = (n) =>
        new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";

    const getCart = () => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch { return []; }
    };
    const saveCart = (cart) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
        updateCartCounter();
        document.dispatchEvent(new CustomEvent("cart:updated"));
    };

    const updateCartCounter = () => {
        const cart = getCart();
        const count = cart.reduce((s, i) => s + i.qty, 0);
        document.querySelectorAll("[data-cart-count]").forEach(el => {
            el.textContent = count;
            el.style.display = count > 0 ? "grid" : "none";
        });
    };

    /* ------------------ Уведомления ------------------ */
    let toastTimer;
    const showToast = (message) => {
        let toast = document.querySelector(".toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.className = "toast";
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
    };

    /* ------------------ Добавление в корзину ------------------ */
    const addToCart = (product) => {
        const cart = getCart();
        const existing = cart.find(i => i.id === product.id);
        if (existing) {
            existing.qty += product.qty || 1;
        } else {
            cart.push({ ...product, qty: product.qty || 1 });
        }
        saveCart(cart);
        showToast("Товар добавлен в корзину");
    };

    /* ------------------ Поиск ------------------ */
    const initSearch = () => {
        const form = document.querySelector(".search");
        if (!form) return;
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const query = form.querySelector("input")?.value?.trim();
            if (!query) return;
            showToast(`Поиск: «${query}» — каталог появится после добавления товаров`);
        });
    };

    /* ------------------ Корзина: рендер на странице корзины ------------------ */
    const renderCartPage = () => {
        const wrap = document.querySelector("[data-cart-list]");
        const summary = document.querySelector("[data-cart-summary]");
        if (!wrap || !summary) return;

        const cart = getCart();
        if (cart.length === 0) {
            wrap.innerHTML = `
                <div class="cart-empty">
                    <h3>Корзина пуста</h3>
                    <p>Добавьте товары из каталога, чтобы оформить заказ.</p>
                    <a href="/catalog/" class="btn btn--outline" style="margin-top: 14px;">Перейти в каталог</a>
                </div>`;
            summary.innerHTML = "";
            return;
        }

        wrap.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}">
                <div class="cart-item__img">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="36" height="36">
                        <circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/>
                        <circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/>
                        <rect x="9" y="9" width="6" height="6" rx="1"/>
                    </svg>
                </div>
                <div>
                    <div class="cart-item__title">${escapeHtml(item.title)}</div>
                    <div class="cart-item__meta">${escapeHtml(item.meta || "Артикул будет указан")}</div>
                </div>
                <div class="cart-qty">
                    <button data-act="dec" aria-label="Уменьшить">−</button>
                    <span>${item.qty}</span>
                    <button data-act="inc" aria-label="Увеличить">+</button>
                </div>
                <div class="cart-item__price">${formatPrice(item.price * item.qty)}</div>
                <button class="cart-item__remove" data-act="remove" aria-label="Удалить">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                </button>
            </div>
        `).join("");

        const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
        const itemsCount = cart.reduce((s, i) => s + i.qty, 0);
        summary.innerHTML = `
            <h3>Ваш заказ</h3>
            <div class="cart-summary__row"><span>Товаров</span><span>${itemsCount} шт.</span></div>
            <div class="cart-summary__row"><span>Сумма</span><span>${formatPrice(subtotal)}</span></div>
            <div class="cart-summary__row"><span>Доставка по Донецку / Луганску</span><span>Рассчитывается</span></div>
            <div class="cart-summary__row total"><span>Итого</span><span>${formatPrice(subtotal)}</span></div>
            <a href="/checkout.html" class="btn btn--primary btn--block btn--lg" style="margin-top: 18px;">Оформить заказ</a>
            <a href="/catalog/" class="btn btn--outline btn--block" style="margin-top: 10px;">Продолжить покупки</a>
        `;
    };

    /* ------------------ Действия с корзиной (делегирование) ------------------ */
    const initCartActions = () => {
        document.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-act]");
            if (!btn) return;
            const row = btn.closest("[data-id]");
            if (!row) return;
            const id = row.getAttribute("data-id");
            const cart = getCart();
            const idx = cart.findIndex(i => i.id === id);
            if (idx === -1) return;
            const act = btn.getAttribute("data-act");
            if (act === "inc") cart[idx].qty += 1;
            else if (act === "dec") cart[idx].qty = Math.max(1, cart[idx].qty - 1);
            else if (act === "remove") cart.splice(idx, 1);
            saveCart(cart);
            renderCartPage();
        });

        document.addEventListener("click", (e) => {
            const btn = e.target.closest("[data-add-to-cart]");
            if (!btn) return;
            e.preventDefault();
            try {
                const data = JSON.parse(btn.getAttribute("data-add-to-cart"));
                addToCart(data);
            } catch {
                showToast("Не удалось добавить товар");
            }
        });
    };

    /* ------------------ Форма заказа ------------------ */
    const initCheckout = () => {
        const form = document.querySelector("[data-checkout-form]");
        if (!form) return;

        const cart = getCart();
        const summaryBox = form.querySelector("[data-checkout-summary]");
        if (summaryBox) {
            if (cart.length === 0) {
                summaryBox.innerHTML = `<p>Ваша корзина пуста. <a href="/catalog/">Вернуться в каталог</a>.</p>`;
            } else {
                const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
                summaryBox.innerHTML = `
                    <h3>Ваш заказ</h3>
                    ${cart.map(i => `
                        <div class="cart-summary__row">
                            <span>${escapeHtml(i.title)} × ${i.qty}</span>
                            <span>${formatPrice(i.price * i.qty)}</span>
                        </div>
                    `).join("")}
                    <div class="cart-summary__row total"><span>Итого</span><span>${formatPrice(subtotal)}</span></div>
                `;
            }
        }

        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            const name = fd.get("name");
            const phone = fd.get("phone");
            if (!name || !phone) {
                showToast("Заполните имя и телефон");
                return;
            }
            const cart = getCart();
            if (cart.length === 0) {
                showToast("Корзина пуста");
                return;
            }
            const orderId = "ORD-" + Date.now().toString().slice(-7);
            saveCart([]);
            const result = document.querySelector("[data-checkout-result]");
            if (result) {
                form.style.display = "none";
                result.style.display = "block";
                result.querySelector("[data-order-id]").textContent = orderId;
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    };

    /* ------------------ Безопасная вставка текста ------------------ */
    const escapeHtml = (str) => String(str ?? "").replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

    /* ------------------ Текущий год в футере ------------------ */
    const setYear = () => {
        document.querySelectorAll("[data-year]").forEach(el => {
            el.textContent = new Date().getFullYear();
        });
    };

    /* ------------------ Активный пункт навигации ------------------ */
    const setActiveNav = () => {
        const path = location.pathname.replace(/\/index\.html$/, "/").toLowerCase();
        document.querySelectorAll(".nav a").forEach(a => {
            const href = a.getAttribute("href")?.toLowerCase() || "";
            if (href === path || (href !== "/" && path.startsWith(href))) {
                a.classList.add("active");
            }
        });
    };

    /* ------------------ Инициализация ------------------ */
    document.addEventListener("DOMContentLoaded", () => {
        updateCartCounter();
        initSearch();
        initCartActions();
        renderCartPage();
        initCheckout();
        setYear();
        setActiveNav();
    });

    document.addEventListener("cart:updated", renderCartPage);

    window.shopApi = { addToCart, getCart, saveCart, showToast };
})();
