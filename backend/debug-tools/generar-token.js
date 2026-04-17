const jwt = require('jsonwebtoken');

// 🔐 TU LLAVE MAESTRA (Base64 de Supabase)
const JWT_SECRET_BASE64 = "p6HO94SP/ny5Z8Y6kbXPGU/1zpaQcj+rnxCLpUXYqZMs01ohouZShDsIDUH0dx27rmBi8Wr6UUnbT9padmp0zg==";

const payload = {
    role: "authenticated",
    id_usuario: "1",
    aud: "authenticated",
    iss: "supabase", // 🔹 CRÍTICO: Supabase suele validar el issuer
    sub: "00000000-0000-0000-0000-000000000001", // 🔹 Un UUID ficticio (obligatorio para PostgREST)
    app_metadata: { role: "productor" },
    user_metadata: { full_name: "Productor de Pruebas" },
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365)
};

const secret = JWT_SECRET_BASE64.trim();
const token = jwt.sign(payload, secret);

console.log("\n--- COPIA LA SIGUIENTE LÍNEA COMPLETA ---");
process.stdout.write(`$miToken = "${token}"\n`);
console.log("------------------------------------------\n");
