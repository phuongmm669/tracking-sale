// import-customers.js
const axios = require('axios');
const fs = require('fs');
const { parse } = require('csv-parse');

const STRAPI_API = 'http://127.0.0.1:1337/api/customers';
const STRAPI_TOKEN = '2a2bc170f8897f2d7cd8fa660af1b4b258f911a49209ecdbe1e91ef3e6ff4e8d9367c8fc875d691a8bfecbbbcfa2bc4d3750a1ff36beeecf4edea6ba8967097c8f03edb09ca723209c592ee2adce41eb2a7acd5eaa16d34d9c27b9aa82a20fac759e0487a0ba67bcec5060c9824507d593d988c3a7542b96a1d6cf98a286f745'; // Tạo trong Settings -> API Tokens

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