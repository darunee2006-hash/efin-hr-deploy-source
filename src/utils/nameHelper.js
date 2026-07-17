/**
 * Format employee name with nickname in parentheses
 * @param {Object} emp - Employee object
 * @param {string} lang - Language: 'th' or 'en'
 * @param {Object} options - Options: { prefix: boolean, short: boolean }
 * @returns {string} Formatted name like "ไพรวัลย์ ทองพล (วัลย์)"
 */
export function formatName(emp, lang = 'th', options = {}) {
  if (!emp) return '-';
  const { prefix = false, short = false } = options;

  let name = '';
  if (lang === 'th') {
    if (prefix && emp.prefix_th) {
      name = `${emp.prefix_th}${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim();
    } else if (short) {
      name = emp.first_name_th || '';
    } else {
      name = `${emp.first_name_th || ''} ${emp.last_name_th || ''}`.trim();
    }
  } else {
    if (short) {
      name = emp.first_name_en || emp.first_name_th || '';
    } else {
      name = `${emp.first_name_en || emp.first_name_th || ''} ${emp.last_name_en || emp.last_name_th || ''}`.trim();
    }
  }

  if (!name) return '-';

  // Append nickname in parentheses if available
  if (emp.nickname) {
    return `${name} (${emp.nickname})`;
  }
  return name;
}
