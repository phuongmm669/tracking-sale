// import-customers.js
require('dotenv').config({ path: '.env' });

const axios = require('axios');
const fs = require('fs');
const { parse } = require('csv-parse');

const STRAPI_BASE_URL =
  process.env.STRAPI_URL || `http://127.0.0.1:${process.env.PORT || 1337}`;
const STRAPI_API = `${STRAPI_BASE_URL}/api/customers`;
const STRAPI_TOKEN = process.env.CUSTOMER_TOKEN;

async function importData() {
  const parser = fs.createReadStream('./data.csv').pipe(parse({ columns: true }));

  for await (const row of parser) {
    try {
      // row sẽ có dạng { name: 'Cô Wendy', subId: 'wenho3' }
      await axios.post(STRAPI_API, 
        { data: row }, 
        { headers: { Authorization: `Bearer ${STRAPI_TOKEN}` } }
      );
      console.log(`✅ Đã thêm: ${row.name}`);
    } catch (err) {
      console.error(`❌ Lỗi dòng ${row.name}:`, err.response?.data || err.message);
    }
  }
}

importData();