const jwt = require('jsonwebtoken');

// 1. Configuraciones
const JWT_SECRET = "7HX7Z92ua3U6/zXwgc+YUtvg6/yz26jFAjJoPGJ9Bs7EZJSfzR9q/8Wum05aUZC54AYci4ZT78pErnxIITCT1A==".trim();
const BASE_URL = "http://localhost:5000"; // Orquestador

// 2. Datos del Productor Real (ID 1 es asda@gmail.com)
const REAL_UUID = "222f2e7b-4bdc-4a01-8ddf-b92f1f9f4548";
const REAL_ID_INTERNAL = 1;

async function runE2E() {
    console.log("🚀 INICIANDO PRUEBA REDONDA E2E (Sincronización Total) 🚀\n");

    try {
        console.log(`👤 1. Generando Token para Productor ID: ${REAL_ID_INTERNAL}`);

        // Firmar Token de Productor con el claim 'id_usuario' que pide el RLS
        const payloadProd = {
            role: 'authenticated',
            id_usuario: REAL_ID_INTERNAL, 
            sub: REAL_UUID,               
            app_metadata: { role: 'productor' },
            exp: Math.floor(Date.now() / 1000) + 3600
        };
        const token = jwt.sign(payloadProd, JWT_SECRET);
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        const randomId = Math.floor(Math.random() * 1000000);
        const lugarData = { 
            nombre_lugar: `Finca E2E ${randomId}`, 
            area_total_m2: 8500, 
            numero_predial: 1000000 + randomId,
            productor_id: REAL_ID_INTERNAL,
            updated_at: new Date().toISOString()
        };

        // Paso 2: Crear un Lugar de Producción
        console.log("\n🏗️ 2. Creando [Lugar de Producción]...");
        const lugarRes = await fetch(`${BASE_URL}/predios/lugares-produccion`, {
            method: 'POST',
            headers,
            body: JSON.stringify(lugarData)
        }).then(r => r.json());

        if (lugarRes.error) {
            console.error("❌ Error en Predios:", lugarRes);
            throw new Error(lugarRes.message || lugarRes.error);
        }
        
        const id_lugar = lugarRes.id_lugar_produccion;
        console.log(`✅ Lugar creado con éxito -> ID: ${id_lugar}`);

        // Paso 3: Orquestación (Lote + Siembra)
        console.log("\n🌱 3. Ejecutando Combo [Lote + Siembra] (Orquestador)...");
        const orquestadorRes = await fetch(`${BASE_URL}/api/orchestrator/lote-integral`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                id_lugar_produccion: id_lugar,
                nombre_lote: "Lote L-Final",
                area_m2: 500,
                especie: "Café Especial",
                variedad: "Caturra",
                fecha_siembra: new Date().toISOString()
            })
        }).then(r => r.json());

        if (orquestadorRes.error) throw new Error(`Error en Orquestador: ${orquestadorRes.error}`);
        const id_siembra = orquestadorRes.siembra.id_siembra;
        console.log(`✅ Lote Integral creado. Lote: ${orquestadorRes.lote.id_lote} | Siembra: ${id_siembra}`);

        // Paso 4: Finalizar Siembra (Dispara RabbitMQ a Inspecciones)
        console.log("\n⏳ 4. Finalizando Siembra (Disparando Eventos)...");
        const finRes = await fetch(`${BASE_URL}/cultivos/siembras/${id_siembra}/finalizar`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ fecha_fin: new Date().toISOString() })
        }).then(r => r.json());

        if (finRes.error) throw new Error(`Error en Cultivos: ${finRes.error}`);
        console.log("✅ Siembra Finalizada!");

        console.log("\n🎉 PRUEBA REDONDA COMPLETADA CON ÉXITO.");
        console.log("Los microservicios han hablado entre sí correctamente.");

    } catch (e) {
        console.log("\n🔥 FALLO EN EL ÚLTIMO PASO:", e.message);
    }
}

runE2E();
