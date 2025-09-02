// js/script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- MÓDULO 1: UTILIDADES Y DATOS ---
    const getStorage = key => JSON.parse(localStorage.getItem(key)) || [];
    const saveStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));
    const getCurrentUser = () => JSON.parse(sessionStorage.getItem('currentUser'));
    const setCurrentUser = user => sessionStorage.setItem('currentUser', JSON.stringify(user));
    const logoutUser = () => sessionStorage.removeItem('currentUser');

    const initDatabase = () => {
        if (!localStorage.getItem('users')) {
            saveStorage('users', [
                { email: 'admin@jgstore.com', pass: 'admin123', role: 'admin' },
                { email: 'vendedor@jgstore.com', pass: 'vendedor123', role: 'vendedor', storeName: 'Tienda Vendedor' }
            ]);
        }
        if (!localStorage.getItem('sellerProducts')) saveStorage('sellerProducts', []);
        if (!localStorage.getItem('cart')) saveStorage('cart', []);
    };
    initDatabase();

    // --- MÓDULO 2: AUTENTICACIÓN Y NAVBAR ---
    const updateNavbar = () => {
        const authSection = document.getElementById('auth-section');
        const currentUser = getCurrentUser();
        if (currentUser) {
            authSection.innerHTML = `<a href="mi-cuenta.html" class="user-btn me-2">${currentUser.storeName || currentUser.email.split('@')[0]}</a>`;
        } else {
            authSection.innerHTML = `
                <a href="login.html" class="user-btn-outline me-2">Iniciar Sesión</a>
                <a href="crear-cuenta.html" class="user-btn">Registrarse</a>`;
        }
    };

    // --- MÓDULO 3: LÓGICA DE PÁGINAS ESPECÍFICAS ---
    const bodyId = document.body.id;

    // --- PÁGINA: PRODUCTOS ---
    if (bodyId === 'page-productos') {
        const productsContainer = document.getElementById('products-container');
        const currentUser = getCurrentUser();
        if(currentUser?.role === 'admin'){
            document.querySelectorAll('.admin-actions').forEach(el => {
                el.innerHTML = `<button class="btn btn-sm btn-secondary me-1">Editar</button><button class="btn btn-sm btn-outline-danger">Borrar</button>`;
            });
        }
        productsContainer.addEventListener('click', e => {
            if (e.target.matches('.add-to-cart-btn')) {
                e.preventDefault();
                const card = e.target.closest('.product-card');
                const product = { id: card.dataset.id, name: card.dataset.name, price: parseFloat(card.dataset.price), img: card.dataset.img, quantity: 1 };
                let cart = getStorage('cart');
                const existingIndex = cart.findIndex(item => item.id === product.id);
                if (existingIndex > -1) cart[existingIndex].quantity++;
                else cart.push(product);
                saveStorage('cart', cart);
                alert(`${product.name} añadido al carrito.`);
            }
        });
    }

    // --- PÁGINA: CARRITO ---
    if (bodyId === 'page-carrito') {
        const itemsContainer = document.getElementById('cart-items-container');
        const summaryEl = document.getElementById('cart-summary');
        const emptyMsgEl = document.getElementById('empty-cart-message');

        const renderCart = () => {
            const cart = getStorage('cart');
            itemsContainer.innerHTML = '';
            if (cart.length === 0) {
                summaryEl.style.display = 'none';
                emptyMsgEl.style.display = 'block';
                return;
            }
            summaryEl.style.display = 'block';
            emptyMsgEl.style.display = 'none';
            let subtotal = 0;
            cart.forEach(item => {
                subtotal += item.price * item.quantity;
                itemsContainer.innerHTML += `<div class="cart-item" data-id="${item.id}"><img src="${item.img}" alt="${item.name}"><div class="cart-item-details"><div>${item.name}</div><div class="fw-bold product-price">$ ${item.price.toLocaleString('es-CO')}</div></div><input type="number" class="form-control cart-quantity-input" value="${item.quantity}" min="1"><button class="btn btn-outline-danger cart-item-remove"><i class="fas fa-trash"></i></button></div>`;
            });
            const shipping = subtotal > 0 ? 15000 : 0;
            document.getElementById('cart-subtotal').textContent = `$ ${subtotal.toLocaleString('es-CO')}`;
            document.getElementById('cart-shipping').textContent = `$ ${shipping.toLocaleString('es-CO')}`;
            document.getElementById('cart-total').textContent = `$ ${(subtotal + shipping).toLocaleString('es-CO')}`;
        };

        itemsContainer.addEventListener('click', e => {
            if (e.target.closest('.cart-item-remove')) {
                const itemId = e.target.closest('.cart-item').dataset.id;
                let cart = getStorage('cart');
                cart = cart.filter(item => item.id !== itemId);
                saveStorage('cart', cart);
                renderCart();
            }
        });
        
        itemsContainer.addEventListener('input', e => {
             if (e.target.matches('.cart-quantity-input')) {
                const itemId = e.target.closest('.cart-item').dataset.id;
                const newQuantity = parseInt(e.target.value);
                let cart = getStorage('cart');
                const itemIndex = cart.findIndex(item => item.id === itemId);
                if (itemIndex > -1 && newQuantity > 0) {
                    cart[itemIndex].quantity = newQuantity;
                    saveStorage('cart', cart);
                    renderCart();
                }
             }
        });
        
        document.getElementById('checkout-button').addEventListener('click', e => {
            if (!getCurrentUser()) {
                e.preventDefault();
                localStorage.setItem('redirectAfterLogin', 'pago.html');
                alert('Debes iniciar sesión para pagar.');
                window.location.href = 'login.html';
            }
        });

        renderCart();
    }
    
    // --- PÁGINA: VENTA DE PRODUCTOS (PANEL VENDEDOR) ---
    if(bodyId === 'page-venta-productos'){
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'vendedor') {
            window.location.href = 'beneficios-vendedor.html';
            return;
        }

        const container = document.getElementById('seller-products-container');
        const renderSellerProducts = () => {
            const allProducts = getStorage('sellerProducts');
            const myProducts = allProducts.filter(p => p.sellerId === currentUser.email);
            container.querySelectorAll('.seller-product-item').forEach(item => item.remove());
            myProducts.forEach(product => {
                container.insertAdjacentHTML('beforeend', `<div class="col-md-6 col-lg-4 mb-4 seller-product-item"><div class="seller-product-card" data-id="${product.id}"><img src="${product.img || 'images/laptop.png'}" alt="${product.name}"><h5>${product.name}</h5><p class="product-description-snippet">"${product.description}"</p><div class="stock-info">En Stock: ${product.stock}</div><div class="seller-card-actions"><a href="personalizar-producto.html" class="btn btn-sm btn-secondary me-2 product-modify-btn">Modificar</a><button class="btn btn-sm btn-outline-danger product-delete-btn">Eliminar</button></div></div></div>`);
            });
        };
        
        container.addEventListener('click', e => {
            const card = e.target.closest('.seller-product-card');
            if(!card) return;
            const productId = card.dataset.id;
            
            if(e.target.matches('.product-delete-btn')){
                if(confirm('¿Seguro que quieres eliminar este producto?')){
                    let products = getStorage('sellerProducts');
                    products = products.filter(p => p.id !== productId);
                    saveStorage('sellerProducts', products);
                    renderSellerProducts();
                }
            } else if (e.target.matches('.product-modify-btn')){
                localStorage.setItem('productIdToEdit', productId);
            }
        });
        
        renderSellerProducts();
    }
    
    // --- PÁGINA: PERSONALIZAR PRODUCTO (AÑADIR/MODIFICAR) ---
    if(bodyId === 'page-personalizar-producto'){
        // ... (La lógica de esta página que te di anteriormente es correcta y se integra con este sistema)
    }

    // --- PÁGINA: MI CUENTA ---
    if(bodyId === 'page-mi-cuenta'){
        // ... (La lógica de esta página que te di anteriormente es correcta)
    }

    // --- PÁGINAS DE REGISTRO Y LOGIN ---
    if(bodyId === 'page-registro-vendedor') handleRegistration('seller-registration-form', 'vendedor');
    if(bodyId === 'page-crear-cuenta') handleRegistration('user-registration-form', 'usuario');
    // ... (El resto de la lógica de login que te di antes es correcta)
    
    updateNavbar(); // Ejecutar en todas las páginas
});