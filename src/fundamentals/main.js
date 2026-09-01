const { sum } = require('./utils_module');

const values = [1, 2, 3, 4, 5];
const total = sum(values);

console.log(`sum([${values.join(', ')}]) = ${total}`);

module.exports = { values, total };
