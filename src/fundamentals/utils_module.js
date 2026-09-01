/**
 * CommonJS utility: sum an array of numbers.
 */
function sum(numbers) {
  if (!Array.isArray(numbers)) {
    throw new TypeError('sum() expects an array of numbers');
  }
  return numbers.reduce((total, value) => {
    const n = Number(value);
    if (Number.isNaN(n)) {
      throw new TypeError(`sum() received a non-numeric value: ${value}`);
    }
    return total + n;
  }, 0);
}

module.exports = { sum };
