import { memoizeAsync } from '../lazy/promise';
import { lazyOperation, type Operation } from './definition';

type OperationKey<TModule extends object> = {
  [TKey in keyof TModule]-?: TModule[TKey] extends Operation<any, any>
    ? TKey
    : never;
}[keyof TModule];

type ModuleOperation<TValue> = TValue extends Operation<infer TInput, infer TOutput>
  ? Operation<TInput, TOutput>
  : never;

export function lazyOperations<TModule extends object>(
  loader: () => Promise<TModule>,
) {
  const loadModule = memoizeAsync(loader);
  return <TKey extends OperationKey<TModule>>(
    key: TKey,
  ): ModuleOperation<TModule[TKey]> => lazyOperation(async () => {
    const candidate = (await loadModule())[key];
    if (!candidate || typeof (candidate as unknown as Operation).execute !== 'function')
      throw new TypeError(`Invalid lazy Operation export: ${String(key)}`);
    return candidate as ModuleOperation<TModule[TKey]>;
  }) as ModuleOperation<TModule[TKey]>;
}
