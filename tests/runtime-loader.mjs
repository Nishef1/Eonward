// Use Node's UUID implementation at the native crypto boundary; all SQL executes in real SQLite.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'expo-crypto') return nextResolve('node:crypto', context);
  try { return await nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(specifier + '.ts', context);
    }
    throw error;
  }
}
