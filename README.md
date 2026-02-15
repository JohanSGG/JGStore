JGStore es una plataforma de e-commerce ficticia desarrollada para la venta de productos tecnológicos. Incluye funcionalidades como autenticación de usuarios, gestión de carrito de compras, procesamiento de pagos, rastreo de pedidos y un catálogo de productos. El proyecto mantiene el backend separado en una carpeta dedicada, mientras que el frontend se organiza en la raíz para evitar conflictos de configuración y mantener simplicidad en el desarrollo local.

Estructura del Proyecto
La estructura del proyecto sigue una arquitectura modular, con el backend separado para facilitar el mantenimiento, y el frontend en la raíz para una integración directa con el servidor. A continuación, se detalla la organización de carpetas y archivos:

JGStore/
├── jgstore-backend/          # Backend: Servidor, APIs y lógica del servidor
│   ├── config/               # Configuraciones (ej. db.js para conexión a BD)
│   ├── controllers/          # Lógica de negocio (ej. authController.js, cartController.js)
│   ├── models/               # Modelos de datos (ej. UserModel.js, ProductModel.js)
│   ├── routes/               # Definición de rutas API (ej. authRoutes.js, productRoutes.js)
│   ├── middleware/           # Middlewares personalizados (ej. authMiddleware.js)
│   ├── server.js             # Archivo principal del servidor Express
│   ├── package.json          # Dependencias y scripts de Node.js
│   └── .env                  # Variables de entorno (no incluido en repo por seguridad)
├── css/                      # Estilos CSS del frontend (ej. style.css)
├── js/                       # Scripts JavaScript del frontend (ej. script.js)
├── images/                   # Imágenes y assets (ej. banners, íconos)
├── facturas/                 # PDFs generados de facturas
├── index.html                # Página principal del frontend
├── carrito.html              # Página del carrito
├── pago.html                 # Página de pago
├── rastreo.html              # Página de rastreo
├── [otras páginas HTML]      # Páginas adicionales (ej. login, registro, crear-cuenta)
├── Entregable_JGStore_APIs/  # Documentación y entregables (opcional)
│   ├── documento_pruebas.pdf # Pruebas con Postman
│   ├── endpoints_jgstore.json # Documentación de APIs
│   ├── video.mp4             # Video de demostración
│   └── README.md             # Descripción del entregable
└── README.md                 # Este archivo

Por Qué Esta Organización
Elegí esta estructura de carpetas por las siguientes razones, enfocándome en principios de desarrollo de software como simplicidad, integración y reducción de conflictos:

Separación Backend/Frontend con Integración Directa:

jgstore-backend/ contiene todo el servidor (APIs, BD, lógica), separado para modularidad y escalabilidad. El frontend (HTML, CSS, JS, imágenes) se mantiene en la raíz para evitar conflictos al mover archivos, permitiendo que el servidor Express sirva directamente desde ../ (raíz del proyecto). Esto simplifica la configuración local y reduce errores de paths, especialmente en entornos de desarrollo donde herramientas como Live Server pueden interferir.
Modularidad Interna:

En jgstore-backend/, las carpetas routes/, controllers/ y models/ siguen el patrón MVC (Model-View-Controller), separando rutas (endpoints), lógica de negocio y acceso a datos. Esto hace el código más legible y fácil de mantener/testear.
En la raíz, css/, js/, images/ y facturas/ organizan assets por tipo, facilitando actualizaciones sin afectar el backend.
Escalabilidad y Reutilización:

Esta organización permite expandir el proyecto fácilmente (ej. agregar más rutas en backend o páginas en frontend). La separación evita mezclas, pero la ubicación del frontend en la raíz asegura compatibilidad inmediata con el servidor sin ajustes complejos.
La carpeta Entregable_JGStore_APIs/ es opcional y separada para entregas académicas, manteniendo el código limpio.
Mejores Prácticas y Simplicidad:

Inspirado en estándares de proyectos Node.js, pero adaptado para evitar conflictos (ej. no mover frontend a subcarpetas que requieran cambios en paths). Prioriza facilidad de uso sobre complejidad, ideal para proyectos pequeños o educativos.
Compatible con control de versiones (Git): Archivos en raíz facilitan commits rápidos, y .gitignore puede excluir carpetas innecesarias.
Esta organización se basa en experiencias con proyectos full-stack, equilibrando claridad y practicidad, y se alinea con frameworks como Express.js y Bootstrap.