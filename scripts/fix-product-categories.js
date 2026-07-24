/**
 * Script de REPARACIÓN para productos ya creados en Strapi v5.
 *
 * Corrige dos problemas del seed original:
 * 1. La relación "category" no se conectó (se usó el id numérico en vez
 *    del documentId, que es lo que Strapi v5 espera para relaciones vía REST).
 * 2. El campo "measurement" nunca se envió al crear los productos.
 *
 * No vuelve a descargar ni subir imágenes — solo actualiza (PUT) los
 * productos que ya existen, emparejando por "slug".
 *
 * USO:
 * node scripts/fix-product-categories.js
 */

require("dotenv").config();

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

// Mismo mapeo slug de producto -> slug de categoría + measurement
// que tenía tu script original, extraído de esa misma data.
const productFixes = [
  { slug: "mesa-de-noche-nordica-oslo", category: "mesas-de-noche", measurement: "45cm x 40cm x 60cm" },
  { slug: "mesa-de-noche-moderna-tokio", category: "mesas-de-noche", measurement: "50cm x 40cm x 55cm" },
  { slug: "mesa-de-noche-minimalista-luna", category: "mesas-de-noche", measurement: "40cm x 35cm x 55cm" },
  { slug: "mesa-de-noche-premium-verona", category: "mesas-de-noche", measurement: "50cm x 42cm x 60cm" },
  { slug: "mesa-de-noche-essential", category: "mesas-de-noche", measurement: "45cm x 35cm x 55cm" },

  { slug: "armario-moderno-milan", category: "armarios", measurement: "180cm x 60cm x 200cm" },
  { slug: "armario-premium-viena", category: "armarios", measurement: "200cm x 60cm x 220cm" },
  { slug: "armario-compacto-urban", category: "armarios", measurement: "120cm x 55cm x 190cm" },
  { slug: "armario-oslo-4-puertas", category: "armarios", measurement: "160cm x 60cm x 210cm" },
  { slug: "armario-elite-plus", category: "armarios", measurement: "220cm x 65cm x 230cm" },

  { slug: "mesa-tv-nordica-bergen", category: "mesas-de-tv", measurement: "140cm x 40cm x 55cm" },
  { slug: "mesa-tv-moderna-dubai", category: "mesas-de-tv", measurement: "160cm x 40cm x 60cm" },
  { slug: "mesa-tv-verona-plus", category: "mesas-de-tv", measurement: "180cm x 45cm x 60cm" },
  { slug: "mesa-tv-urban-style", category: "mesas-de-tv", measurement: "120cm x 35cm x 50cm" },
  { slug: "mesa-tv-elite-home", category: "mesas-de-tv", measurement: "200cm x 45cm x 60cm" },

  { slug: "escritorio-ejecutivo-boston", category: "escritorios", measurement: "140cm x 60cm x 75cm" },
  { slug: "escritorio-home-office-oslo", category: "escritorios", measurement: "120cm x 55cm x 75cm" },
  { slug: "escritorio-minimal-urban", category: "escritorios", measurement: "100cm x 50cm x 75cm" },
  { slug: "escritorio-gamer-pro", category: "escritorios", measurement: "160cm x 70cm x 75cm" },
  { slug: "escritorio-premium-tokio", category: "escritorios", measurement: "180cm x 70cm x 75cm" },

  { slug: "comoda-verona-4-cajones", category: "comodas", measurement: "120cm x 45cm x 85cm" },
  { slug: "comoda-oslo-minimalista", category: "comodas", measurement: "100cm x 40cm x 80cm" },
  { slug: "comoda-urban-storage", category: "comodas", measurement: "90cm x 40cm x 75cm" },
  { slug: "comoda-premium-milan", category: "comodas", measurement: "140cm x 45cm x 90cm" },
  { slug: "comoda-essential-home", category: "comodas", measurement: "80cm x 40cm x 75cm" },

  { slug: "mesa-de-centro-nordica-oslo", category: "mesas-de-centro", measurement: "100cm x 60cm x 40cm" },
  { slug: "mesa-de-centro-verona", category: "mesas-de-centro", measurement: "110cm x 60cm x 42cm" },
  { slug: "mesa-de-centro-urban", category: "mesas-de-centro", measurement: "90cm x 50cm x 40cm" },
  { slug: "mesa-de-centro-elite", category: "mesas-de-centro", measurement: "120cm x 70cm x 45cm" },
  { slug: "mesa-de-centro-dubai", category: "mesas-de-centro", measurement: "110cm x 65cm x 42cm" },

  { slug: "repisa-flotante-oslo", category: "repisas", measurement: "80cm x 20cm x 5cm" },
  { slug: "repisa-moderna-urban", category: "repisas", measurement: "100cm x 25cm x 5cm" },
  { slug: "repisa-verona-premium", category: "repisas", measurement: "120cm x 25cm x 5cm" },
  { slug: "repisa-cube-decor", category: "repisas", measurement: "90cm x 30cm x 20cm" },
  { slug: "repisa-essential-home", category: "repisas", measurement: "60cm x 20cm x 5cm" },

  { slug: "cocina-integral-milan", category: "cocinas", measurement: "300cm x 60cm x 220cm" },
  { slug: "cocina-integral-oslo", category: "cocinas", measurement: "280cm x 60cm x 220cm" },
  { slug: "cocina-premium-verona", category: "cocinas", measurement: "350cm x 60cm x 220cm" },
  { slug: "cocina-compacta-urban", category: "cocinas", measurement: "220cm x 60cm x 220cm" },
  { slug: "cocina-elite-home", category: "cocinas", measurement: "400cm x 60cm x 220cm" },
];

async function fetchAPI(endpoint, options = {}) {
  const url = `${STRAPI_URL}/api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

async function run() {
  if (!STRAPI_API_TOKEN) {
    console.error("❌ Falta STRAPI_API_TOKEN (revisa tu .env)");
    process.exit(1);
  }

  console.log("📁 Obteniendo categorías...");
  const categoriesRes = await fetchAPI("/categories?pagination[pageSize]=100");
  const categoryDocIdBySlug = {};
  for (const cat of categoriesRes.data) {
    // CLAVE: usamos documentId, no el id numérico
    categoryDocIdBySlug[cat.slug] = cat.documentId;
  }
  console.log(`   ${Object.keys(categoryDocIdBySlug).length} categorías encontradas`);

  console.log("\n📦 Obteniendo productos existentes...");
  const productsRes = await fetchAPI("/products?pagination[pageSize]=100");
  const productBySlug = {};
  for (const p of productsRes.data) {
    productBySlug[p.slug] = p;
  }
  console.log(`   ${Object.keys(productBySlug).length} productos encontrados`);

  console.log("\n🔧 Reparando productos...\n");
  let fixed = 0;
  let skipped = 0;

  for (const fix of productFixes) {
    const product = productBySlug[fix.slug];
    const categoryDocId = categoryDocIdBySlug[fix.category];

    if (!product) {
      console.log(`⚠️  No encontrado en Strapi: ${fix.slug} — se omite`);
      skipped++;
      continue;
    }
    if (!categoryDocId) {
      console.log(`⚠️  Categoría "${fix.category}" no existe — se omite ${fix.slug}`);
      skipped++;
      continue;
    }

    await fetchAPI(`/products/${product.documentId}`, {
      method: "PUT",
      body: JSON.stringify({
        data: {
          category: categoryDocId,
          measurement: fix.measurement,
        },
      }),
    });

    console.log(`✅ ${fix.slug} → categoría: ${fix.category}`);
    fixed++;
  }

  console.log("\n" + "═".repeat(50));
  console.log(`✅ Productos reparados: ${fixed}`);
  if (skipped > 0) console.log(`⚠️  Omitidos: ${skipped}`);
  console.log("\nVerifica en http://localhost:1337/admin → Content Manager → Product");
}

run().catch((error) => {
  console.error("\n❌ Error fatal:", error);
  process.exit(1);
});