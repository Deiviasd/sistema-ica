const jwt = require('jsonwebtoken');

// 🔐 LLAVE DE AUTH (ms-auth) - La que valida el Gateway
const JWT_SECRET_BASE64 = "7HX7Z92ua3U6/zXwgc+YUtvg6/yz26jFAjJoPGJ9Bs7EZJSfzR9q/8Wum05aUZC54AYci4ZT78pErnxIITCT1A==";

// 🔹 CONFIGURA EL ROL AQUÍ ("tecnico" o "productor")
const ROLE = "tecnico";

const payload = {
    role: "authenticated",
    id_usuario: ROLE === "tecnico" ? "tech_01" : "2",
    aud: "authenticated",
    iss: "supabase",
    sub: ROLE === "tecnico" ? "0ec0-7ec8-4903-b09e-7195388c76ca" : "0000-0000-0000-0001",
    app_metadata: { role: ROLE },
    user_metadata: { full_name: ROLE === "tecnico" ? "Técnico de Campo ICA" : "Productor de Pruebas" },
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365)
};

const secret = JWT_SECRET_BASE64.trim();
const token = jwt.sign(payload, secret);

console.log("\n--- COPIA LA SIGUIENTE LÍNEA COMPLETA ---");
process.stdout.write(`$miToken = "${token}"\n`);
console.log("------------------------------------------\n");
