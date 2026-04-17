const jwt = require('jsonwebtoken');

// 🔹 PEGA AQUÍ LA LLAVE SECRETA QUE ME PASASTE
const SECRET = "p6HO94SP/ny5Z8Y6kbXPGU/1zpaQcj+rnxCLpUXYqZMs01ohouZShDsIDUH0dx27rmBi8Wr6UUnbT9padmp0zg==";

// 🔹 PEGA AQUÍ LA 'SUPABASE_SERVICE_ROLE_KEY' QUE TIENES EN EL .env DE PREDIOS
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdub2dndGppcHRvaWFsdXB3aWxhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTgxMSwiZXhwIjoyMDkwMDY1ODExfQ.fRLXwpvFT6LmPdfRN_CypqhRcUhgPWe6oEU0Q3XgnLE";

try {
    const secretBuffer = Buffer.from(SECRET.trim(), 'base64');
    const decoded = jwt.verify(SERVICE_KEY, secretBuffer);
    console.log("\n✅ ¡COINCIDENCIA TOTAL! La llave secreta es CORRECTA para este proyecto.");
    console.log("Datos del token oficial:", decoded);
} catch (err) {
    console.error("\n❌ ERROR: La llave secreta NO COINCIDE con la Service Key.");
    console.error("Razón:", err.message);

    // Intento 2: Sin Base64 (por si acaso)
    try {
        jwt.verify(SERVICE_KEY, SECRET.trim());
        console.log("\n⚠️ ¡COINCIDENCIA! Pero ojo: La llave NO ES Base64, es texto plano.");
    } catch (e) {
        console.log("\n❌ Definitivamente la llave secreta no pertenece a este proyecto.");
    }
}
