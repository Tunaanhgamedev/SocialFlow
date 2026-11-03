import { StorageProviderType } from '@socialflow/shared';
import { IStorageProvider } from './IStorageProvider.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { CloudStorageProvider } from './CloudStorageProvider.js';

export class StorageFactory {
  private static instance: IStorageProvider;

  public static getProvider(providerType?: StorageProviderType): IStorageProvider {
    if (!StorageFactory.instance) {
      const activeType =
        providerType ||
        (process.env.STORAGE_PROVIDER as StorageProviderType) ||
        StorageProviderType.LOCAL;

      if (activeType === StorageProviderType.S3 || activeType === StorageProviderType.R2) {
        StorageFactory.instance = new CloudStorageProvider({
          provider: activeType,
          bucket: process.env.STORAGE_BUCKET || 'socialflow-videos',
          endpoint: process.env.STORAGE_ENDPOINT,
          accessKeyId: process.env.STORAGE_ACCESS_KEY,
          secretAccessKey: process.env.STORAGE_SECRET_KEY,
          publicUrlPrefix: process.env.STORAGE_PUBLIC_URL
        });
      } else {
        StorageFactory.instance = new LocalStorageProvider();
      }
    }

    return StorageFactory.instance;
  }
}

export const storage = StorageFactory.getProvider();
export const getStorageProvider = StorageFactory.getProvider;
