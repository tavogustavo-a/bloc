(() => {
  const KEY = "bloc-gastos";
  const S = (d) => `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`;
  const ICONS = [
    ["viaje", "Viaje", "#2f6a9a", S("M3 13l18-4-6 3 2 6-3-4-4 2z")],
    ["compras", "Compras", "#c47a2c", S("M6 8h12l-1 11H7L6 8zM9 8V6a3 3 0 0 1 6 0v2")],
    ["paseo", "Paseo", "#3d8f6a", S("M8 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 17h8M8 14l2.5-6H15")],
    ["comida", "Comida", "#d85a2a", S("M7 4v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V4M9 14v6M16 4v16M16 4c2 1 2 4 0 5")],
    ["restaurante", "Restaurante", "#a33e18", S("M5 4v7a3 3 0 0 0 6 0V4M8 11v9M16 4c2.2 2 2.2 6 0 8v8")],
    ["cafe", "Café", "#6b4a32", S("M6 9h10v5a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V9zM16 10h2a2 2 0 0 1 0 4h-2M8 4c.4 1 .4 2 0 3M12 4c.4 1 .4 2 0 3")],
    ["mercado", "Mercado", "#2f8f4a", S("M4 9h16l-1.4 10H5.4L4 9zM8 9V7a4 4 0 0 1 8 0v2")],
    ["supermercado", "Súper", "#3a7d4a", S("M4 6h2l2 11h10l2-8H7M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z")],
    ["pan", "Panadería", "#c4923a", S("M5 14c0-4 3-7 7-7s7 3 7 7v3H5v-3zM8 14h8")],
    ["fruta", "Frutas", "#d24b4b", S("M12 20a7 7 0 0 1-7-7c2-1 4 0 5-1 1 2 3 3 5 2 1 2 1 4-3 6zM12 8c1-2 3-3 5-2")],
    ["carne", "Carne", "#b04343", S("M6 14c0-4 3-7 7-6 3 .6 5 3 5 6 0 3-2 5-6 5s-6-2-6-5z")],
    ["transporte", "Transporte", "#3a6ea8", S("M5 16V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v8M5 16h14v3H5v-3zM8 19v1M16 19v1M5 12h14")],
    ["taxi", "Taxi", "#c9a227", S("M4 15h16v3H4v-3zM6 15l2-5h8l2 5M8 18h.1M16 18h.1")],
    ["gasolina", "Gasolina", "#c45a2a", S("M7 20V5h7v15M7 9h7M16 8l3 2v6a2 2 0 0 1-2 2")],
    ["bus", "Bus", "#2f6a9a", S("M5 6h14v10H5zM5 16v3h3v-3M16 19v-3h3v3M5 11h14M8 6V4M16 6V4")],
    ["avion", "Avión", "#4a6a8a", S("M3 13l18-4-6 3 2 6-3-4-4 2z")],
    ["hotel", "Hotel", "#6a5a8a", S("M4 20V6h6v14M10 20V10h10v10M7 9h.1M7 12h.1M14 13h2M14 16h2")],
    ["casa", "Casa", "#8a6a3a", S("M4 11.5 12 5l8 6.5V20H4v-8.5zM10 20v-6h4v6")],
    ["arriendo", "Arriendo", "#7a6248", S("M5 20V9l7-5 7 5v11H5zM10 20v-5h4v5")],
    ["servicios", "Servicios", "#3a7a8a", S("M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z")],
    ["luz", "Luz", "#c9a227", S("M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11c.6.6 1 1.4 1 2h4c0-.6.4-1.4 1-2a6 6 0 0 0-3-11z")],
    ["agua", "Agua", "#2f8fad", S("M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z")],
    ["internet", "Internet", "#3a6ad0", S("M5 9a10 10 0 0 1 14 0M7.5 12a6.5 6.5 0 0 1 9 0M10 15a3 3 0 0 1 4 0M12 18h.1")],
    ["salud", "Salud", "#c43a4a", S("M4 12h5l2-5 3 10 2-5h4")],
    ["farmacia", "Farmacia", "#2f8f6a", S("M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z")],
    ["medico", "Médico", "#3a7a9a", S("M8 4h8v4H8zM9 8v12h6V8M7 14h10")],
    ["ropa", "Ropa", "#8a4a7a", S("M8 6l4 3 4-3 4 3-2 12H6L4 9z")],
    ["zapatos", "Zapatos", "#5a4638", S("M3 15c2 0 3-2 5-2h9l3 3v2H3z")],
    ["educacion", "Educación", "#3a5a9a", S("M3 10l9-5 9 5-9 5-9-5zM7 12v5c2 2 8 2 10 0v-5")],
    ["colegio", "Colegio", "#4a6a3a", S("M4 20V9l8-5 8 5v11H4zM10 20v-6h4v6")],
    ["mascota", "Mascota", "#c47a3a", S("M6 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 12c0 4 2 7 4 7s4-3 4-7a4 4 0 0 0-8 0z")],
    ["cine", "Cine", "#3a3a4a", S("M5 6h14v12H5zM8 6v12M16 6v12M5 10h3M5 14h3M16 10h3M16 14h3")],
    ["musica", "Música", "#6a3a8a", S("M9 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 15V5l7-2v8")],
    ["deporte", "Deporte", "#2f8a4a", S("M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM4 12h16M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18")],
    ["gimnasio", "Gimnasio", "#4a4a4a", S("M4 12h3M17 12h3M7 9v6M17 9v6M7 12h10")],
    ["regalo", "Regalo", "#c43a6a", S("M4 11h16v9H4zM4 11V8h16v3M12 8v12M12 8c-2-3-5-2-4 0M12 8c2-3 5-2 4 0")],
    ["familia", "Familia", "#3a7a6a", S("M8 11a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 8 11zM16 11a2.2 2.2 0 1 0 0-4.4A2.2 2.2 0 0 0 16 11zM4 19c.4-3 2-4.5 4-4.5s3.6 1.5 4 4.5M12 19c.4-3 2-4.5 4-4.5s3.6 1.5 4 4.5")],
    ["ninos", "Niños", "#d27a3a", S("M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 20c.6-4 3-6 6-6s5.4 2 6 6")],
    ["belleza", "Belleza", "#c45a8a", S("M12 4c2 3 2 5 0 7-2-2-2-4 0-7zM8 13c0 4 1.8 7 4 7s4-3 4-7H8z")],
    ["tecnologia", "Tecnología", "#3a4a6a", S("M5 6h14v9H5zM9 19h6M12 15v4")],
    ["celular", "Celular", "#2a3a4a", S("M8 3h8v18H8zM11 18h2")],
    ["suscripcion", "Suscripción", "#6a4ad0", S("M5 7h14v12H5zM5 11h14M9 7V5M15 7V5")],
    ["impuestos", "Impuestos", "#6a5a3a", S("M7 3h8l3 3v15H7zM15 3v4h4M9 12h6M9 16h6")],
    ["banco", "Banco", "#3a5a4a", S("M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M3 18h18M12 4l9 6H3z")],
    ["ahorro", "Ahorro", "#2f8a5a", S("M5 12h10a4 4 0 0 1 0 8H8M5 12V8h6a3 3 0 0 1 0 6")],
    ["trabajo", "Trabajo", "#4a5a6a", S("M4 9h16v10H4zM9 9V7h6v2")],
    ["oficina", "Oficina", "#5a6a7a", S("M5 20V5h8v15M13 9h6v11M8 8h2M8 12h2M16 13h2M16 16h2")],
    ["herramientas", "Herramientas", "#6a6a6a", S("M14 6a3 3 0 0 0-4 4L4 16l2 2 6-6a3 3 0 0 0 4-4l-2 2-2-2z")],
    ["jardin", "Jardín", "#2f7a3a", S("M12 21V11M12 13c-3-1-5-4-4-7 3 0 5 2 4 7zM12 13c3-1 5-4 4-7-3 0-5 2-4 7z")],
    ["fiesta", "Fiesta", "#c43a8a", S("M5 19l6-14 2 4 6 2zM14 8l2-3M16 12l3 1")],
    ["bebidas", "Bebidas", "#3a6ad0", S("M8 3h8l-1 8a3 3 0 0 1-6 0L8 3zM12 14v5M9 21h6")],
    ["limpieza", "Limpieza", "#3a9aaa", S("M8 21V10l4-6 4 6v11M8 14h8")],
    ["lavanderia", "Lavandería", "#4a8ab0", S("M6 4h12v16H6zM6 8h12M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z")],
    ["seguro", "Seguro", "#3a6a5a", S("M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z")],
    ["reparacion", "Reparación", "#6a5a4a", S("M14 5l5 5-8 8H6v-5zM12 7l5 5")],
    ["muebles", "Muebles", "#8a6a42", S("M5 12V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M4 12h16v6H4zM7 18v2M17 18v2")],
    ["electro", "Electro", "#4a6a8a", S("M6 4h12v12H6zM8 20h8M12 16v4")],
    ["libros", "Libros", "#6a4a2a", S("M5 5h6a3 3 0 0 1 3 3v11a3 3 0 0 0-3-2H5zM19 5h-6a3 3 0 0 0-3 3v11a3 3 0 0 1 3-2h6z")],
    ["juegos", "Juegos", "#5a4ad0", S("M7 10h10a4 4 0 0 1 4 4v1a3 3 0 0 1-3 3h-2l-2-2h-2l-2 2H6a3 3 0 0 1-3-3v-1a4 4 0 0 1 4-4zM8 13v3M6.5 14.5h3")],
    ["streaming", "Streaming", "#c43a3a", S("M4 7h16v10H4zM10 10l5 2.5L10 15z")],
    ["donacion", "Donación", "#c45a6a", S("M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z")],
    ["playa", "Playa", "#2f9aaa", S("M4 16c2-2 4-2 6 0s4 2 6 0 4-2 4 0M12 14V5M12 5l4 3")],
    ["montana", "Montaña", "#4a6a5a", S("M3 19l6-10 3 5 3-4 6 9z")],
    ["farmacos", "Medicinas", "#2a8a6a", S("M8 8h8v10H8zM10 5h4v3h-4z")],
    ["peluqueria", "Peluquería", "#8a4a6a", S("M7 4l3 8-3 8M17 4l-3 8 3 8M10 12h4")],
    ["estacion", "Parqueadero", "#3a5a8a", S("M6 4h7a4 4 0 0 1 0 8H6zM6 4v16")],
    ["envio", "Envío", "#c47a2c", S("M3 8h11v8H3zM14 11h4l3 3v2h-7zM7 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z")],
    ["metro", "Metro", "#3a5a8a", S("M6 16V8h12v8M6 12h12M8 16v3M16 16v3M9 8V5h6v3")],
    ["bicicleta", "Bicicleta", "#2f8a4a", S("M7 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 14l3-6h4l3 6M10 8h3")],
    ["barco", "Barco", "#2f6a9a", S("M3 15l2 4h14l2-4H3zM12 15V5l6 4")],
    ["tren", "Tren", "#4a5a6a", S("M7 4h10v12H7zM7 10h10M9 16l-2 3M15 16l2 3M9 7h2M13 7h2")],
    ["helado", "Helado", "#d27a9a", S("M8 11h8l-2 9h-4zM8 11a4 4 0 0 1 8 0")],
    ["pizza", "Pizza", "#c45a2a", S("M12 4l8 14H4zM12 9v4M10 14h.1")],
    ["desayuno", "Desayuno", "#c4923a", S("M6 10h9a4 4 0 0 1 0 8H8M6 10V7M15 12h2a2 2 0 0 1 0 4h-2")],
    ["verduras", "Verduras", "#2f8a4a", S("M12 20V10M12 12c-4 0-6-3-5-6 4 0 6 2 5 6zM12 12c4 0 6-3 5-6-4 0-6 2-5 6z")],
    ["pescado", "Pescado", "#2f8fad", S("M3 12c4-4 8-4 12 0-4 4-8 4-12 0zM15 12h6l-2-3M8 12h.1")],
    ["snack", "Snack", "#c47a2c", S("M7 8h10l-1 12H8zM9 8c0-2 6-2 6 0")],
    ["farmacia2", "Droguería", "#2a8a6a", S("M5 8h14v11H5zM9 8V6h6v2M12 11v5M9.5 13.5h5")],
    ["dentista", "Dentista", "#3a8aaa", S("M8 6c0 4 1 6 2 10h4c1-4 2-6 2-10a4 4 0 0 0-8 0z")],
    ["deporte2", "Fútbol", "#2f6a3a", S("M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8l3 2-1 3h-4l-1-3z")],
    ["natacion", "Natación", "#2f8fad", S("M3 16c2-2 3-2 5 0s3 2 5 0 3-2 5 0M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 10l5-3")],
    ["mascota2", "Veterinaria", "#c45a4a", S("M7 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 14a4 4 0 0 0-4 4h8a4 4 0 0 0-4-4z")],
    ["bebe", "Bebé", "#d27a8a", S("M9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0zM8 20c.5-3 2-5 4-5s3.5 2 4 5M12 4v2")],
    ["pareja", "Pareja", "#c43a6a", S("M8 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 20c.5-3 2-4 3.5-4S12 17 12 20M12 20c0-3 1.5-4 3-4s3 1 3.5 4")],
    ["regalo2", "Cumpleaños", "#c43a8a", S("M12 4v3M9 7h6v4H9zM8 11h8v8H8zM12 11v8")],
    ["iglesia", "Iglesia", "#6a5a8a", S("M12 3v4M10 5h4M8 21V10l4-3 4 3v11M11 21v-4h2v4")],
    ["cine2", "Teatro", "#6a3a6a", S("M5 8h14v9H5zM8 8l2-3h4l2 3M9 13h6")],
    ["camara", "Fotos", "#3a4a6a", S("M4 8h4l2-2h4l2 2h4v10H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z")],
    ["juego2", "Videojuegos", "#5a4ad0", S("M6 10h12a3 3 0 0 1 3 3v2a2 2 0 0 1-2 2h-3l-2-2h-2l-2 2H5a2 2 0 0 1-2-2v-2a3 3 0 0 1 3-3zM8 13v2M7 14h2")],
    ["libro2", "Biblioteca", "#6a4a2a", S("M5 5h5a3 3 0 0 1 3 3v11H8a3 3 0 0 0-3 3zM19 5h-5a3 3 0 0 0-3 3v11h5a3 3 0 0 1 3 3z")],
    ["arte", "Arte", "#c45a6a", S("M5 16l7-10 7 10H5zM9 16l3 4 3-4")],
    ["musica2", "Concierto", "#6a3a8a", S("M9 17a3 3 0 1 0 .2-6L15 9V4l5 1v6")],
    ["ahorro2", "Alcancía", "#2f8a5a", S("M6 12h8a4 4 0 0 1 0 8H8a3 3 0 0 1-3-3v-2zM14 12V9a2 2 0 0 0-2-2")],
    ["nomina", "Nómina", "#3a6a4a", S("M7 4h8l3 3v13H7zM15 4v4h4M9 12h6M9 16h4")],
    ["tarjeta", "Tarjeta", "#3a5a9a", S("M4 8h16v8H4zM4 11h16")],
    ["efectivo", "Efectivo", "#2f8a4a", S("M5 8h14v8H5zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z")],
    ["factura", "Factura", "#6a5a3a", S("M7 3h8l3 3v15l-2-1-2 1-2-1-2 1-2-1-1 1V3zM10 9h5M10 13h5")],
    ["mudanza", "Mudanza", "#8a6a42", S("M4 10h10v8H4zM14 13h5l1 2v3h-6M7 18h.1M16 18h.1")],
    ["jardin2", "Flores", "#c45a8a", S("M12 21V12M12 12c-3-1-4-4-2-6 3 1 3 4 2 6zM12 12c3-1 4-4 2-6-3 1-3 4-2 6z")],
    ["limpieza2", "Aseo", "#3a9aaa", S("M12 4v8M9 20h6l-1-8H10zM8 8h8")],
    ["mecanico", "Mecánico", "#5a5a5a", S("M14 6a3 3 0 0 0-3 5l-6 6 2 2 6-6a3 3 0 0 0 5-3l-2 2-2-2z")],
    ["seguro2", "Póliza", "#3a6a8a", S("M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6zM9 12l2 2 4-4")],
    ["sol", "Sol", "#c9a227", S("M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5")],
    ["luna", "Noche", "#3a4a6a", S("M15 4a7 7 0 1 0 5 12 6 6 0 0 1-5-12z")],
    ["lluvia", "Lluvia", "#3a6a9a", S("M7 15a4 4 0 0 1 1-8 5 5 0 0 1 9 2 3 3 0 0 1 1 6M8 18v2M12 18v2M16 18v2")],
    ["nieve", "Nieve", "#6a8aaa", S("M12 4v16M6 8l12 8M18 8 6 16M8 6l8 12M16 6 8 18")],
    ["fuego", "Fuego", "#c43a2a", S("M12 21c4 0 6-3 6-6 0-4-3-5-3-8 0 2-2 3-2 3s-1-4-4-6c0 4-3 5-3 8 0 4 2 9 6 9z")],
    ["arbol", "Árbol", "#2f6a3a", S("M12 21v-5M8 16h8l-2-4h3L12 4 7 12h3z")],
    ["campana", "Campana", "#c47a2c", S("M6 16h12l-1-3V10a5 5 0 0 0-10 0v3zM10 16a2 2 0 0 0 4 0")],
    ["reloj", "Reloj", "#3a4a6a", S("M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 8v5l3 2")],
    ["calendario", "Calendario", "#c43a4a", S("M6 5h12v14H6zM6 9h12M9 3v4M15 3v4")],
    ["correo", "Correo", "#3a6ad0", S("M4 7h16v10H4zM4 7l8 6 8-6")],
    ["telefono", "Teléfono", "#2f8a4a", S("M7 4h3l1 4-2 1a12 12 0 0 0 6 6l1-2 4 1v3a2 2 0 0 1-2 2A15 15 0 0 1 5 6a2 2 0 0 1 2-2z")],
    ["chat", "Chat", "#3a7a9a", S("M5 6h14v9H8l-3 3z")],
    ["llave", "Llave", "#c9a227", S("M8 15a4 4 0 1 1 3-6l8 1v3h-2v2h-2l-2-2")],
    ["candado", "Candado", "#4a4a4a", S("M8 11V8a4 4 0 0 1 8 0v3M7 11h10v8H7z")],
    ["mapa", "Mapa", "#2f8a5a", S("M9 5l-5 2v12l5-2 6 2 5-2V5l-5 2zM9 5v12M15 7v12")],
    ["brujula", "Brújula", "#c45a2a", S("M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM14 10l-1 4-4 1 1-4z")],
    ["maleta", "Maleta", "#6a4a2a", S("M8 8h8v11H8zM10 8V6h4v2M8 12h8")],
    ["camara2", "Cámara", "#3a3a4a", S("M4 8h4l2-2h4l2 2h4v9H4zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z")],
    ["micro", "Micrófono", "#6a3a6a", S("M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM7 11a5 5 0 0 0 10 0M12 16v4")],
    ["auricular", "Audífonos", "#3a4a6a", S("M5 13a7 7 0 0 1 14 0v5h-4v-5H5zM5 13v5h3v-5")],
    ["tv", "Televisión", "#2a3a4a", S("M4 7h16v10H4zM9 20h6M12 17v3")],
    ["impresora", "Impresora", "#4a5a6a", S("M7 8V4h10v4M6 14h12v6H6zM6 10h12a2 2 0 0 1 2 2v4H4v-4a2 2 0 0 1 2-2z")],
    ["usb", "USB", "#3a6ad0", S("M12 3v10M9 6l3-3 3 3M8 13h8v4a4 4 0 0 1-8 0z")],
    ["bateria", "Batería", "#2f8a4a", S("M6 8h10v8H6zM16 10h2v4h-2M8 10v4")],
    ["enchufe", "Enchufe", "#c9a227", S("M9 3v6M15 3v6M8 9h8v3a4 4 0 0 1-8 0zM12 16v5")],
    ["bombillo", "Bombillo", "#c9a227", S("M9 18h6M10 21h4M8 14a5 5 0 1 1 8 0c-1 1-1 2-1 3H9c0-1 0-2-1-3z")],
    ["martillo", "Martillo", "#6a5a4a", S("M4 14l6-6 2 2-6 6zM13 7l4-3 3 3-3 4")],
    ["destornillador", "Destornillador", "#4a6a8a", S("M14 4l6 6-3 1-7 7-3-3 7-7z")],
    ["pintura", "Pintura", "#c45a6a", S("M6 18a2 2 0 1 0 2 2H6zM8 18C14 10 16 6 18 5c2 2 0 6-4 10")],
    ["tijeras", "Tijeras", "#6a6a6a", S("M7 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM9 8l9-4M9 16l9 4")],
    ["balon", "Balón", "#c43a3a", S("M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8l3 2-1 4h-4L9 10z")],
    ["trofeo", "Trofeo", "#c9a227", S("M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v2a3 3 0 0 0 3 3M16 6h3v2a3 3 0 0 1-3 3M12 13v3M9 20h6")],
    ["medalla", "Medalla", "#c47a2c", S("M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM9 13l-2 7 5-2 5 2-2-7")],
    ["bandera", "Bandera", "#c43a3a", S("M6 21V4M6 4h10l-2 3 2 3H6")],
    ["corazon", "Corazón", "#c43a4a", S("M12 19s-7-4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5-7 9-7 9z")],
    ["estrella", "Estrella", "#c9a227", S("M12 3l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z")],
    ["globo", "Globo", "#c43a6a", S("M12 4a6 6 0 0 1 2 12H10A6 6 0 0 1 12 4zM12 16v4M10 20h4")],
    ["sombrilla", "Sombrilla", "#c45a2a", S("M4 12a8 8 0 0 1 16 0H4zM12 12v8")],
    ["gafas", "Gafas", "#3a3a4a", S("M3 10h6v4a2 2 0 0 1-4 0M15 10h6v4a2 2 0 0 1-4 0M9 12h6")],
    ["reloj2", "Alarma", "#c45a2a", S("M7 5l-2-2M17 5l2-2M6 20h12M8 9a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM12 9v2")],
    ["pastel", "Pastel", "#d27a8a", S("M5 14h14v5H5zM5 14c1-3 3-4 7-4s6 1 7 4M12 10V7M12 7l2-2")],
    ["copa", "Copa", "#c9a227", S("M8 4h8l-1 7a3 3 0 0 1-6 0zM12 14v4M9 20h6")],
    ["taza", "Taza", "#6b4a32", S("M6 8h10v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4zM16 10h2a2 2 0 0 1 0 4h-2")],
    ["huevo", "Huevo", "#c4923a", S("M12 4c4 3 5 7 5 10a5 5 0 0 1-10 0c0-3 1-7 5-10z")],
    ["queso", "Queso", "#c9a227", S("M4 18l8-12 8 12zM10 14h.1M13 16h.1")],
    ["pollo", "Pollo", "#c47a2c", S("M8 16c0-5 2-8 6-8 2 0 4 2 4 4 2 1 2 4 0 5-2 3-6 4-10-1zM7 16h.1")],
    ["ensalada", "Ensalada", "#2f8a4a", S("M5 14h14v3a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM8 14c0-4 8-4 8 0")],
    ["bus2", "Buseta", "#2f6a9a", S("M5 6h14v9H5zM5 15v3h2v-3M17 18v-3h2v3M5 11h14")],
    ["moto", "Moto", "#c43a3a", S("M7 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 14h6l3-5h3")],
    ["camion", "Camión", "#4a5a6a", S("M3 8h10v8H3zM13 11h4l3 3v2h-7M6 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM16 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z")],
    ["hospital", "Hospital", "#c43a4a", S("M5 20V6h14v14M12 9v6M9 12h6")],
    ["escuela", "Escuela", "#3a5a9a", S("M4 20V9l8-5 8 5v11M10 20v-6h4v6")],
    ["tienda", "Tienda", "#c47a2c", S("M4 10l2-5h12l2 5M5 10v9h14v-9M10 19v-5h4v5")],
    ["banco2", "Cajero", "#3a6a5a", S("M6 4h12v16H6zM9 8h6M9 12h6M9 16h3")],
    ["impuesto2", "Recibo", "#6a5a3a", S("M7 3h10v18l-2-1-2 1-2-1-2 1-2-1V3zM10 8h4M10 12h4")],
    ["bebe2", "Pañales", "#d27a8a", S("M7 8h10v8a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4zM9 8V6h6v2")],
    ["abuelo", "Abuelos", "#6a5a4a", S("M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 19c.4-3 2-4 3-4s2.6 1 3 4M13 19c.4-3 2-4 3-4s2.6 1 3 4")],
    ["iglesia2", "Templo", "#6a5a8a", S("M12 3v3M10 5h4M7 21V11l5-4 5 4v10M11 21v-4h2v4")],
    ["playa2", "Mar", "#2f9aaa", S("M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M4 12c2-2 4-2 6 0")],
    ["montana2", "Campo", "#4a6a3a", S("M3 18l5-8 3 4 3-5 7 9zM16 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z")],
    ["carpa", "Carpa", "#2f8a4a", S("M4 18l8-12 8 12zM12 6v12")],
    ["pescado2", "Pesca", "#2f6a9a", S("M3 12c4-3 8-3 11 0-3 3-7 3-11 0zM14 12h6M8 12h.1")],
    ["ancla", "Ancla", "#2f4a6a", S("M12 4v14M8 8h8M12 18a5 5 0 0 1-5-5M12 18a5 5 0 0 0 5-5")],
    ["faro", "Faro", "#c47a2c", S("M10 21V10h4v11M8 10h8L12 4zM9 6h6")],
    ["isla", "Isla", "#2f8a6a", S("M4 16c2-4 6-6 8-6s6 2 8 6M12 10V6M10 8h4")],
    ["ola", "Ola", "#2f8fad", S("M3 14c2-2 3-2 5 0s3 2 5 0 3-2 5 0M3 18c2-2 3-2 5 0s3 2 5 0 3-2 5 0")],
    ["nube", "Nube", "#6a7a8a", S("M7 17h10a4 4 0 0 0 0-8 5 5 0 0 0-9-1 3 3 0 0 0-1 9z")],
    ["viento", "Viento", "#6a8aaa", S("M4 8h10a3 3 0 1 0-3-3M4 12h14a3 3 0 1 1-3 3M4 16h8")],
    ["rayo", "Rayo", "#c9a227", S("M13 3L6 13h6l-1 8 7-10h-6z")],
    ["arcoiris", "Arcoíris", "#c45a8a", S("M5 17a7 7 0 0 1 14 0M8 17a4 4 0 0 1 8 0")],
    ["hoja", "Hoja", "#2f8a4a", S("M5 19C14 19 20 12 20 5 12 6 5 12 5 19zM5 19c4-4 8-7 12-9")],
    ["cactus", "Cactus", "#3a8a4a", S("M10 21V8a2 2 0 0 1 4 0v13M10 12H7v3M14 14h3v3")],
    ["semilla", "Semilla", "#6a8a3a", S("M12 21V11M12 14c-3 0-5-2-5-5 4 0 6 2 5 5zM12 14c3 0 5-2 5-5-4 0-6 2-5 5z")],
    ["trigo", "Trigo", "#c9a227", S("M12 21V6M12 8c-2-1-3-3-2-4M12 11c2-1 3-3 2-4M12 14c-2-1-3-3-2-4")],
    ["manzana", "Manzana", "#c43a3a", S("M12 8c-3 0-5 3-5 6a5 5 0 0 0 10 0c0-3-2-6-5-6zM12 8c1-2 3-3 4-2")],
    ["uva", "Uva", "#6a3a8a", S("M9 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM15 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8V4")],
    ["limon", "Limón", "#c9a227", S("M8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM12 8v8M8 12h8")],
    ["zanahoria", "Zanahoria", "#c45a2a", S("M8 10l4 11 4-11M10 6c1 2 3 2 4 0M12 6V3")],
    ["tomate", "Tomate", "#c43a3a", S("M8 12a4 4 0 1 0 8 0c0-3-2-4-4-4s-4 1-4 4zM10 8c1-2 3-2 4 0")],
    ["pan2", "Pan", "#c4923a", S("M6 14c0-4 3-6 6-6s6 2 6 6v3H6z")],
    ["galleta", "Galleta", "#c47a2c", S("M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM9 11h.1M14 9h.1M13 14h.1")],
    ["donut", "Dona", "#d27a8a", S("M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z")],
    ["hamburguesa", "Hamburguesa", "#c47a2c", S("M5 9h14a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4zM5 12h14M5 15h14v2H5z")],
    ["taco", "Taco", "#c9a227", S("M4 10c0 5 4 8 8 8s8-3 8-8H4zM7 10c1 2 9 2 10 0")],
    ["sopa", "Sopa", "#c45a2a", S("M5 10h14v2a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6zM8 6c.4 1 .4 2 0 3M12 6c.4 1 .4 2 0 3")],
    ["cubiertos", "Cubiertos", "#6a6a6a", S("M8 4v7a2 2 0 0 0 2 2V20M8 4v4M10 4v4M16 4c2 2 2 5 0 7v9")],
    ["botella", "Botella", "#2f8a6a", S("M10 3h4v3l2 3v12H8V9l2-3z")],
    ["vaso", "Vaso", "#3a8aaa", S("M8 4h8l-1 14H9zM8 8h8")],
    ["cerveza", "Cerveza", "#c9a227", S("M7 8h8v10a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3zM15 10h2a2 2 0 0 1 0 4h-2M9 5c.4 1 .4 2 0 3")],
    ["vino", "Vino", "#6a2a4a", S("M8 4h8l-1 6a3 3 0 0 1-6 0zM12 13v5M9 20h6")],
    ["pastel2", "Torta", "#d27a6a", S("M5 12h14v7H5zM5 12c0-3 3-5 7-5s7 2 7 5M12 7V4")],
    ["caramelo", "Caramelo", "#c43a6a", S("M9 9h6v6H9zM9 12H5l2-2M15 12h4l-2 2M12 9V5l2 2M12 15v4l-2-2")],
    ["paleta", "Paleta", "#3a6ad0", S("M8 12a4 4 0 1 1 6 3v4h-3v-4a4 4 0 0 1-3-3z")],
    ["osito", "Osito", "#c47a3a", S("M8 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 18a5 5 0 1 0 0-10 5 5 0 0 0 0 10z")],
    ["conejo", "Conejo", "#c48a9a", S("M9 11a3 3 0 1 0 6 0c0-2-1-7-3-7s-3 5-3 7zM8 4c0 3 1 4 1 4M16 4c0 3-1 4-1 4")],
    ["pajaro", "Pájaro", "#3a7a9a", S("M4 13c4-1 6-4 8-7 1 3 4 5 8 5-2 1-3 3-3 5-3-1-6-1-8 0 0-2-2-3-5-3z")],
    ["pez", "Pez", "#2f8fad", S("M3 12c4-4 9-4 13 0-4 4-9 4-13 0zM16 12h5l-2-3M8 12h.1")],
    ["huella", "Huella", "#6a5a4a", S("M12 20c-2 0-3-2-2-4 1-1 3-1 4 0 1 2 0 4-2 4zM8 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z")],
    ["hueso", "Hueso", "#c4b4a0", S("M7 9a2 2 0 1 0 2 3l6 2a2 2 0 1 0 1-2l-6-2a2 2 0 0 0-3-1z")],
    ["corona", "Corona", "#c9a227", S("M4 16l2-8 4 4 2-6 2 6 4-4 2 8z")],
    ["anillo", "Anillo", "#c9a227", S("M12 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 6l1-3h-2z")],
    ["diamante", "Diamante", "#3a8aaa", S("M3 9h18l-9 11zM3 9l4-4h10l4 4M8 9l4 11 4-11")],
    ["bolsa", "Bolsa", "#8a6a42", S("M7 8h10l1 12H6zM9 8V6a3 3 0 0 1 6 0v2")],
    ["etiqueta", "Etiqueta", "#c45a4a", S("M4 12l8-8h7v7l-8 8zM16 8h.1")],
    ["ticket", "Ticket", "#c47a2c", S("M4 8h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4z")],
    ["porcentaje", "Descuento", "#c43a3a", S("M7 17L17 7M8 8h.1M16 16h.1")],
    ["grafica", "Gráfica", "#2f6a9a", S("M5 19V5M5 19h14M8 15l3-4 3 2 4-6")],
    ["calculadora", "Calculadora", "#4a4a4a", S("M7 3h10v18H7zM9 7h6M9 11h2M13 11h2M9 15h2M13 15h2")],
    ["clip", "Clip", "#6a6a6a", S("M9 8v8a3 3 0 0 0 6 0V7a2 2 0 0 0-4 0v8")],
    ["carpeta", "Carpeta", "#c9a227", S("M4 7h6l2 2h8v9H4z")],
    ["nota", "Nota", "#c9a227", S("M7 4h8l3 3v13H7zM15 4v4h4M9 12h6M9 16h4")],
    ["lapiz", "Lápiz", "#3a6ad0", S("M4 20l4-1 11-11-3-3L5 16zM14 6l3 3")],
    ["pin", "Pin", "#c43a4a", S("M12 21V12M9 4h6l-1 5h3l-5 6-5-6h3z")],
    ["chinche", "Chinche", "#c43a3a", S("M8 8h8l-1 5H9zM12 13v7M9 8 8 4M15 8l1-4")],
    ["regla", "Regla", "#c9a227", S("M4 15l10-10 6 6-10 10zM8 11l2 2M11 8l2 2")],
    ["compas", "Compás", "#3a4a6a", S("M12 4v3M8 20l4-13 4 13M9 16h6")],
    ["atomo", "Átomo", "#3a6ad0", S("M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 5c4 0 7 3 7 7M5 12c0-4 3-7 7-7M8 19c3 2 8 1 10-3")],
    ["planeta", "Planeta", "#3a6a9a", S("M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM5 13c4 2 10 2 14 0")],
    ["cohete", "Cohete", "#c43a4a", S("M12 3c3 3 4 7 4 10l-4 3-4-3c0-3 1-7 4-10zM10 16l-2 4M14 16l2 4")],
    ["satelite", "Satélite", "#4a5a6a", S("M8 14l6-6 3 3-6 6zM14 8l3-3M5 19l4-4")],
    ["wifi", "Wifi", "#3a6ad0", S("M5 10a10 10 0 0 1 14 0M8 13a6 6 0 0 1 8 0M12 17h.1")],
    ["bluetooth", "Bluetooth", "#3a6ad0", S("M8 7l8 10-4 3V4l4 3L8 17")],
    ["codigo", "Código", "#3a4a6a", S("M9 8L5 12l4 4M15 8l4 4-4 4M13 6l-2 12")],
    ["robot", "Robot", "#4a5a6a", S("M8 9h8v8H8zM12 9V6M9 13h.1M15 13h.1M10 16h4")],
    ["engranaje", "Engranaje", "#6a6a6a", S("M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 4v2M12 18v2M4 12h2M18 12h2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18")],
    ["imán", "Imán", "#c43a3a", S("M7 4v8a5 5 0 0 0 10 0V4M7 4h3v5H7zM14 4h3v5h-3")],
    ["termometro", "Termómetro", "#c43a3a", S("M10 14V6a2 2 0 0 1 4 0v8a3 3 0 1 1-4 0z")],
    ["jeringa", "Jeringa", "#3a8aaa", S("M14 4l4 4M8 14l6-6 3 3-6 6zM6 18l3-3M5 15l4 4")],
    ["pastilla", "Pastilla", "#c43a6a", S("M6 12a4 4 0 0 1 4-4h4a4 4 0 0 1 0 8h-4a4 4 0 0 1-4-4zM12 8v8")],
    ["vendas", "Vendas", "#c48a8a", S("M5 12h6l2-3 2 6 2-3h2")],
    ["silla", "Silla", "#6a5a4a", S("M7 11h10v4H7zM8 15v4M16 15v4M8 11V6h8v5")],
    ["cama", "Cama", "#6a5a8a", S("M4 16V10h6a3 3 0 0 1 6 0h4v6M4 16h16v3H4z")],
    ["ducha", "Ducha", "#3a8aaa", S("M8 4h8v3H8zM12 7v3M8 14c.4 2 .4 3 0 4M12 14c.4 2 .4 3 0 4M16 14c.4 2 .4 3 0 4")],
    ["inodoro", "Baño", "#6a8aaa", S("M8 4h8v6a4 4 0 0 1-8 0zM9 14h6v4H9z")],
    ["escoba", "Escoba", "#8a6a42", S("M12 3v10M8 13h8l-1 7H9z")],
    ["cubo", "Cubo", "#3a6a9a", S("M12 4l7 4v8l-7 4-7-4V8zM12 12l7-4M12 12v8M12 12L5 8")],
    ["llanta", "Llanta", "#3a3a3a", S("M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z")],
    ["semaforo", "Semáforo", "#3a3a3a", S("M9 3h6v18H9zM12 7h.1M12 12h.1M12 17h.1")],
    ["puente", "Puente", "#5a6a7a", S("M4 16h16M6 16V10h4v6M14 16V10h4v6M4 10c4-4 12-4 16 0")],
    ["edificio", "Edificio", "#4a5a6a", S("M6 20V6h8v14M14 10h4v10M8 9h2M8 13h2M8 17h2")],
    ["globo2", "Mundo", "#2f6a9a", S("M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM4 12h16M12 4c2 3 2 9 0 12M12 4c-2 3-2 9 0 12")],
    ["bandera2", "Meta", "#c43a3a", S("M6 20V4M6 4h9l-2 3 2 3H6")],
    ["paraguas", "Paraguas", "#3a6ad0", S("M4 12a8 8 0 0 1 16 0H4zM12 12v7a2 2 0 0 0 2 2")],
    ["nieve2", "Invierno", "#6a8aaa", S("M12 3v18M5 7l14 10M19 7 5 17")],
    ["sol2", "Verano", "#c9a227", S("M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 3v2M12 19v2M4 12h2M18 12h2")],
    ["flor", "Flor", "#c45a8a", S("M12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 5v2M12 17v2M5 12h2M17 12h2M12 20v-3")],
    ["arbol2", "Bosque", "#2f6a3a", S("M12 20v-4M7 16h10L12 6zM9 12h6L12 5")],
    ["montaña3", "Cerro", "#5a6a5a", S("M3 18l6-9 3 4 2-3 7 8z")],
    ["rio", "Río", "#2f8fad", S("M3 9c3 2 5 2 8 0s5-2 8 0M3 14c3 2 5 2 8 0s5-2 8 0")],
    ["cascada", "Cascada", "#3a8aaa", S("M6 4h12M8 4v8M12 4v12M16 4v8M5 16c2 2 4 2 7 0s5-2 7 0")],
    ["volcan", "Volcán", "#c43a2a", S("M4 18l6-8h4l6 8zM12 10V6M10 6l2-3 2 3")],
    ["desierto", "Desierto", "#c9a24a", S("M3 16c3-4 5-4 8 0s5 4 8 0M16 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z")],
    ["iglu", "Iglú", "#8aa4b4", S("M5 16a7 7 0 0 1 14 0H5zM11 16v-4h2v4")],
    ["castillo", "Castillo", "#6a5a4a", S("M5 20V8h3v3h3V8h2v3h3V8h3v12z")],
    ["puerta", "Puerta", "#6a4a2a", S("M7 20V6h10v14M12 13h.1")],
    ["ventana", "Ventana", "#3a6a9a", S("M5 5h14v14H5zM12 5v14M5 12h14")],
    ["techo", "Techo", "#8a4a3a", S("M3 12l9-7 9 7M6 12v7h12v-7")],
    ["chimenea", "Chimenea", "#6a4a3a", S("M8 20V10h8v10M10 10V6h2M14 8c1-2 2-2 2 0")],
    ["sofa", "Sofá", "#6a4a6a", S("M4 12V9h3a3 3 0 0 1 6 0h3a3 3 0 0 1 3 3v4H4zM4 16v3M20 16v3")],
    ["lampara", "Lámpara", "#c9a227", S("M9 10h6l2 4H7zM12 4v6M10 18h4M12 14v4")],
    ["reloj3", "Despertador", "#c45a2a", S("M8 7l-2-2M16 7l2-2M7 18h10M9 10a3 3 0 1 0 6 0 3 3 0 0 0-6 0z")],
    ["libro3", "Cuaderno", "#3a5a9a", S("M6 5h8a3 3 0 0 1 3 3v11H9a3 3 0 0 0-3 3z")],
    ["mochila", "Mochila", "#c47a2c", S("M8 8h8v12H8zM10 8V6h4v2M10 12h4")],
    ["billetera", "Billetera", "#6a4a2a", S("M4 8h16v10H4zM4 12h16M14 12v2")],
    ["moneda", "Moneda", "#c9a227", S("M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 9v6M10 11h3a1 1 0 0 1 0 2h-2")],
    ["recibo2", "Recibo", "#6a5a3a", S("M7 3h10v18l-2-1-2 1-2-1-2 1V3z")],
    ["sobre", "Sobre", "#3a6ad0", S("M4 7h16v10H4zM4 7l8 6 8-6")],
    ["megafono", "Megáfono", "#c45a2a", S("M4 10v4h3l8 4V6L7 10zM18 10a3 3 0 0 1 0 4")],
    ["micro2", "Radio", "#6a3a6a", S("M8 16a3 3 0 0 1 3-3h1V6l6-2v8")],
    ["auriculares", "Cascos", "#3a4a6a", S("M5 13a7 7 0 0 1 14 0v4h-4v-4H5z")],
    ["control", "Control", "#5a4ad0", S("M6 10h12a3 3 0 0 1 3 3v2H3v-2a3 3 0 0 1 3-3zM8 13h2M15 13h.1")],
    ["dado", "Dado", "#c43a3a", S("M6 6h12v12H6zM9 9h.1M15 9h.1M12 12h.1M9 15h.1M15 15h.1")],
    ["puzzle", "Puzzle", "#2f8a6a", S("M8 8h4v2a2 2 0 0 0 0 4v2H8v-3a2 2 0 0 1 0-4z")],
    ["cometa", "Cometa", "#3a6ad0", S("M14 6l4 4-8 8-4-4zM6 18l-2 2M10 14l2 2")],
    ["avion2", "Avioneta", "#2f6a9a", S("M2 13l20-5-7 4 2 6-3-4-5 3z")],
    ["helicoptero", "Helicóptero", "#4a5a6a", S("M4 8h16M12 8v3M7 11h10v4H7zM7 15l-3 3M17 15l2 3")],
    ["barco2", "Velero", "#2f6a9a", S("M4 16l2 4h12l2-4H4zM12 16V4l6 6")],
    ["submarino", "Submarino", "#2a4a6a", S("M4 13h12a4 4 0 0 1 0 0H4a3 3 0 0 1 0-4h8M16 11h4M8 9V6")],
    ["cohete2", "Nave", "#c43a4a", S("M12 3c4 4 4 8 4 11H8c0-3 0-7 4-11zM10 18l-2 3M14 18l2 3")],
    ["alien", "Alien", "#2f8a4a", S("M8 12a4 4 0 0 1 8 0v3H8zM10 12h.1M14 12h.1M9 4c0 2 1 3 1 3M15 4c0 2-1 3-1 3")],
    ["fantasma", "Fantasma", "#6a6a8a", S("M7 11a5 5 0 0 1 10 0v8l-2-2-2 2-2-2-2 2-2-2zM10 12h.1M14 12h.1")],
    ["calavera", "Calavera", "#6a6a6a", S("M12 5a6 6 0 0 0-4 10v3h8v-3a6 6 0 0 0-4-10zM10 11h.1M14 11h.1")],
    ["mascara", "Máscara", "#c45a2a", S("M5 10c2-4 12-4 14 0v3c-2 3-12 3-14 0zM9 12h.1M15 12h.1")],
    ["sombrero", "Sombrero", "#3a3a4a", S("M8 12a4 4 0 0 1 8 0M4 14h16l-2 3H6z")],
    ["zapato2", "Bota", "#5a4638", S("M4 15h12l3 3v2H4zM8 15V9h4v6")],
    ["camisa", "Camisa", "#3a6a9a", S("M8 6l4 3 4-3 3 3-2 11H7L5 9z")],
    ["vestido", "Vestido", "#c45a8a", S("M9 5l3 3 3-3 3 4-2 11H8L6 9z")],
    ["relojpulso", "Reloj de pulso", "#3a4a6a", S("M9 8h6v8H9zM10 8V5h4v3M10 16v3h4v-3")],
    ["gafasol", "Gafas de sol", "#3a3a4a", S("M3 10h7v3a2 2 0 0 1-4 0M14 10h7v3a2 2 0 0 1-4 0M10 12h4")],
    ["perfume", "Perfume", "#8a4a7a", S("M10 8h4v3h2v9H8V11h2zM11 4h2v4")],
    ["labial", "Labial", "#c43a4a", S("M10 12V6h4v6M9 12h6v7H9z")],
    ["peine", "Peine", "#6a5a4a", S("M5 8h14v3H5zM7 11v5M10 11v5M13 11v5M16 11v5")],
    ["jabon", "Jabón", "#3a9aaa", S("M7 9h10v7H7zM9 9V7h6v2")],
    ["toalla", "Toalla", "#3a8aaa", S("M7 6h10v12H7zM7 9h10")],
    ["canasta", "Canasta", "#c47a2c", S("M6 10h12l-1 8H7zM9 10l1-4h4l1 4")],
    ["reciclaje", "Reciclaje", "#2f8a4a", S("M12 6l3 3H9zM7 15l2 4 4-2M17 15l-2 4-4-2")],
    ["basura", "Basura", "#5a6a5a", S("M6 8h12l-1 11H7zM9 8V6h6v2M8 8h8")],
    ["planta", "Planta", "#2f7a3a", S("M12 20V11M12 13c-3-1-5-4-3-6 3 1 4 3 3 6zM12 13c3-1 5-4 3-6-3 1-4 3-3 6z")],
    ["regadera", "Regadera", "#3a8a6a", S("M6 14h8a3 3 0 0 0 3-3V8M14 8h4M16 6v4M8 8V5")],
    ["pala", "Pala", "#6a5a4a", S("M10 20l2-8 4 2-2 6zM12 12L8 4")],
    ["hacha", "Hacha", "#6a4a3a", S("M12 20V8M12 8h5l-1 4zM8 6h4")],
    ["sierra", "Sierra", "#6a6a6a", S("M4 14l2-2 2 2 2-2 2 2 2-2 2 2 2-2M6 12V8h12v4")],
    ["taladro", "Taladro", "#c45a2a", S("M8 14h6v4H8zM10 14V8h4l2 3v3M8 10H6")],
    ["casco", "Casco", "#c9a227", S("M6 14a6 6 0 0 1 12 0v2H6zM8 16h8")],
    ["guante", "Guante", "#c47a3a", S("M8 12V7M11 12V5M14 12V6M17 13v-4M7 12h11v5a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z")],
    ["balon2", "Baloncesto", "#c45a2a", S("M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM5 12h14M12 5c2 3 2 11 0 14")],
    ["raqueta", "Raqueta", "#2f8a4a", S("M9 6h4a4 4 0 0 1 0 8H9zM11 14l-2 6")],
    ["piscina", "Piscina", "#2f8fad", S("M4 16c2-2 3-2 5 0s3 2 5 0 3-2 5 0M8 8V5M8 8h3")],
    ["bicicleta2", "Bici", "#2f6a4a", S("M7 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 14l4-6h4")],
    ["patin", "Patín", "#3a6ad0", S("M6 12h10l2 3H8zM7 15v2M15 15v2M8 12V8")],
    ["ski", "Esquí", "#3a6a9a", S("M8 4l2 10-6 6M14 6l2 8 4 4M10 8h4")],
    ["carpa2", "Camping", "#2f8a4a", S("M4 18L12 6l8 12zM12 6v12M9 18h6")],
    ["brujula2", "Norte", "#c43a3a", S("M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 7l2 5-5 2z")],
    ["mapa2", "Ruta", "#2f8a5a", S("M8 5l-4 2v12l4-2 8 2 4-2V5l-4 2zM8 5v12M16 7v12")],
    ["gas", "Gas", "#c45a2a", S("M7 20V6h6v14M7 10h6M15 8l3 2v6a2 2 0 0 1-2 2")],
    ["llave2", "Cerrajería", "#c9a227", S("M8 14a4 4 0 1 1 2-7l9 2v3h-3v2h-2")],
    ["alarma2", "Sirena", "#c43a3a", S("M6 15h12v3H6zM8 15a4 4 0 0 1 8 0M12 6V4")],
    ["extintor", "Extintor", "#c43a3a", S("M10 8h4v11h-4zM12 8V5M9 5h4M8 11h2")],
    ["botiquin", "Botiquín", "#c43a4a", S("M6 8h12v10H6zM9 8V6h6v2M12 11v4M10 13h4")],
    ["corazon2", "Amor", "#c43a6a", S("M12 18s-6-4-6-8a3 3 0 0 1 6-1 3 3 0 0 1 6 1c0 4-6 8-6 8z")],
    ["regalo3", "Sorpresa", "#c43a8a", S("M5 10h14v8H5zM5 10V8h14v2M12 8v10M12 8c-2-2-4-1-3 0M12 8c2-2 4-1 3 0")],
    ["globo3", "Fiesta", "#c45a8a", S("M12 5a5 5 0 0 1 2 10h-4A5 5 0 0 1 12 5zM12 15v4")],
    ["torta2", "Cumple", "#d27a8a", S("M5 13h14v6H5zM5 13c1-3 4-4 7-4s6 1 7 4M12 9V6")],
    ["cafe2", "Capuchino", "#6b4a32", S("M7 9h9v5a4 4 0 0 1-4 4H10a3 3 0 0 1-3-4zM16 11h2a2 2 0 0 1 0 4h-2M9 5c.4 1 .4 2 0 3")],
    ["te", "Té", "#2f8a4a", S("M7 9h8v6a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3zM15 11h2a2 2 0 0 1 0 3h-2M8 6c1 1 2 1 2 0")],
    ["helado2", "Cono", "#d27a9a", S("M9 10h6l-3 9zM9 10a3 3 0 0 1 6 0")],
    ["palomitas", "Palomitas", "#c9a227", S("M8 10h8l-1 9H9zM9 10c0-2 2-3 2-1M13 10c0-2 2-3 2-1")],
    ["pizza2", "Porción", "#c45a2a", S("M12 4l8 14H4zM12 9v5")],
    ["sushi", "Sushi", "#c43a4a", S("M5 12h14v4H5zM7 12c1-3 3-4 5-4s4 1 5 4")],
    ["fideos", "Fideos", "#c9a227", S("M7 8c2 2 2 6 0 8M12 8c2 2 2 6 0 8M17 8c2 2 2 6 0 8")],
    ["huevo2", "Huevos", "#c4923a", S("M9 18c0-5 1-10 3-10s3 5 3 10a3 3 0 0 1-6 0z")],
    ["leche", "Leche", "#6a8aaa", S("M8 8h8v12H8zM9 8l1-4h4l1 4")],
    ["pan3", "Baguette", "#c4923a", S("M6 15c2-6 10-8 14-4-4 2-8 2-14 4z")],
    ["miel", "Miel", "#c9a227", S("M9 8h6v4a3 3 0 0 1-6 0zM10 8V5h4v3M12 15v4")],
    ["nuez", "Nuez", "#6a4a2a", S("M12 18c-3 0-5-3-5-6s2-6 5-6 5 3 5 6-2 6-5 6zM12 6v12")],
  ];

  const byId = Object.fromEntries(ICONS.map((row) => [row[0], row]));

  function noteId() {
    return window.Bloc?.state?.openId || "";
  }

  function forNote(id) {
    const note = id || noteId();
    return (data.events || []).filter((item) => item.note === note);
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "null");
      if (data && Array.isArray(data.events)) return data;
    } catch (e) {}
    return { showNames: false, custom: [], events: [] };
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  let data = load();
  let openCat = null;
  let pickedIcon = "";

  function glyph(id) {
    const row = byId[id] || byId.compras;
    return `<span class="spend-glyph" style="color:${row[2]}">${row[3]}</span>`;
  }

  function viewMode() {
    if (data.showIcon === false && data.showName !== true) data.showIcon = true;
    return { icon: data.showIcon !== false, name: data.showName === true };
  }

  function paintViewChecks() {
    const mode = viewMode();
    const icon = document.getElementById("cat-show-icon");
    const name = document.getElementById("cat-show-name");
    if (icon) icon.checked = mode.icon;
    if (name) name.checked = mode.name;
    const split = document.getElementById("cat-split-totals");
    if (split) split.checked = data.splitTotals === true;
    return mode;
  }
  function nameOf(id, fallback) {
    return data.catNames?.[id] || fallback;
  }

  function iconKey(id, fallback) {
    return data.catIcons?.[id] || fallback;
  }

  function cats() {
    const custom = (data.custom || []).map((item) => [iconKey(item.id, item.icon), nameOf(item.id, item.name), item.id]);
    let list = ICONS.map((row) => [iconKey(row[0], row[0]), nameOf(row[0], row[1]), row[0]]).concat(custom);
    if (Array.isArray(data.catOrder) && data.catOrder.length) {
      const rank = new Map(data.catOrder.map((id, index) => [id, index]));
      list = list.slice().sort((a, b) => (rank.get(a[2]) ?? 9999) - (rank.get(b[2]) ?? 9999));
    }
    return list;
  }

  function renderRail() {
    document.body.classList.toggle("spend-names", data.showNames === true);
    const box = document.getElementById("spend-icons");
    const names = document.getElementById("spend-show-names");
    if (names) names.checked = data.showNames === true;
    if (!box) return;
    const here = forNote();
    const buttons = cats().map(([icon, name, id]) => {
      const count = here.filter((item) => item.cat === id).length;
      const badge = count ? `<i class="spend-count">${count}</i>` : "";
      return `<button type="button" class="spend-ico" data-spend="${id}" data-icon="${icon}">${glyph(icon)}${badge}<b>${name}</b></button>`;
    }).join("");
    box.innerHTML = `${buttons}<button type="button" class="spend-ico" data-spend="custom">${glyph("herramientas")}<b>Personalizado</b></button>`;
  }

  function money(n) {
    return Number(n || 0).toLocaleString("es-CO");
  }

  function openEvents(id) {
    openCat = id;
    const cat = cats().find((row) => row[2] === id);
    const modal = document.getElementById("spend-events-modal");
    const heading = document.getElementById("spend-events-heading");
    if (heading) heading.textContent = cat ? cat[1] : "Gastos";
    const list = forNote().filter((item) => item.cat === id);
    const total = list.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalEl = document.getElementById("spend-events-total");
    if (totalEl) totalEl.textContent = list.length ? `Total ${money(total)}` : "Todavía no hay gastos";
    const ul = document.getElementById("spend-events-list");
    if (ul) {
      ul.innerHTML = list.map((item) => (
        `<li><span>${item.name}</span><strong>${money(item.amount)}</strong><button type="button" data-drop="${item.id}" aria-label="Quitar">✕</button></li>`
      )).join("");
    }
    if (modal) modal.hidden = false;
  }

  function openCustom() {
    pickedIcon = "";
    const name = document.getElementById("spend-custom-name");
    if (name) name.value = "";
    const box = document.getElementById("spend-custom-icons");
    if (box) {
      box.innerHTML = ICONS.map((row) => (
        `<button type="button" data-pick="${row[0]}" aria-label="${row[1]}" aria-pressed="false">${glyph(row[0])}</button>`
      )).join("");
    }
    const modal = document.getElementById("spend-custom-modal");
    if (modal) modal.hidden = false;
  }

  document.getElementById("spend-show-names")?.addEventListener("change", (e) => {
    data.showNames = e.target.checked;
    save(data);
    renderRail();
  });

  document.getElementById("spend-icons")?.addEventListener("click", (e) => {
    const button = e.target.closest("[data-spend]");
    if (!button) return;
    if (button.dataset.spend === "custom") openCustom();
    else openEvents(button.dataset.spend);
  });

  document.getElementById("spend-events-close")?.addEventListener("click", () => {
    document.getElementById("spend-events-modal").hidden = true;
  });
  document.getElementById("spend-events-modal")?.addEventListener("pointerdown", (e) => {
    if (e.target.id === "spend-events-modal") e.currentTarget.hidden = true;
  });
  document.getElementById("spend-events-list")?.addEventListener("click", (e) => {
    const id = e.target.closest("[data-drop]")?.dataset.drop;
    if (!id) return;
    data.events = data.events.filter((item) => item.id !== id);
    save(data);
    renderRail();
    openEvents(openCat);
    document.dispatchEvent(new Event("bloc-spend"));
  });
  document.getElementById("spend-event-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!openCat) return;
    const name = document.getElementById("spend-event-name").value.trim();
    const raw = document.getElementById("spend-event-amount").value.replace(/\./g, "").replace(",", ".");
    const amount = Number(raw);
    if (!name || !Number.isFinite(amount)) return;
    const note = noteId();
    if (!note) return;
    data.events.push({ id: `g${Date.now()}`, cat: openCat, note, name, amount, at: Date.now() });
    save(data);
    e.target.reset();
    renderRail();
    openEvents(openCat);
  });

  document.getElementById("spend-custom-close")?.addEventListener("click", () => {
    document.getElementById("spend-custom-modal").hidden = true;
  });
  document.getElementById("spend-custom-modal")?.addEventListener("pointerdown", (e) => {
    if (e.target.id === "spend-custom-modal") e.currentTarget.hidden = true;
  });
  document.getElementById("spend-custom-icons")?.addEventListener("click", (e) => {
    const button = e.target.closest("[data-pick]");
    if (!button) return;
    pickedIcon = button.dataset.pick;
    document.querySelectorAll("#spend-custom-icons button").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
  });
  document.getElementById("spend-custom-save")?.addEventListener("click", () => {
    const name = document.getElementById("spend-custom-name")?.value.trim();
    if (!name || !pickedIcon) return;
    data.custom.push({ id: `c${Date.now()}`, name, icon: pickedIcon });
    save(data);
    document.getElementById("spend-custom-modal").hidden = true;
    renderRail();
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-file], #add-note, #focus-back, [data-template]")) setTimeout(renderRail, 0);
  });

  let pickLine = 0;

  function catStore() {
    try { return JSON.parse(localStorage.getItem("bloc-line-cats") || "{}"); }
    catch (e) { return {}; }
  }

  function bodyLines() {
    const body = document.getElementById("body");
    const box = document.createElement("div");
    box.innerHTML = String(body?.innerHTML || "");
    const lines = [];
    const blocks = [...box.childNodes];
    if (!blocks.some((node) => node.nodeName === "DIV" || node.nodeName === "P")) {
      const holder = document.createElement("div");
      holder.innerHTML = String(body?.innerHTML || "").replace(/<br\s*\/?>/gi, "\n");
      return (holder.textContent || "").split("\n");
    }
    blocks.forEach((node) => {
      if (node.nodeName === "DIV" || node.nodeName === "P") lines.push(node.textContent || "");
      else if (node.nodeName === "BR") lines.push("");
      else if (node.nodeType === 3) {
        node.textContent.split("\n").forEach((bit, index) => {
          if (index === 0 && !lines.length) lines.push(bit);
          else if (index === 0) lines[lines.length - 1] = `${lines[lines.length - 1] || ""}${bit}`;
          else lines.push(bit);
        });
      }
    });
    return lines.length ? lines : [""];
  }

  function placeArrows() {
    const body = document.getElementById("body");
    const host = document.getElementById("line-arrows");
    if (!body || !host) return;
    const line = parseFloat(getComputedStyle(body).lineHeight) || 28;
    const count = Math.max(1, Math.round(body.clientHeight / line));
    const saved = catStore()[noteId()] || {};
    host.style.top = "0px";
    host.innerHTML = Array.from({ length: count }, (_, index) => {
      const cat = saved[String(index)];
      const mode = viewMode();
      document.body.classList.toggle("cat-show-name", mode.name === true);
      const known = cat ? cats().find((row) => row[2] === cat.id) : null;
      const icon = known ? known[0] : (cat?.icon || cat?.id);
      const label = known ? known[1] : cat?.name;
      let mark = "▾";
      if (cat) {
        const bits = [];
        if (mode.name) bits.push(`<b class="line-cat-name">${label}</b>`);
        if (mode.icon) bits.push(glyph(icon));
        mark = bits.join("") || "▾";
      }
      return `<button type="button" class="line-arrow${cat ? " has-cat" : ""}" data-line="${index}" style="top:${index * line}px;height:${line}px" aria-label="Categoría de la línea ${index + 1}">${mark}</button>`;
    }).join("");
  }

  function openLineCats(index) {
    pickLine = index;
    const box = document.getElementById("line-cat-grid");
    paintViewChecks();
    if (box) {
      box.classList.remove("only-icon", "only-name");
      box.innerHTML = cats().map(([icon, name, id]) => (
        `<button type="button" data-cat="${id}" data-icon="${icon}" data-name="${name}">${glyph(icon)}<span>${name}</span></button>`
      )).join("");
    }
    const modal = document.getElementById("line-cat-modal");
    if (modal) modal.hidden = false;
  }

  document.getElementById("line-arrows")?.addEventListener("click", (e) => {
    const button = e.target.closest("[data-line]");
    if (!button) return;
    e.preventDefault();
    e.stopPropagation();
    openLineCats(Number(button.dataset.line));
  });

  document.getElementById("cat-show-icon")?.addEventListener("change", onCatView);
  document.getElementById("cat-show-name")?.addEventListener("change", onCatView);
  document.getElementById("cat-split-totals")?.addEventListener("change", (e) => {
    data.splitTotals = e.target.checked;
    save(data);
    document.dispatchEvent(new Event("bloc-spend"));
  });
  function onCatView(e) {
    const icon = document.getElementById("cat-show-icon");
    const name = document.getElementById("cat-show-name");
    if (!icon.checked && !name.checked) {
      e.target.checked = true;
      return;
    }
    data.showIcon = icon.checked;
    data.showName = name.checked;
    save(data);
    openLineCats(pickLine);
    placeArrows();
  }

  document.getElementById("line-cat-close")?.addEventListener("click", () => {
    document.getElementById("line-cat-modal").hidden = true;
  });
  document.getElementById("line-cat-modal")?.addEventListener("pointerdown", (e) => {
    if (e.target.id === "line-cat-modal") e.currentTarget.hidden = true;
  });
  let menuCat = "";

  function closeCatMenu() {
    const menu = document.getElementById("line-cat-menu");
    if (menu) menu.hidden = true;
  }

  document.getElementById("line-cat-grid")?.addEventListener("contextmenu", (e) => {
    const button = e.target.closest("[data-cat]");
    if (!button) return;
    e.preventDefault();
    menuCat = button.dataset.cat;
    const menu = document.getElementById("line-cat-menu");
    if (!menu) return;
    menu.hidden = false;
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 8) menu.style.left = `${window.innerWidth - rect.width - 8}px`;
    if (rect.bottom > window.innerHeight - 8) menu.style.top = `${window.innerHeight - rect.height - 8}px`;
  });

  document.addEventListener("pointerdown", (e) => {
    const menu = document.getElementById("line-cat-menu");
    if (!menu?.hidden && !menu.contains(e.target)) closeCatMenu();
  });

  document.getElementById("line-cat-menu")?.addEventListener("click", (e) => {
    const action = e.target.closest("[data-cat-action]")?.dataset.catAction;
    if (!action || !menuCat) return;
    closeCatMenu();
    if (action === "icon") {
      const box = document.getElementById("line-icon-grid");
      if (box) {
        box.innerHTML = ICONS.map((row) => (
          `<button type="button" data-pick-icon="${row[0]}" aria-label="${row[1]}">${glyph(row[0])}</button>`
        )).join("");
      }
      document.getElementById("line-icon-modal").hidden = false;
      return;
    }
    if (action === "name") {
      const current = cats().find((row) => row[2] === menuCat);
      const input = document.getElementById("line-name-text");
      if (input) input.value = current ? current[1] : "";
      document.getElementById("line-name-modal").hidden = false;
      input?.focus();
      return;
    }
    const list = cats();
    const index = Math.max(1, list.findIndex((row) => row[2] === menuCat) + 1);
    const input = document.getElementById("line-order-number");
    if (input) {
      input.value = String(index);
      input.max = String(list.length);
    }
    document.getElementById("line-order-modal").hidden = false;
  });

  document.getElementById("line-icon-close")?.addEventListener("click", () => {
    document.getElementById("line-icon-modal").hidden = true;
  });
  document.getElementById("line-icon-grid")?.addEventListener("click", (e) => {
    const icon = e.target.closest("[data-pick-icon]")?.dataset.pickIcon;
    if (!icon || !menuCat) return;
    data.catIcons = data.catIcons || {};
    data.catIcons[menuCat] = icon;
    save(data);
    document.getElementById("line-icon-modal").hidden = true;
    openLineCats(pickLine);
    placeArrows();
  });

  document.getElementById("line-name-close")?.addEventListener("click", () => {
    document.getElementById("line-name-modal").hidden = true;
  });
  document.getElementById("line-name-save")?.addEventListener("click", () => {
    const text = document.getElementById("line-name-text")?.value.trim();
    if (!text || !menuCat) return;
    data.catNames = data.catNames || {};
    data.catNames[menuCat] = text;
    save(data);
    document.getElementById("line-name-modal").hidden = true;
    openLineCats(pickLine);
    placeArrows();
  });

  document.getElementById("line-order-close")?.addEventListener("click", () => {
    document.getElementById("line-order-modal").hidden = true;
  });
  document.getElementById("line-order-save")?.addEventListener("click", () => {
    const list = cats().map((row) => row[2]).filter((id) => id !== menuCat);
    const index = Math.max(0, Math.min(Number(document.getElementById("line-order-number").value) || 1, list.length + 1) - 1);
    list.splice(index, 0, menuCat);
    data.catOrder = list;
    save(data);
    document.getElementById("line-order-modal").hidden = true;
    openLineCats(pickLine);
  });

  document.getElementById("line-cat-custom")?.addEventListener("click", () => {
    document.getElementById("line-cat-modal").hidden = true;
    openCustom();
  });

  document.getElementById("line-cat-reset")?.addEventListener("click", () => {
    const ask = window.Bloc?.confirmTwice;
    if (typeof ask === "function" && !ask(
      "¿Restaurar las categorías?",
      "Segunda confirmación. Vuelven los iconos, el orden y se quitan las personalizadas."
    )) return;
    data.catIcons = {};
    data.catNames = {};
    data.catOrder = [];
    data.custom = [];
    save(data);
    openLineCats(pickLine);
    placeArrows();
  });

  document.getElementById("line-cat-grid")?.addEventListener("click", (e) => {
    const button = e.target.closest("[data-cat]");
    if (!button) return;
    const note = noteId();
    if (!note) return;
    const store = catStore();
    store[note] = store[note] || {};
    store[note][String(pickLine)] = { id: button.dataset.cat, icon: button.dataset.icon, name: button.dataset.name };
    localStorage.setItem("bloc-line-cats", JSON.stringify(store));
    const lines = bodyLines();
    const written = (lines[pickLine] || "").trim();
    document.getElementById("line-cat-modal").hidden = true;
    if (!written) {
      while (lines.length <= pickLine) lines.push("");
      lines[pickLine] = button.dataset.name;
      const body = document.getElementById("body");
      body.innerHTML = lines.map((line) => line
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("<br>");
      body.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      document.getElementById("body")?.dispatchEvent(new Event("input", { bubbles: true }));
    }
    placeArrows();
  });

  document.getElementById("body")?.addEventListener("input", () => setTimeout(placeArrows, 0));
  window.addEventListener("resize", placeArrows);
  setTimeout(placeArrows, 300);

  document.addEventListener("bloc-math", (e) => {
    const note = e.detail?.noteId || "";
    const parts = Array.isArray(e.detail?.parts) ? e.detail.parts : [];
    if (!note) return;
    const names = cats();
    data.events = (data.events || []).filter((item) => !(item.note === note && item.fromNote));
    parts.forEach((part) => {
      const title = String(part.name || "").trim().toLocaleLowerCase("es");
      if (!title || !part.total) return;
      const hit = names
        .filter((row) => title === row[1].toLocaleLowerCase("es") || title.startsWith(`${row[1].toLocaleLowerCase("es")} `))
        .sort((a, b) => b[1].length - a[1].length)[0];
      if (!hit) return;
      data.events.push({
        id: `note-${note}-${hit[2]}`,
        note,
        cat: hit[2],
        name: part.name,
        amount: Math.round(part.total),
        fromNote: true,
        at: Date.now(),
      });
    });
    save(data);
    if (openCat === null || document.getElementById("spend-events-modal")?.hidden) renderRail();
    else {
      renderRail();
      openEvents(openCat);
    }
  });

  renderRail();
})();
