// js/script.js (Completo: Backend Sync para Carrito + Pago, JWT Headers, Limpio)
document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    
    // Helpers localStorage (fallback para no-logueados)
    const getStorage = (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    };
    const saveStorage = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    // Token y fetch con auth
    const getToken = () => localStorage.getItem('authToken');
    const sendWithAuth = async (url, options = {}) => {
        const token = getToken();
        options.headers = { 
            ...options.headers, 
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
        return fetch(url, options);
    };

    // Verificar login
    const requireLogin = (redirectUrl = 'login.html', message = 'Debes iniciar sesión.') => {
        const currentUser  = getCurrentUser ();
        if (!currentUser ) {
            alert(message);
            window.location.href = `${redirectUrl}?redirect=${encodeURIComponent(window.location.pathname)}`;
            return false;
        }
        return true;
    };

    // Usuario actual (limpio)
    const getCurrentUser  = () => {
        const userData = sessionStorage.getItem('currentUser ');
        return userData ? JSON.parse(userData) : null;
    };
    const setCurrentUser  = (user) => sessionStorage.setItem('currentUser ', JSON.stringify(user));

    // Sync carrito backend (agregar/remover/obtener – usa API si logueado, local fallback)
    const syncCartAction = async (action, data = null) => {
        if (!requireLogin()) return false;  // Fallback local si no logueado
        try {
            let url, method, body;
            switch (action) {
                case 'agregar':
                    url = `${API_URL}/cart/agregar`;
                    method = 'POST';
                    body = JSON.stringify({ product_id: data.id, quantity: data.quantity || 1 });
                    break;
                case 'remover':
                    url = `${API_URL}/cart/remover`;
                    method = 'POST';
                    body = JSON.stringify({ product_id: data.id });
                    break;
                case 'obtener':
                    url = `${API_URL}/cart/obtener`;
                    method = 'GET';
                    body = null;
                    break;
                default:
                    return false;
            }
            const response = await sendWithAuth(url, { method, body });
            if (!response.ok) {
                const error = await response.json();
                console.warn(`Cart ${action} error:`, error);
                return false;  // Fallback local
            }
            const result = await response.json();
            if (action === 'obtener' && result.success) {
                saveStorage('cart', result.items || []);  // Sync local con backend
            }
            return result.success;
        } catch (error) {
            console.error(`Sync cart ${action} error:`, error);
            return false;
        }
    };

    // Add to cart (backend si logueado, local fallback)
    const addToCart = async (product, quantity = 1, options = {}) => {
        if (!requireLogin('login.html', 'Debes iniciar sesión para añadir al carrito.')) {
            // Fallback local
            let cart = getStorage('cart');
            const existingIndex = cart.findIndex(item => item.id === product.id && JSON.stringify(item.options) === JSON.stringify(options));
            if (existingIndex > -1) {
                cart[existingIndex].quantity += quantity;
            } else {
                cart.push({ ...product, quantity, options });
            }
            saveStorage('cart', cart);
            alert(`${quantity} x ${product.name} añadido(s) al carrito (local).`);
            return;
        }
        // Backend sync
        const success = await syncCartAction('agregar', { id: product.id, quantity });
        if (success) {
            alert(`${quantity} x ${product.name} añadido al carrito (backend).`);
            // Opcional: Actualiza local
            let cart = getStorage('cart');
            const existingIndex = cart.findIndex(item => item.id === product.id);
            if (existingIndex > -1) {
                cart[existingIndex].quantity += quantity;
            } else {
                cart.push({ ...product, quantity, options });
            }
            saveStorage('cart', cart);
        } else {
            alert('Error añadiendo al carrito. Intenta de nuevo.');
        }
    };

    // Remover item 
    const removeFromCart = async (productId) => {
        if (!requireLogin()) {
            let cart = getStorage('cart').filter(item => item.id !== productId);
            saveStorage('cart', cart);
            return true;
        }
        const success = await syncCartAction('remover', { id: productId });
        if (success) {
            let cart = getStorage('cart').filter(item => item.id !== productId);
            saveStorage('cart', cart);
        }
        return success;
    };

    // Obtener carrito 
    const getCart = async () => {
        if (!requireLogin()) return getStorage('cart');
        const success = await syncCartAction('obtener');
        return success ? getStorage('cart') : [];  // Backend sync actualiza local
    };

    // Handle auth success (tu código)
    const handleAuthSuccess = (result, message) => {
        setCurrentUser (result.user);
        localStorage.setItem('authToken', result.token);
        alert(message);
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        if (redirect) window.location.href = decodeURIComponent(redirect);
        else {
            let redirectUrl = 'index.html';
            if (result.user.role === 'vendedor') redirectUrl = 'venta-productos.html';
            window.location.href = redirectUrl;
        }
    };

    const bodyId = document.body.id;

    // Lógica REGISTRO USUARIO (tu código intacto, con fetch auth)
    if (bodyId === 'page-crear-cuenta') {
        const form = document.getElementById('user-registration-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Registrando...';
                }
                const nombre = form.nombre?.value.trim() || '';
                const apellido = form.apellido?.value.trim() || '';
                const email = form.email?.value.trim() || '';
                const password = form.pass?.value || '';
                if (!nombre || !email || !password) {
                    alert('Completa nombre, email y contraseña.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Registrarse';
                    }
                    return;
                }
                const formData = { nombre, apellido, email, password, role: 'cliente' };
                try {
                    const response = await sendWithAuth(`${API_URL}/auth/register`, {
                        method: 'POST',
                        body: JSON.stringify(formData)
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        alert(`Error: ${errorData.message || 'Email ya existe.'}`);
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Registrarse';
                        }
                        return;
                    }
                    const result = await response.json();
                    handleAuthSuccess(result, '¡Registro exitoso!');
                } catch (error) {
                    console.error('Error registro:', error);
                    alert('Error de conexión.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Registrarse';
                    }
                }
            });
        }
    }

    // Lógica REGISTRO VENDEDOR (tu código intacto, similar)
    if (bodyId === 'page-registro-vendedor') {
        const form = document.getElementById('seller-registration-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Registrando...';
                }
                const nombre = form.nombre?.value.trim() || '';
                const apellido = form.apellido?.value.trim() || '';
                const storeName = form.storeName?.value.trim() || '';
                const email = form.email?.value.trim() || '';
                const password = form.pass?.value || '';
                if (!nombre || !email || !password || !storeName) {
                    alert('Completa todos los campos.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Registrarse como Vendedor';
                    }
                    return;
                }
                const formData = { nombre, apellido, storeName, email, password, role: 'vendedor' };
                try {
                    const response = await sendWithAuth(`${API_URL}/auth/register`, {
                        method: 'POST',
                        body: JSON.stringify(formData)
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        alert(`Error: ${errorData.message || 'Email ya existe.'}`);
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Registrarse como Vendedor';
                        }
                        return;
                    }
                    const result = await response.json();
                    handleAuthSuccess(result, '¡Cuenta vendedor creada!');
                } catch (error) {
                    console.error('Error registro vendedor:', error);
                    alert('Error de conexión.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Registrarse como Vendedor';
                    }
                }
            });
        }
    }

    // Lógica LOGIN 
    if (bodyId === 'page-login') {
        const form = document.getElementById('login-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                
                e.preventDefault();
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Iniciando...';
                }
                const email = form.email?.value.trim() || '';
                const password = form.pass?.value || '';
                if (!email || !password) {
                    alert('Completa email y contraseña.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Iniciar Sesión';
                    }
                    return;
                }
                try {
                    const response = await sendWithAuth(`${API_URL}/auth/login`, {
                        method: 'POST',
                        body: JSON.stringify({ email, password })
                    });
                    if (!response.ok) {
                        const errorData = await response.json();
                        alert(`Error: ${errorData.message || 'Credenciales inválidas.'}`);
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Iniciar Sesión';
                        }
                        return;
                    }
                    const result = await response.json();
                    handleAuthSuccess(result, '¡Login exitoso!');
                } catch (error) {
                    console.error('Error login:', error);
                    alert('Error de conexión.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Iniciar Sesión';
                    }
                }
            });
        }
    }

    // Lógica MI CUENTA (tu código intacto)
    if (bodyId === 'page-mi-cuenta') {
        const currentUser  = getCurrentUser ();
        const detailsContainer = document.getElementById('account-details');
        if (detailsContainer) {
            if (currentUser ) {
                detailsContainer.innerHTML = `
                    <p><strong>Nombre:</strong> ${currentUser .nombre} ${currentUser .apellido || ''}</p>
                    <p><strong>Email:</strong> ${currentUser .email}</p>
                    <p><strong>Rol:</strong> <span class="badge bg-primary text-capitalize">${currentUser .role}</span></p>
                    ${currentUser .storeName ? `<p><strong>Tienda:</strong> ${currentUser .storeName}</p>` : ''}
                    <button id="logout-btn-details" class="btn btn-outline-danger mt-3">Cerrar Sesión</button>`;
                              document.getElementById('logout-btn-details').addEventListener('click', () => {
                    sessionStorage.removeItem('currentUser  ');
                    localStorage.removeItem('authToken');
                    alert('Has cerrado sesión.');
                    window.location.href = 'index.html';
                });
            } else {
                detailsContainer.innerHTML = `<p class="text-center">No has iniciado sesión. <a href="login.html">Inicia sesión</a></p>`;
            }
        }
    }

    // Lógica para RASTREO (adaptada: usa sendWithAuth para token)
    if (bodyId === 'page-rastreo') {
        const rastreoForm = document.getElementById('rastreo-form');
        const resultsContainer = document.getElementById('rastreo-results');
        
        if (!requireLogin('login.html', 'Debes iniciar sesión para rastrear pedidos.')) {
            const mainContent = document.querySelector('main') || document.body;
            mainContent.innerHTML = '<div class="alert alert-warning text-center mt-5"><h4>Acceso Restringido</h4><p>Debes iniciar sesión para rastrear pedidos. <a href="login.html" class="btn btn-primary-jg">Iniciar Sesión</a></p></div>' + (mainContent.innerHTML || '');
            return;
        }
        
        if (rastreoForm) {
            rastreoForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = rastreoForm.querySelector('button[type="submit"]') || rastreoForm.querySelector('button');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Rastreando...';
                }
                
                const trackingNumber = rastreoForm.trackingNumber?.value.trim() || '';
                if (!trackingNumber) {
                    alert('Ingresa un número de rastreo.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Rastrear Pedido';
                    }
                    return;
                }
                try {
                    const response = await sendWithAuth(`${API_URL}/order/rastreo?codigo=${trackingNumber}`);
                    if (!response.ok) {
                        const errorData = await response.json();
                        alert(`Error: ${errorData.error || 'Número no encontrado.'}`);
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = 'Rastrear Pedido';
                        }
                        return;
                    }
                    const result = await response.json();
                    if (resultsContainer) {
                        resultsContainer.innerHTML = `<div class="alert alert-success"><h5>Estado del Pedido:</h5><pre class="bg-light p-3 rounded">${JSON.stringify(result.data || result, null, 2)}</pre></div>`;
                    } else {
                        alert('Pedido encontrado: ' + JSON.stringify(result, null, 2));
                    }
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Rastrear Otro';
                    }
                } catch (error) {
                    console.error('Error rastreo:', error);
                    alert('Error de conexión.');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Rastrear Pedido';
                    }
                }
            });
        }
    }

    // Lógica para PRODUCTOS (usa addToCart con backend sync)
    if (bodyId === 'page-productos') {
        const container = document.getElementById('products-container');
        if (container) {
            container.innerHTML = '';  // Limpia spinner
            
            const loadProducts = async () => {
                let products = [];
                try {
                    const response = await fetch(`${API_URL}/products`);
                    if (response.ok) {
                        const data = await response.json();
                        products = Array.isArray(data) ? data : data.products || [];
                    } else {
                        throw new Error(`API error: ${response.status}`);
                    }
                } catch (error) {
                    console.warn('API productos falló:', error);
                    if (typeof productsData !== 'undefined') {
                        products = productsData;
                    } else {
                        container.innerHTML = '<div class="text-center p-5"><h4 class="text-danger">Error cargando productos.</h4><a href="index.html" class="btn btn-primary-jg">Volver</a></div>';
                        return;
                    }
                }

                // Procesa products
                products.forEach(p => {
                    p.imageUrl = p.imageUrl || p.img || 'images/default.png';
                    if (typeof p.colors === 'string') p.colors = JSON.parse(p.colors || '[]');
                    if (typeof p.configurations === 'string') p.configurations = JSON.parse(p.configurations || '{}');
                });
                
                const productIdKey = products[0] && products[0]._id ? '_id' : 'id';
                container.innerHTML = products.map(p => `
                    <div class="col-lg-3 col-md-4 col-sm-6 mb-4">
                        <a href="producto-detalle.html?id=${p[productIdKey]}" class="product-card-link text-decoration-none">
                            <div class="product-card" data-id="${p[productIdKey]}" data-name="${p.name}" data-price="${p.price}" data-img="${p.imageUrl}" data-description="${p.description}">
                                <div class="product-image-container"><img src="${p.imageUrl}" alt="${p.name}" onerror="this.src='images/default.png'"></div>
                                <div class="product-card-body">
                                    <div class="product-card-title">${p.name}</div>
                                    <div class="product-price">$ ${parseFloat(p.price).toLocaleString('es-CO')}</div>
                                    <button class="btn btn-primary-jg mt-auto add-to-cart-quick ${!getCurrentUser  () ? 'disabled text-muted' : ''}">Añadir Rápido</button>
                                </div>
                            </div>
                        </a>
                    </div>
                `).join('');

                // Event listener para añadir rápido (usa addToCart backend)
                container.addEventListener('click', e => {
                    if (e.target.matches('.add-to-cart-quick')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const card = e.target.closest('.product-card');
                        const product = {
                            id: card.dataset.id,
                            name: card.dataset.name,
                            price: parseFloat(card.dataset.price),
                            imageUrl: card.dataset.img,
                            description: card.dataset.description
                        };
                        addToCart(product, 1, {});
                    }
                });
            };
            loadProducts();
        }
    }

    // Lógica para DETALLE DE PRODUCTO (usa addToCart backend)
    if (bodyId === 'page-producto-detalle') {
        const container = document.getElementById('product-detail-container');
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('id');
        
        if (!productId) {
            if (container) container.innerHTML = '<h2 class="text-center text-danger">ID no encontrado.</h2><a href="productos.html" class="btn btn-primary-jg">Ver Productos</a>';
            return;
        }
        
        if (container) container.innerHTML = '';
        
        const loadProductDetail = async () => {
            let product = null;
            try {
                const response = await fetch(`${API_URL}/products/${productId}`);
                if (response.ok) {
                    product = await response.json();
                } else {
                    throw new Error(`API error: ${response.status}`);
                }
            } catch (error) {
                console.warn('API detalle falló:', error);
                if (typeof productsData !== 'undefined') {
                    product = productsData.find(p => p.id == productId || p._id == productId);
                } else {
                    product = { id: productId, name: 'Ejemplo', price: 500000, description: 'API falló.', imageUrl: 'images/default.png' };
                }
            }
            
            if (!product) {
                if (container) container.innerHTML = '<h2 class="text-center text-danger">Producto no encontrado.</h2><a href="productos.html" class="btn btn-primary-jg">Ver Productos</a>';
                return;
            }

            // Procesa colors/configs
            if (typeof product.colors === 'string') product.colors = JSON.parse(product.colors || '["Negro","Blanco"]');
            if (typeof product.configurations === 'string') {
                product.configurations = JSON.parse(product.configurations || '{"Básica":0,"Estándar":50000}');
            } else {
                product.configurations = product.configurations || { 'Básica': 0, 'Estándar': 50000 };
            }

            const colors = Array.isArray(product.colors) ? product.colors : ['Negro', 'Blanco'];
            const configurations = product.configurations;

            container.innerHTML = `
                <div class="row g-5">
                    <div class="col-md-6">
                        <img src="${product.imageUrl}" alt="${product.name}" class="img-fluid rounded shadow-lg" onerror="this.src='images/default.png'">
                    </div>
                    <div class="col-md-6 d-flex flex-column">
                        <h1 class="page-title text-start">${product.name}</h1>
                        <p class="text-secondary fs-5">${product.description}</p>
                        <h2 class="my-4 display-5" id="product-price-display">$ ${parseFloat(product.price).toLocaleString('es-CO')}</h2>
                        <div class="mt-auto">
                            <div class="mb-3">
                                <label for="color" class="form-label fs-5">Color:</label>
                                <select id="color" class="form-select form-input-jg">
                                    ${colors.map(color => `<option value="${color}">${color}</option>`).join('')}
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="config" class="form-label fs-5">Configuración:</label>
                                <select id="config" class="form-select form-input-jg">
                                    ${Object.entries(configurations).map(([key, value]) => `<option value="${key}" data-price-extra="${value}">${key} (+$${parseInt(value).toLocaleString('es-CO')})</option>`).join('')}
                                </select>
                            </div>
                            <div class="d-flex align-items-center gap-3 mb-4">
                                <label for="quantity" class="form-label fs-5">Cantidad:</label>
                                <input type="number" id="quantity" class="form-control form-input-jg" value="1" min="1" style="width: 80px;">
                            </div>
                            <button id="add-to-cart-detail" class="btn btn-primary-jg btn-full ${!getCurrentUser  () ? 'disabled text-muted' : ''}">${getCurrentUser  () ? 'Añadir al Carrito' : '¡Inicia Sesión!'}</button>
                        </div>
                    </div>
                </div>`;

            const addToCartBtn = document.getElementById('add-to-cart-detail');
            if (addToCartBtn) {
                if (getCurrentUser  ()) {
                    addToCartBtn.addEventListener('click', () => {
                        const quantity = parseInt(document.getElementById('quantity').value) || 1;
                        const color = document.getElementById('color').value;
                        const config = document.getElementById('config').value;
                        const options = { color, config };
                        const configSelect = document.getElementById('config');
                        const priceExtra = parseInt(configSelect.selectedOptions[0]?.dataset.priceExtra || 0);
                        const totalPrice = parseFloat(product.price) + priceExtra;
                        document.getElementById('product-price-display').textContent = `$ ${totalPrice.toLocaleString('es-CO')}`;
                        addToCart({ ...product, price: totalPrice }, quantity, options);
                    });

                    const configSelect = document.getElementById('config');
                    if (configSelect) {
                        configSelect.addEventListener('change', (e) => {
                            const priceExtra = parseInt(e.target.selectedOptions[0]?.dataset.priceExtra || 0);
                            const totalPrice = parseFloat(product.price) + priceExtra;
                            document.getElementById('product-price-display').textContent = `$ ${totalPrice.toLocaleString('es-CO')}`;
                        });
                    }
                } else {
                    addToCartBtn.addEventListener('click', e => {
                        e.preventDefault();
                        requireLogin('login.html', 'Debes iniciar sesión para añadir al carrito.');
                    });
                }
            }
        };
        loadProductDetail();
    }

    // Lógica para CARRITO (backend: usa getCart async, sync remove/add)
    if (bodyId === 'page-carrito') {
        const itemsContainer = document.getElementById('cart-items-container');
        const summaryContainer = document.getElementById('cart-summary');
        const proceedBtn = document.getElementById('proceed-to-payment');
        
        if (itemsContainer) itemsContainer.innerHTML = '';
        if (summaryContainer) summaryContainer.style.display = 'none';
        
        const renderCart = async () => {
            const cart = await getCart();  // Backend si logueado, local fallback
            console.log('Render carrito:', cart.length, 'items');
            
            if (cart.length === 0) {
                if (itemsContainer) {
                    itemsContainer.innerHTML = '<div class="text-center p-5 bg-dark rounded"><h4 class="text-white-50">Tu carrito está vacío</h4><p class="text-white-50">Añade productos desde la tienda.</p><a href="productos.html" class="btn btn-primary-jg mt-3">Explorar Productos</a></div>';
                }
                if (summaryContainer) summaryContainer.style.display = 'none';
                return;
            }
            
            if (itemsContainer) {
                itemsContainer.innerHTML = cart.map(item => `
                    <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent text-white border-secondary">
                        <div class="d-flex align-items-center flex-grow-1">
                            <img src="${item.imageUrl || item.img || 'images/default.png'}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: contain;" class="me-3 rounded" onerror="this.src='images/default.png'">
                            <div class="flex-grow-1">
                                <h6 class="my-0">${item.name}</h6>
                                <small class="text-white-50">$ ${parseFloat(item.price).toLocaleString('es-CO')} c/u</small>
                                ${Object.keys(item.options || {}).length > 0 ? 
                                    `<small class="d-block text-info">Color: ${item.options.color || 'N/A'} | Config: ${item.options.config || 'N/A'}</small>` : 
                                    ''
                                }
                            </div>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <input type="number" class="form-control form-input-jg cart-quantity-input" value="${item.quantity}" min="1" data-id="${item.id}" style="width: 70px;">
                            <button class="btn btn-outline-danger cart-item-remove" data-id="${item.id}" title="Remover">&times;</button>
                        </div>
                    </li>
                `).join('');
            }
            
            const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
            const shipping = subtotal > 0 ? 15000 : 0;
            const total = subtotal + shipping;
            
            const subtotalEl = document.getElementById('cart-subtotal');
            const shippingEl = document.getElementById('cart-shipping');
            const totalEl = document.getElementById('cart-total');
            if (subtotalEl) subtotalEl.textContent = `$ ${subtotal.toLocaleString('es-CO')}`;
            if (shippingEl) shippingEl.textContent = `$ ${shipping.toLocaleString('es-CO')}`;
            if (totalEl) totalEl.textContent = `$ ${total.toLocaleString('es-CO')}`;
            if (summaryContainer) summaryContainer.style.display = 'block';
            
            if (proceedBtn) {
                const isLoggedIn = !!getCurrentUser  ();
                proceedBtn.disabled = !isLoggedIn;
                proceedBtn.classList.toggle('disabled', !isLoggedIn);
                proceedBtn.textContent = isLoggedIn ? 'Proceder al Pago' : '¡Inicia Sesión!';
                proceedBtn.href = isLoggedIn ? 'pago.html' : '#';
                
                if (!isLoggedIn) {
                    proceedBtn.addEventListener('click', e => {
                        e.preventDefault();
                        requireLogin('login.html', 'Debes iniciar sesión para proceder al pago.');
                    });
                } else {
                    proceedBtn.addEventListener('click', e => {
                        e.preventDefault();
                        window.location.href = 'pago.html';
                    });
                }
            }
        };

        // Event listeners para carrito (sync backend)
        if (itemsContainer) {
            itemsContainer.addEventListener('click', async e => {
                if (e.target.matches('.cart-item-remove')) {
                    const itemId = e.target.dataset.id;
                    const success = await removeFromCart(itemId);
                    if (success) {
                        alert('Item removido.');
                    }
                    await renderCart();
                }
            });
            
            itemsContainer.addEventListener('input', async e => {
                if (e.target.matches('.cart-quantity-input')) {
                    const itemId = e.target.dataset.id;
                    const newQuantity = parseInt(e.target.value) || 1;
                    if (newQuantity > 0) {
                        // Actualiza backend (usa agregar para update quantity)
                        await syncCartAction('agregar', { id: itemId, quantity: newQuantity - (await getCart()).find(item => item.id === itemId)?.quantity || 0 });
                    } else {
                        await removeFromCart(itemId);
                    }
                    await renderCart();
                }
            });
        }

        // Render inicial
        renderCart();
    }

    // NUEVA LÓGICA PARA PAGO (backend: load cart de BD, procesar via API)
    if (bodyId === 'page-pago') {
        const itemsContainer = document.getElementById('payment-items-container') || document.getElementById('cart-items-container');  // Asume ID en HTML
        const summaryContainer = document.getElementById('payment-summary') || document.getElementById('cart-summary');
        const shippingForm = document.getElementById('shipping-form');  // Form para dirección
        const processBtn = document.getElementById('process-payment-btn');
        
        if (!requireLogin('login.html', 'Debes iniciar sesión para pagar.')) return;
        
        if (itemsContainer) itemsContainer.innerHTML = '';
        if (summaryContainer) summaryContainer.style.display = 'none';
        
                const loadPaymentCart = async () => {
            try {
                const response = await sendWithAuth(`${API_URL}/cart/obtener`);
                if (!response.ok) {
                    const error = await response.json();
                    alert(`Error cargando carrito: ${error.error || 'Inténtalo de nuevo.'}`);
                    window.location.href = 'carrito.html';
                    return;
                }
                const result = await response.json();
                const cart = result.items || [];
                
                if (cart.length === 0) {
                    if (itemsContainer) {
                        itemsContainer.innerHTML = '<div class="text-center p-5"><h4 class="text-warning">Tu carrito está vacío</h4><p>No hay items para procesar el pago. <a href="carrito.html">Volver al Carrito</a></p></div>';
                    }
                    if (processBtn) processBtn.disabled = true;
                    return;
                }
                
                // Render items (similar a carrito)
                if (itemsContainer) {
                    itemsContainer.innerHTML = cart.map(item => `
                        <div class="row mb-3">
                            <div class="col-md-8">
                                <h6>${item.name}</h6>
                                <small>Cantidad: ${item.quantity} | Precio: $ ${parseFloat(item.price).toLocaleString('es-CO')}</small>
                                ${Object.keys(item.options || {}).length > 0 ? 
                                    `<br><small>Color: ${item.options.color || 'N/A'} | Config: ${item.options.config || 'N/A'}</small>` : 
                                    ''
                                }
                            </div>
                            <div class="col-md-4 text-end">
                                <strong>Subtotal: $ ${(item.price * item.quantity).toLocaleString('es-CO')}</strong>
                            </div>
                        </div>
                    `).join('');
                }
                
                // Calcula totales
                const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
                const shipping = subtotal > 0 ? 15000 : 0;
                const total = subtotal + shipping;
                
                const subtotalEl = document.getElementById('payment-subtotal') || document.getElementById('cart-subtotal');
                const shippingEl = document.getElementById('payment-shipping') || document.getElementById('cart-shipping');
                const totalEl = document.getElementById('payment-total') || document.getElementById('cart-total');
                if (subtotalEl) subtotalEl.textContent = `$ ${subtotal.toLocaleString('es-CO')}`;
                if (shippingEl) shippingEl.textContent = `$ ${shipping.toLocaleString('es-CO')}`;
                if (totalEl) totalEl.textContent = `$ ${total.toLocaleString('es-CO')}`;
                if (summaryContainer) summaryContainer.style.display = 'block';
                
                // Maneja form de envío y procesar pago
                if (shippingForm && processBtn) {
                    shippingForm.addEventListener('submit', async (e) => {
                        e.preventDefault();
                        const shipping_address = shippingForm.shipping_address?.value.trim() || 'Dirección por defecto';
                        if (!shipping_address) {
                            alert('Ingresa tu dirección de envío.');
                            return;
                        }
                        
                        processBtn.disabled = true;
                        processBtn.textContent = 'Procesando Pago...';
                        
                        try {
                            const response = await sendWithAuth(`${API_URL}/pago/procesar`, {
                                method: 'POST',
                                body: JSON.stringify({ shipping_address, billing_address: shipping_address })  // Asume billing = shipping
                            });
                            if (!response.ok) {
                                const error = await response.json();
                                alert(`Error en pago: ${error.error || 'Inténtalo de nuevo.'}`);
                                processBtn.disabled = false;
                                processBtn.textContent = 'Procesar Pago';
                                return;
                            }
                            const result = await response.json();
                            if (result.success) {
                                alert('¡Pago procesado exitosamente!');
                                // Limpia carrito local
                                saveStorage('cart', []);
                                // Redirige a éxito con params
                                const redirectUrl = `/pago_exito.html?order_id=${result.order_id}&tracking=${result.tracking_number}&factura=${result.factura_numero}&total=${total}`;
                                window.location.href = redirectUrl;
                            }
                        } catch (error) {
                            console.error('Error pago:', error);
                            alert('Error de conexión en pago.');
                            processBtn.disabled = false;
                            processBtn.textContent = 'Procesar Pago';
                        }
                    });
                }
            } catch (error) {
                console.error('Error load pago:', error);
                alert('Error cargando carrito para pago.');
                window.location.href = 'carrito.html';
            }
        };
        
        loadPaymentCart();
    }

    // Lógica para PAGO ÉXITO (opcional: muestra params de URL)
    if (bodyId === 'page-pago-exito') {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('order_id');
        const tracking = params.get('tracking');
        const factura = params.get('factura');
        const total = params.get('total');
        
        const successContainer = document.getElementById('success-container') || document.body;
        successContainer.innerHTML = `
            <div class="alert alert-success text-center mt-5">
                <h2>¡Pago Exitoso!</h2>
                <p>Tu pedido ha sido procesado correctamente.</p>
                ${orderId ? `<p><strong>ID Pedido:</strong> ${orderId}</p>` : ''}
                ${tracking ? `<p><strong>Tracking:</strong> <a href="rastreo.html?codigo=${tracking}">${tracking}</a></p>` : ''}
                ${factura ? `<p><strong>Factura:</strong> <a href="/facturas/factura_${orderId || 'order'}.pdf" target="_blank">${factura}</a></p>` : ''}
                ${total ? `<p><strong>Total Pagado:</strong> $ ${total}</p>` : ''}
                <a href="index.html" class="btn btn-primary-jg mt-3">Volver al Inicio</a>
                <a href="productos.html" class="btn btn-outline-jg mt-3">Comprar Más</a>
            </div>`;
    }

    // Update navbar (tu código limpio)
        const updateNavbar = () => {
        const authSection = document.getElementById('auth-section');
        const currentUser   = getCurrentUser  ();
        const venderLink = document.getElementById('vender-link');
        
        if (authSection) {
            if (currentUser  ) {
                const displayName = currentUser  .storeName || currentUser  .nombre || 'Mi Cuenta';
                authSection.innerHTML = `<a href="mi-cuenta.html" class="btn btn-primary-jg me-2">${displayName}</a>
                                         <button id="logout-btn" class="btn btn-outline-jg">Cerrar Sesión</button>`;
                
                if (venderLink && currentUser  .role === 'vendedor') {
                    venderLink.href = 'venta-productos.html';
                    venderLink.textContent = 'MI TIENDA';
                }
                
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => {
                        sessionStorage.removeItem('currentUser  ');
                        localStorage.removeItem('authToken');
                        alert('Has cerrado sesión.');
                        updateNavbar();
                        

                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                try {
                // Primero, fetch al backend para invalidar sesión
                const response = await sendWithAuth(`${API_URL}/auth/logout`, {
                method: 'POST'
            });
            if (response.ok) {
                console.log('DEBUG: Logout backend exitoso');
            } else {
                console.warn('DEBUG: Logout backend falló, pero procediendo');
            }
        } catch (error) {
            console.warn('DEBUG: Error en fetch logout:', error);
        }
        // Luego, borra storage del frontend
        sessionStorage.removeItem('currentUser ');
        localStorage.removeItem('authToken');
        alert('Has cerrado sesión.');
        updateNavbar();  // Actualiza navbar (usuario ya no logueado)
        window.location.href = 'index.html';  // Redirige
    });
}
                    });
                }
            } else {
                authSection.innerHTML = `<a href="login.html" class="btn btn-outline-jg me-2">Iniciar Sesión</a>
                                         <a href="crear-cuenta.html" class="btn btn-primary-jg">Registrarse</a>`;
                
                if (venderLink) {
                    venderLink.href = 'beneficios-vendedor.html';
                    venderLink.textContent = 'VENDER';
                }
            }
        }
    };

    // Llamada final: Actualiza navbar en todas las páginas
    updateNavbar();
});
