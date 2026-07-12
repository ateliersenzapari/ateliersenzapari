const knowledgeBase = require('./knowledge-base.json');

function findPreencherFields(value, path = '') {
  const results = [];
  if (typeof value === 'string') {
    if (value.includes('[PREENCHER]')) results.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => results.push(...findPreencherFields(item, `${path}[${i}]`)));
  } else if (value && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      results.push(...findPreencherFields(val, path ? `${path}.${key}` : key));
    }
  }
  return results;
}

function checkReadiness() {
  return findPreencherFields(knowledgeBase);
}

if (require.main === module) {
  const pending = checkReadiness();
  if (pending.length === 0) {
    console.log('knowledge-base.json: nenhum campo [PREENCHER] pendente. Pronto pra produção.');
  } else {
    console.log(`knowledge-base.json: ${pending.length} campo(s) ainda com [PREENCHER]:`);
    pending.forEach((p) => console.log(`  - ${p}`));
  }
}

module.exports = { findPreencherFields, checkReadiness };
