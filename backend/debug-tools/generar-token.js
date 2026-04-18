const jwt = require('jsonwebtoken');

// 🔐 LLAVE DE AUTH (ms-auth) - La que valida el Gateway
const JWT_SECRET_BASE64 = "7HX7Z92ua3U6/zXwgc+YUtvg6/yz26jFAjJoPGJ9Bs7EZJSfzR9q/8Wum05aUZC54AYci4ZT78pErnxIITCT1A==";

// 🔹 CONFIGURA EL ROL AQUÍ ("admin", "tecnico" o "productor") vía parámetro
const ROLE = process.argv[2] || "productor";

// Usamos el ID del productor que existía en Supabase en las pruebas anteriores
const uidProductor = "a4176dcc-0672-4d1e-8cb5-1bcbb54070a7"; // El user_id que usaba tu productor original
const uidTecnico = "0ec0-7ec8-4903-b09e-7195388c76ca";
const uidAdmin = "11111111-2222-3333-4444-555555555555"; 

let sub = uidProductor;
if (ROLE === "tecnico") sub = uidTecnico;
if (ROLE === "admin") sub = uidAdmin;

const payload = {
    role: "authenticated",
    id_usuario: ROLE === "tecnico" ? "tech_01" : "2",
    aud: "authenticated",
    iss: "supabase",
    sub: sub,
    app_metadata: { role: ROLE },
    user_metadata: { full_name: `Usuario de pruebas: ${ROLE}` },
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365)
};

const secret = JWT_SECRET_BASE64.trim();
const token = jwt.sign(payload, secret);

console.log("\n--- COPIA LA SIGUIENTE LÍNEA COMPLETA ---");
process.stdout.write(`$miToken = "${token}"\n`);
console.log("------------------------------------------\n");
