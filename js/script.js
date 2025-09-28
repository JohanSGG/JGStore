document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000/api';
    const getCurrentUser = () => JSON.parse(sessionStorage.getItem('currentUser'));
    const setCurrentUser = user => sessionStorage.setItem('currentUser', JSON.stringify(user));

    const updateNavbar = () => {
        const authSection = document.getElementById('auth-section');
        const currentUser = getCurrentUser();
        const venderLink = document.getElementById('vender-link');
        if (authSection) {
            if (currentUser) {
                const displayName = currentUser.storeName || currentUser.nombre;
                authSection.innerHTML = `<a href="mi-cuenta.html" class="btn btn-primary-jg">${displayName}</a>`;
                if (venderLink && currentUser.role === 'vendedor') {
                    venderLink.href = 'venta-productos.html';
                }
            } else {
                authSection.innerHTML = `<a href="login.html" class="btn btn-outline-jg">Iniciar Sesión</a><a href="crear-cuenta.html" class="btn btn-primary-jg">Registrarse</a>`;
            }
        }
    };

    const handleAuthSuccess = (result, message) => {
        sessionStorage.setItem('currentUser', JSON.stringify(result.user));
        localStorage.setItem('authToken', result.token);
        alert(message);
        let redirectUrl = 'index.html';
        if (result.user.role === 'vendedor') redirectUrl = 'venta-productos.html';
        window.location.href = redirectUrl;
    };

    const bodyId = document.body.id;

    // Lógica para REGISTRO DE USUARIO
    if (bodyId === 'page-crear-cuenta') {
        const form = document.getElementById('user-registration-form');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const formData = {
                nombre: form.nombre.value,
                apellido: form.apellido.value,
                email: form.email.value,
                password: form.pass.value,
            };
            try {
                const response = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                handleAuthSuccess(result, '¡Registro exitoso! Iniciando sesión...');
            } catch (error) {
                alert(`Error en el registro: ${error.message}`);
            }
        });
    }

    // Lógica para REGISTRO DE VENDEDOR
    if (bodyId === 'page-registro-vendedor') {
        const form = document.getElementById('seller-registration-form');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const formData = {
                nombre: form.nombre.value,
                apellido: form.apellido.value,
                storeName: form.storeName.value,
                email: form.email.value,
                password: form.pass.value,
                role: 'vendedor'
            };
            try {
                const response = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                handleAuthSuccess(result, '¡Cuenta de vendedor creada! Iniciando sesión...');
            } catch (error) {
                alert(`Error en el registro: ${error.message}`);
            }
        });
    }

    // Lógica para INICIO DE SESIÓN
    if (bodyId === 'page-login') {
        const form = document.getElementById('login-form');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const loginData = { email: form.email.value, password: form.pass.value };
            try {
                const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginData) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.message);
                handleAuthSuccess(result, '¡Login exitoso!');
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });
    }

    // Lógica para la página MI CUENTA
    if (bodyId === 'page-mi-cuenta') {
        const currentUser = getCurrentUser();
        const detailsContainer = document.getElementById('account-details');
        if (currentUser) {
            detailsContainer.innerHTML = `
                <p><strong>Nombre:</strong> ${currentUser.nombre} ${currentUser.apellido || ''}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <p><strong>Rol:</strong> <span class="badge bg-primary text-capitalize">${currentUser.role}</span></p>
                ${currentUser.storeName ? `<p><strong>Tienda:</strong> ${currentUser.storeName}</p>` : ''}`;
            
            document.getElementById('logout-btn-details').addEventListener('click', () => {
                sessionStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                alert('Has cerrado sesión.');
                window.location.href = 'index.html';
            });
        } else {
            detailsContainer.innerHTML = `<p class="text-center">No has iniciado sesión. <a href="login.html">Inicia sesión</a></p>`;
            document.getElementById('logout-btn-details').style.display = 'none';
        }
    }
    
    updateNavbar();
});