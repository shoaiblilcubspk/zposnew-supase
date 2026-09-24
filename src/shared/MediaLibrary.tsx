import { useAppStore, useProductsStore, useSettingsStore } from '../stores';
import { useMemo, useRef } from 'react';
import { Image as ImageIcon, MousePointer2, Trash2, Plus } from 'lucide-react';
import { productsService } from '../lib/services';
import { sonner } from '../lib/sonner';
import { Modal } from './ui/Modal';
import { cn } from '../lib/utils';
import { compressImage } from './imageCompression';
import { Button, EmptyState } from './ui';
import { ProductThumb } from './ui/ProductThumb';

interface MediaLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  standalone?: boolean;
}

export function MediaLibrary({ isOpen, onClose, onSelect, standalone }: MediaLibraryProps) {
  const appSettings = useSettingsStore((s: any) => s.settings);
  const appProducts = useProductsStore((s: any) => s.products);
  const appBundles = useAppStore((s: any) => s.bundles);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        sonner.loading('Compressing image...');
        const compressedFile = await compressImage(file, 800, 800, 0.7);
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target?.result as string;
          sonner.dismissAll();
          sonner.success('Image compressed successfully!');
          onSelect(base64Data);
          if (!standalone) onClose();
        };
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        console.error('Upload fail:', err);
        sonner.dismissAll();
        sonner.error('Failed to compress/upload image');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (e: React.MouseEvent, imageUrl: string) => {
    e.stopPropagation();

    // Check if it's the store logo
    if (imageUrl === appSettings?.storeLogo) {
      sonner.alert('System Asset', 'Store Logo cannot be deleted from Media Library.');
      return;
    }

    const { isConfirmed } = await sonner.confirm(
      'Delete Asset?',
      'This image will be removed from ALL products currently using it. Are you sure?'
    );

    if (isConfirmed) {
      try {
        const productsToUpdate = appProducts.filter((p: any) => p.image === imageUrl);
        const idsToUpdate = productsToUpdate.map((p: any) => p.id);

        if (idsToUpdate.length > 0) {
          // Use 'image: null' for deletion in DB update (Supabase may prefer null to undefined)
          await productsService.bulkUpdate(idsToUpdate, { image: null as any });

          const updatedProducts = appProducts.map((p: any) =>
            idsToUpdate.includes(p.id) ? { ...p, image: undefined, updatedAt: new Date() } : p
          );

          useProductsStore.getState().setProducts(updatedProducts);

          sonner.success(`Image removed from ${idsToUpdate.length} product(s).`);
        }
      } catch (error) {
        console.error('Delete image error:', error);
        sonner.alert('Error', 'Failed to delete image.');
      }
    }
  };

  // Extract ALL unique images from products (Comprehensive Gallery)
  const productAssets = useMemo(() => {
    const uniqueImages = new Map<string, any>();

    // Add store logo first
    if (appSettings?.storeLogo && (appSettings.storeLogo.startsWith('http') || appSettings.storeLogo.startsWith('data:image'))) {
      uniqueImages.set(appSettings.storeLogo, {
        id: 'logo',
        name: 'Store Logo',
        sku: 'SYSTEM',
        image: appSettings.storeLogo,
        isSystem: true
      });
    }

    appProducts
      .filter((p: any) => !!p.image && typeof p.image === 'string')
      .forEach((p: any) => {
        if (!uniqueImages.has(p.image)) {
          uniqueImages.set(p.image, {
            id: p.id,
            name: p.name,
            sku: p.sku,
            image: p.image,
            isSystem: false
          });
        }
      });

    // Scan bundles (deals) for custom banners to enable image reuse
    if (appBundles) {
      appBundles
        .filter((b: any) => !!b.image && typeof b.image === 'string')
        .forEach((b: any) => {
          if (!uniqueImages.has(b.image)) {
            uniqueImages.set(b.image, {
              id: b.id,
              name: b.name,
              sku: 'DEAL',
              image: b.image,
              isSystem: false
            });
          }
        });
    }

    return Array.from(uniqueImages.values());
  }, [appProducts, appSettings?.storeLogo, appBundles]);

  if (!isOpen) return null;

  const content = (
    <div className={cn("p-0 custom-scrollbar", standalone ? "h-full" : "")}>
      {standalone && (
        <div className="p-4 border-b border-neutral-200 dark:border-white/[0.08] bg-neutral-50 dark:bg-white/[0.02]">
          <h3 className="text-[13px] font-medium text-neutral-900 dark:text-white mb-0.5">Media Repository</h3>
          <p className="text-[12px] text-neutral-500">All product and bundle images stored in your database.</p>
        </div>
      )}

      <div className={cn("p-4", !standalone && "min-h-[400px]")}>
        {productAssets.length > 0 || !standalone ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {/* Upload New Card (only in selection modal mode) */}
            {!standalone && (
              <div
                onClick={handleUploadClick}
                className="group flex flex-col gap-1.5 cursor-pointer"
              >
                <div className="relative aspect-square bg-neutral-50 dark:bg-white/[0.02] rounded-md border border-dashed border-neutral-300 dark:border-white/[0.12] hover:border-primary flex flex-col items-center justify-center transition-colors">
                  <Plus className="h-6 w-6 text-neutral-400 group-hover:text-primary transition-colors mb-1" />
                  <span className="text-[11px] font-medium text-neutral-500 group-hover:text-primary">Upload New</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {productAssets.map((asset, index) => (
              <div
                key={`${asset.id}-${index}`}
                onClick={() => {
                  if (asset.image) onSelect(asset.image);
                  if (!standalone) onClose();
                }}
                className="group flex flex-col gap-1.5 cursor-pointer"
              >
                <div className="relative aspect-square bg-neutral-100 dark:bg-surface rounded-md overflow-hidden border border-neutral-200 dark:border-white/[0.08] hover:border-primary/50 transition-colors">
                  <ProductThumb
                    image={asset.image}
                    alt={asset.name}
                    imgClassName="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <MousePointer2 className="h-5 w-5 text-white" />
                    {!asset.isSystem && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteImage(e, asset.image);
                        }}
                        className="absolute top-2 right-2 h-7 w-7 rounded bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-colors"
                        title="Delete Image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {asset.isSystem && (
                    <div className="absolute top-1.5 left-1.5 bg-neutral-900/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                      System
                    </div>
                  )}
                </div>
                <div className="px-0.5">
                  <p className="text-[12px] font-medium text-neutral-900 dark:text-neutral-200 truncate group-hover:text-primary transition-colors">{asset.name}</p>
                  <p className="text-[11px] text-neutral-400 font-mono">{asset.sku}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ImageIcon className="h-full w-full animate-pulse opacity-30" />}
            title="Repository Empty"
            subtext="Your database is currently clean. Add products with images to see them indexed here."
            className="h-full !py-20"
          />
        )}
      </div>
    </div>
  );

  if (standalone) return content;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Media Library"
      maxWidth="xl"
    >
      {content}
    </Modal>
  );
}
