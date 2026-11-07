// Fixed schema on the already-authorized validation branch. No user-supplied
// identifier or production fallback is accepted.
export const LAB_SCHEMA = 'ceb_lab_20261105';
export function laboratorySql(sql, env) {
  if (!env.CEB_DB_SCHEMA) return sql;
  if (env.CEB_RUNTIME !== 'validation' || env.CEB_DB_SCHEMA !== LAB_SCHEMA || typeof sql !== 'string') {
    throw new Error('LAB_SCHEMA_INVALID');
  }
  return sql.replace(/\bpublic\./g, LAB_SCHEMA + '.').replace(/'public'/g, "'" + LAB_SCHEMA + "'");
}
